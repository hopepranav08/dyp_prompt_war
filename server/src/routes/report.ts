import { randomUUID } from 'node:crypto';
import type { Part } from '@google/genai';
import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { DAY_MS, type Deps } from '../deps.js';
import { currentUser } from '../lib/auth.js';
import { haversine } from '../lib/geo.js';
import { REPORT_PROMPT, wrapUserInput } from '../prompts.js';
import { ReportAi, ReportRequest } from '../schemas.js';
import type { StoredReport } from '../services/reportStore.js';
import { computeTrust, CORROBORATION_RADIUS_M } from '../services/trust.js';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function reportRouter(deps: Deps) {
  const router = Router();

  // Anti-flooding: at most 6 reports per 10 minutes per signed-in user (or per IP for guests).
  const reportLimit = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 6,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req, res) => currentUser(res)?.uid ?? ipKeyGenerator(req.ip ?? 'unknown'),
    message: { error: 'You have sent several reports in a short time. Please wait a few minutes.' },
  });

  router.get('/reports', async (_req, res) => {
    const reports = await deps.reports.recent(deps.now().getTime() - 2 * DAY_MS);
    // Never expose who reported what.
    res.json({ reports: reports.map(({ reporterId: _reporterId, ...r }) => r) });
  });

  router.post('/report', reportLimit, async (req, res) => {
    const input = ReportRequest.parse(req.body);
    const user = currentUser(res);

    const parts: Part[] = [
      { text: `Location: ${input.location.lat.toFixed(5)}, ${input.location.lng.toFixed(5)} (Pune). Citizen text: ${wrapUserInput(input.text || '(none)')}` },
    ];
    if (input.image) parts.push({ inlineData: { mimeType: input.image.mimeType, data: input.image.data } });
    if (input.audio) parts.push({ inlineData: { mimeType: input.audio.mimeType, data: input.audio.data } });

    const now = deps.now().getTime();
    const [{ data: ai }, weather, recent, history] = await Promise.all([
      deps.ai.generateJson({ system: REPORT_PROMPT, parts, schema: ReportAi, temperature: 0.2, lang: input.lang }),
      deps.maps.weather(input.location).catch(() => null),
      deps.reports.recent(now - SIX_HOURS),
      user && !user.anonymous ? deps.reports.historyOf(user.uid).catch(() => null) : Promise.resolve(null),
    ]);

    // Moderation gate: spam, abuse and non-civic content never reach the shared map.
    if (!ai.isCivicIssue) {
      res.status(422).json({ error: `This doesn't look like a city issue we can verify. ${ai.moderationNote}` });
      return;
    }

    const nearbySimilarReports = recent.filter(
      (r) => r.category === ai.category && !(user && r.reporterId === user.uid) && haversine(r.location, input.location) < CORROBORATION_RADIUS_M,
    ).length;

    const trust = computeTrust({
      category: ai.category,
      location: input.location,
      evidenceConsistency: ai.evidenceConsistency,
      hasPhoto: Boolean(input.image),
      hasVoice: Boolean(input.audio),
      isRaining: weather ? weather.isRaining : null,
      nearbySimilarReports,
      reporter: user && !user.anonymous ? { signedIn: true, verifiedReports: history?.verified ?? 0 } : undefined,
    });

    const report: StoredReport = {
      id: randomUUID(),
      title: ai.title,
      category: ai.category,
      severity: ai.severity,
      summary: ai.summary,
      location: input.location,
      ...trust,
      actions: ai.actions,
      authority: ai.authority,
      language: ai.language,
      transcript: ai.transcript ?? undefined,
      hasPhoto: Boolean(input.image),
      hasVoice: Boolean(input.audio),
      createdAt: now,
      reporterId: user?.uid,
    };
    await deps.reports.add(report);
    const { reporterId: _reporterId, ...publicReport } = report;
    res.status(201).json({ report: publicReport });
  });

  return router;
}

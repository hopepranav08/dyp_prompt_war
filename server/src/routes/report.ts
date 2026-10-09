import { randomUUID } from 'node:crypto';
import type { Part } from '@google/genai';
import { Router } from 'express';
import { DAY_MS, type Deps } from '../deps.js';
import { haversine } from '../lib/geo.js';
import { REPORT_PROMPT, wrapUserInput } from '../prompts.js';
import { ReportAi, ReportRequest } from '../schemas.js';
import type { StoredReport } from '../services/reportStore.js';
import { computeTrust, CORROBORATION_RADIUS_M } from '../services/trust.js';

const SIX_HOURS = 6 * 60 * 60 * 1000;

export function reportRouter(deps: Deps) {
  const router = Router();

  router.get('/reports', async (_req, res) => {
    const reports = await deps.reports.recent(deps.now().getTime() - 2 * DAY_MS);
    res.json({ reports });
  });

  router.post('/report', async (req, res) => {
    const input = ReportRequest.parse(req.body);

    const parts: Part[] = [
      { text: `Location: ${input.location.lat.toFixed(5)}, ${input.location.lng.toFixed(5)} (Pune). Citizen text: ${wrapUserInput(input.text || '(none)')}` },
    ];
    if (input.image) parts.push({ inlineData: { mimeType: input.image.mimeType, data: input.image.data } });
    if (input.audio) parts.push({ inlineData: { mimeType: input.audio.mimeType, data: input.audio.data } });

    const now = deps.now().getTime();
    const [{ data: ai }, weather, recent] = await Promise.all([
      deps.ai.generateJson({ system: REPORT_PROMPT, parts, schema: ReportAi, temperature: 0.2 }),
      deps.maps.weather(input.location).catch(() => null),
      deps.reports.recent(now - SIX_HOURS),
    ]);

    const nearbySimilarReports = recent.filter(
      (r) => r.category === ai.category && haversine(r.location, input.location) < CORROBORATION_RADIUS_M,
    ).length;

    const trust = computeTrust({
      category: ai.category,
      location: input.location,
      evidenceConsistency: ai.evidenceConsistency,
      hasPhoto: Boolean(input.image),
      hasVoice: Boolean(input.audio),
      isRaining: weather ? weather.isRaining : null,
      nearbySimilarReports,
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
    };
    await deps.reports.add(report);
    res.status(201).json({ report });
  });

  return router;
}

import { Router } from 'express';
import { DAY_MS, PUNE_CENTER, type Deps } from '../deps.js';
import type { PlaceInfo } from '../lib/maps.js';
import { COMPARE_PROMPT } from '../prompts.js';
import { CompareAi, CompareRequest } from '../schemas.js';
import { areaSafety } from './explore.js';

const PRICE_SCORE: Record<string, number> = {
  PRICE_LEVEL_FREE: 100,
  PRICE_LEVEL_INEXPENSIVE: 90,
  PRICE_LEVEL_MODERATE: 65,
  PRICE_LEVEL_EXPENSIVE: 40,
  PRICE_LEVEL_VERY_EXPENSIVE: 20,
};

/** Share of known wheelchair-accessibility features (entrance, parking, restroom, seating). */
export function accessibilityScore(options: Record<string, boolean> | undefined): number | null {
  if (!options) return null;
  const values = Object.values(options);
  return values.length === 0 ? null : Math.round((values.filter(Boolean).length / values.length) * 100);
}

/** Rating scaled to 0–100 and shrunk toward the city average when there are few reviews. */
export function ratingScore(rating: number | undefined, count: number | undefined): number | null {
  if (rating === undefined) return null;
  const n = count ?? 0;
  const prior = 4.0;
  const weighted = (rating * n + prior * 20) / (n + 20);
  return Math.round((weighted / 5) * 100);
}

export function compareRouter(deps: Deps) {
  const router = Router();

  router.post('/compare', async (req, res) => {
    const input = CompareRequest.parse(req.body);
    const found = await Promise.all(input.places.map((q) => deps.maps.searchPlace(`${q}, Pune`, PUNE_CENTER, true).catch(() => null)));
    const places = found.filter((p): p is PlaceInfo => p !== null);
    if (places.length < 2) {
      res.status(404).json({ error: 'Could not find at least two of those places on Google Maps. Try more specific names.' });
      return;
    }

    const evidence = places.map((p, index) => ({
      index,
      name: p.name,
      priceLevel: p.priceLevel ?? 'unknown',
      rating: p.rating ?? null,
      reviews: (p.reviews ?? []).map((r) => r.slice(0, 400)),
    }));
    const { data: ai } = await deps.ai.generateJson({ system: COMPARE_PROMPT, parts: [{ text: JSON.stringify(evidence) }], schema: CompareAi, temperature: 0.2 });
    const reports = await deps.reports.recent(deps.now().getTime() - 2 * DAY_MS);

    const results = places.map((p, index) => {
      const a = ai.places.find((x) => x.index === index);
      const area = p.location ? areaSafety(p.location, reports) : null;
      const aiSafety = a?.safetyPerception ?? 60;
      const scores = {
        safety: Math.round(area ? (area.score + aiSafety) / 2 : aiSafety),
        cleanliness: Math.round(a?.cleanliness ?? 60),
        affordability: (p.priceLevel ? PRICE_SCORE[p.priceLevel] : undefined) ?? Math.round(a?.affordabilityEstimate ?? 60),
        rating: ratingScore(p.rating, p.ratingCount) ?? 60,
        accessibility: accessibilityScore(p.accessibility) ?? 40,
      };
      const overall = Math.round(Object.values(scores).reduce((s, v) => s + v, 0) / 5);
      return {
        place: { id: p.id, name: p.name, address: p.address, location: p.location, rating: p.rating, ratingCount: p.ratingCount, mapsUri: p.mapsUri },
        scores,
        overall,
        evidence: { cleanliness: a?.cleanlinessEvidence ?? '', safety: a?.safetyEvidence ?? '', area },
        verdict: a?.verdict ?? '',
      };
    });

    const ranked = [...results].sort((x, y) => y.overall - x.overall);
    res.json({ results, bestId: ranked[0]?.place.id, worstId: ranked.at(-1)?.place.id, summary: ai.summary });
  });

  return router;
}

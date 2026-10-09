import { Router } from 'express';
import { BLACKSPOTS } from '../data/blackspots.js';
import { DAY_MS, PUNE_CENTER, type Deps } from '../deps.js';
import { haversine, type LatLng } from '../lib/geo.js';
import type { PlaceInfo } from '../lib/maps.js';
import { EXPLORE_PROMPT, HERITAGE_PROMPT, wrapUserInput } from '../prompts.js';
import { ExploreAi, ExploreRequest } from '../schemas.js';
import type { StoredReport } from '../services/reportStore.js';

const NEARBY_M = 500;

/** Area safety around a place from official black spots + live verified reports. */
export function areaSafety(at: LatLng, reports: readonly StoredReport[]) {
  const spots = BLACKSPOTS.filter((s) => haversine(s, at) < NEARBY_M);
  const live = reports.filter((r) => r.status !== 'unverified' && haversine(r.location, at) < NEARBY_M);
  const score = Math.max(0, 100 - spots.reduce((s, b) => s + b.severity * 8, 0) - live.reduce((s, r) => s + r.severity * 4, 0));
  return { score, blackspots: spots.map((s) => s.name), liveReports: live.length };
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function exploreRouter(deps: Deps) {
  const router = Router();

  router.post('/explore', async (req, res) => {
    const input = ExploreRequest.parse(req.body);
    const at = input.location ?? PUNE_CENTER;

    const { data, sources } = await deps.ai.generateJson({
      system: input.mode === 'heritage' ? HERITAGE_PROMPT : EXPLORE_PROMPT,
      parts: [{ text: `User location: ${at.lat.toFixed(4)}, ${at.lng.toFixed(4)} (Pune).\nRequest: ${wrapUserInput(input.query)}` }],
      schema: ExploreAi,
      tools: input.mode === 'heritage' ? ['maps', 'search'] : ['maps'],
      latLng: at,
    });

    const reports = await deps.reports.recent(deps.now().getTime() - 2 * DAY_MS);

    // Verify every AI-suggested place against Google Places so the map only shows real, located places.
    const places = await Promise.all(
      data.places.map(async (p) => {
        const grounded = sources.find((s) => s.placeId && (normalize(s.title).includes(normalize(p.name)) || normalize(p.name).includes(normalize(s.title))));
        let info: PlaceInfo | null = null;
        try {
          info = grounded?.placeId ? await deps.maps.getPlace(grounded.placeId) : await deps.maps.searchPlace(`${p.name}, Pune`, at);
        } catch {
          info = null;
        }
        return {
          ...p,
          verified: Boolean(info?.location),
          place: info,
          area: info?.location ? areaSafety(info.location, reports) : null,
        };
      }),
    );

    res.json({ summary: data.summary, tips: data.tips, heritage: data.heritage, places, sources });
  });

  return router;
}

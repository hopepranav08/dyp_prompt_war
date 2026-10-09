import { Router } from 'express';
import { DAY_MS, istHour, PUNE_CENTER, type Deps } from '../deps.js';
import { ROUTE_PROMPT } from '../prompts.js';
import { RouteAi, RouteRequest } from '../schemas.js';
import { rankRoutes } from '../services/risk.js';

export function routeRouter(deps: Deps) {
  const router = Router();

  router.post('/route', async (req, res) => {
    const input = RouteRequest.parse(req.body);
    const candidates = await deps.maps.computeRoutes(input.origin, input.destination, input.mode);
    if (candidates.length === 0) {
      res.status(404).json({ error: 'No route found between these places. Try adding the area name, e.g. "FC Road, Pune".' });
      return;
    }

    const start = candidates[0]?.path[0] ?? PUNE_CENTER;
    const [weather, reports] = await Promise.all([
      deps.maps.weather(start).catch(() => null),
      deps.reports.recent(deps.now().getTime() - DAY_MS),
    ]);
    const hour = input.hour ?? istHour(deps.now());
    const routes = rankRoutes(candidates, { hour, isRaining: weather?.isRaining ?? false, reports });

    const summary = routes.map((r) => ({
      id: r.id,
      via: r.description,
      minutes: Math.round(r.durationSec / 60),
      km: Math.round(r.distanceM / 100) / 10,
      safetyScore: r.safetyScore,
      tags: r.tags,
      factors: r.factors.map((f) => f.label),
    }));

    // The explanation is a bonus: the deterministic scores are still returned if Gemini is unavailable.
    const explanation = await deps.ai
      .generateJson({
        system: ROUTE_PROMPT,
        parts: [{ text: JSON.stringify({ hourIST: hour, weather: weather?.condition ?? 'unknown', mode: input.mode, routes: summary }) }],
        schema: RouteAi,
        temperature: 0.3,
      })
      .then((r) => r.data)
      .catch(() => null);

    res.json({ hour, weather, routes, explanation });
  });

  return router;
}

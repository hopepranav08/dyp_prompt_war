import { Router } from 'express';
import { BLACKSPOTS } from '../data/blackspots.js';
import { DAY_MS, istHour, PUNE_CENTER, type Deps } from '../deps.js';
import { TtlCache } from '../lib/cache.js';
import type { HourForecast, PlaceInfo } from '../lib/maps.js';
import { PLAN_PROMPT, wrapUserInput } from '../prompts.js';
import { PlanAi, PlanRequest } from '../schemas.js';
import { meterFare } from '../services/fare.js';
import { scoreRoute } from '../services/risk.js';
import { areaSafety } from './explore.js';
import { photoFor, publicPlace } from './photos.js';

const WALKABLE_M = 700;

const hourOf = (hhmm: string, fallback: number) => {
  const h = Number.parseInt(hhmm.split(':')[0] ?? '', 10);
  return Number.isFinite(h) && h >= 0 && h < 24 ? h : fallback;
};

/**
 * "Plan my day": Gemini (Maps-grounded) drafts an itinerary that respects time, budget and the
 * hourly rain forecast; every stop is then verified on Places and every leg gets a real route,
 * a deterministic safety score and an RTO-tariff auto fare.
 */
export function planRouter(deps: Deps) {
  const router = Router();
  const cache = new TtlCache<unknown>(20 * 60 * 1000, 100);

  router.post('/plan', async (req, res) => {
    const input = PlanRequest.parse(req.body);
    const at = input.location ?? PUNE_CENTER;
    const startHour = input.startHour ?? Math.min(22, istHour(deps.now()) + 1);
    const key = JSON.stringify({ ...input, startHour, at: [at.lat.toFixed(2), at.lng.toFixed(2)] });

    const result = await cache.getOrLoad(key, async () => {
      const forecast: HourForecast[] = await deps.maps.forecastHours(at, Math.min(24, input.hours + 2)).catch(() => []);
      const context = {
        startHourIST: startHour,
        durationHours: input.hours,
        budgetPerPersonINR: input.budget ?? 'not specified',
        hourlyForecast: forecast.map((f) => ({ hour: f.hour, rainChancePct: f.rainChance, condition: f.condition })),
        accidentBlackSpotsToAvoid: BLACKSPOTS.filter((b) => b.severity >= 2).map((b) => b.name),
      };
      const { data, sources } = await deps.ai.generateJson({
        system: PLAN_PROMPT,
        parts: [{ text: `Context: ${JSON.stringify(context)}\nTraveller request: ${wrapUserInput(input.prompt)}` }],
        schema: PlanAi,
        tools: ['maps'],
        latLng: at,
        lang: input.lang,
        temperature: 0.5,
      });

      const reports = await deps.reports.recent(deps.now().getTime() - DAY_MS);
      const places: Array<PlaceInfo | null> = await Promise.all(
        data.stops.map(async (s) => {
          const grounded = sources.find((src) => src.placeId && src.title.toLowerCase().includes(s.name.toLowerCase().slice(0, 12)));
          return (grounded?.placeId ? deps.maps.getPlace(grounded.placeId) : deps.maps.searchPlace(`${s.name}, Pune`, at)).catch(() => null);
        }),
      );
      const photos = await Promise.all(places.map((p) => photoFor(deps.maps, p)));

      const stops = data.stops.map((s, i) => {
        const place = places[i];
        return { ...s, verified: Boolean(place?.location), place: publicPlace(place), photoUri: photos[i], area: place?.location ? areaSafety(place.location, reports) : null };
      });

      const legs = await Promise.all(
        stops.slice(1).map(async (to, i) => {
          const from = stops[i]!;
          if (!from.place?.id || !to.place?.id) return null;
          const route = await deps.maps
            .computeRoutes({ placeId: from.place.id }, { placeId: to.place.id }, 'DRIVE', false)
            .then((r) => r[0])
            .catch(() => undefined);
          if (!route) return null;
          const hour = hourOf(to.startTime, startHour);
          // Short hops are a pleasant walk in the old city; nobody should pay an auto minimum for 300 m.
          const walk = route.distanceM < WALKABLE_M;
          const scored = scoreRoute(route, { hour, isRaining: (forecast.find((f) => f.hour === hour)?.rainChance ?? 0) >= 50, reports });
          return {
            fromIndex: i,
            toIndex: i + 1,
            km: Math.round(route.distanceM / 100) / 10,
            minutes: Math.round(route.durationSec / 60),
            walk,
            autoFare: walk ? 0 : meterFare(route.distanceM, hour).total,
            safetyScore: scored.safetyScore,
            factors: scored.factors.map((f) => f.label),
            path: route.path,
          };
        }),
      );

      const activities = Math.round(stops.reduce((sum, s) => sum + s.costPerPerson, 0));
      const transport = legs.reduce((sum, l) => sum + (l?.autoFare ?? 0), 0);
      return {
        title: data.title,
        summary: data.summary,
        startHour,
        stops,
        legs: legs.filter((l): l is NonNullable<typeof l> => l !== null),
        totals: { activities, transport, total: activities + transport, budget: input.budget ?? null },
        forecast,
        foodToTry: data.foodToTry,
        tips: data.tips,
      };
    });

    res.json(result);
  });

  return router;
}

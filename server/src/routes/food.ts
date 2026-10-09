import { Router } from 'express';
import { DAY_MS, PUNE_CENTER, type Deps } from '../deps.js';
import { TtlCache } from '../lib/cache.js';
import { haversine } from '../lib/geo.js';
import { LangSchema } from '../lang.js';
import { FOOD_ALERTS_PROMPT, FOOD_SAFETY_PROMPT, wrapUserInput } from '../prompts.js';
import { FoodAlertsAi, FoodAi, FoodSafetyRequest } from '../schemas.js';
import { photoFor, publicPlace } from './photos.js';

export const FDA_HELPLINE = '1800-222-365';

/**
 * Food Safety Radar: recent Maharashtra FDA enforcement in Pune (Search-grounded), a per-eatery check
 * that combines cited FDA findings with hygiene signals from real Google reviews, and community
 * food-safety reports from the same spot.
 */
export function foodRouter(deps: Deps) {
  const router = Router();
  const alertsCache = new TtlCache<unknown>(3 * 60 * 60 * 1000, 5);
  const checkCache = new TtlCache<unknown>(60 * 60 * 1000, 200);

  router.get('/food/alerts', async (req, res) => {
    const lang = LangSchema.parse(req.query.lang);
    const data = await alertsCache.getOrLoad(`alerts:${lang}`, async () => {
      const { data: ai, sources } = await deps.ai.generateJson({
        system: FOOD_ALERTS_PROMPT,
        parts: [{ text: `Today is ${deps.now().toDateString()}. Region: Pune division, Maharashtra.` }],
        schema: FoodAlertsAi,
        tools: ['search'],
        lang,
      });
      return { ...ai, sources: sources.slice(0, 6), helpline: FDA_HELPLINE };
    });
    res.json(data);
  });

  router.post('/food/check', async (req, res) => {
    const input = FoodSafetyRequest.parse(req.body);
    const key = JSON.stringify([input.name.toLowerCase(), input.lang]);
    const data = await checkCache.getOrLoad(key, async () => {
      const place = await deps.maps.searchPlace(`${input.name}, Pune`, PUNE_CENTER, true).catch(() => null);
      const [{ data: ai, sources }, photoUri, reports] = await Promise.all([
        deps.ai.generateJson({
          system: FOOD_SAFETY_PROMPT,
          parts: [
            {
              text: `Eatery: ${wrapUserInput(place?.name ?? input.name)}\nAddress: ${place?.address ?? 'Pune'}\nGoogle rating: ${place?.rating ?? 'unknown'} (${place?.ratingCount ?? 0} reviews)\nRecent reviews: ${JSON.stringify((place?.reviews ?? []).map((r) => r.slice(0, 350)))}`,
            },
          ],
          schema: FoodAi,
          tools: ['search'],
          temperature: 0.2,
          lang: input.lang,
        }),
        photoFor(deps.maps, place),
        deps.reports.recent(deps.now().getTime() - 30 * DAY_MS),
      ]);
      const communityReports = place?.location ? reports.filter((r) => r.category === 'food_safety' && haversine(r.location, place.location!) < 150).length : 0;
      return { place: publicPlace(place), photoUri, ...ai, communityReports, sources: sources.slice(0, 6), helpline: FDA_HELPLINE };
    });
    res.json(data);
  });

  return router;
}

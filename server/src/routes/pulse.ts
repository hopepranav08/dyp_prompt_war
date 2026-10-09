import { Router } from 'express';
import { z } from 'zod';
import { BLACKSPOTS, BLACKSPOT_SOURCES } from '../data/blackspots.js';
import { PUNE_CENTER, type Deps } from '../deps.js';
import { TtlCache } from '../lib/cache.js';
import type { AirQuality, Weather } from '../lib/maps.js';
import { PULSE_PROMPT } from '../prompts.js';
import { PulseAi } from '../schemas.js';

const PulseQuery = z.object({
  lat: z.coerce.number().min(-90).max(90).default(PUNE_CENTER.lat),
  lng: z.coerce.number().min(-180).max(180).default(PUNE_CENTER.lng),
});

export function pulseRouter(deps: Deps) {
  const router = Router();
  const envCache = new TtlCache<{ weather: Weather | null; air: AirQuality | null }>(10 * 60 * 1000);
  const briefingCache = new TtlCache<z.infer<typeof PulseAi> | null>(20 * 60 * 1000, 5);

  router.get('/config', (_req, res) => {
    res.json({ mapsKey: deps.browserMapsKey, center: PUNE_CENTER });
  });

  router.get('/blackspots', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600').json({ blackspots: BLACKSPOTS, sources: BLACKSPOT_SOURCES });
  });

  router.get('/pulse', async (req, res) => {
    const q = PulseQuery.parse(req.query);
    const at = { lat: q.lat, lng: q.lng };
    const key = `${at.lat.toFixed(2)},${at.lng.toFixed(2)}`;

    const [env, briefing] = await Promise.all([
      envCache.getOrLoad(key, async () => {
        const [weather, air] = await Promise.all([deps.maps.weather(at).catch(() => null), deps.maps.airQuality(at).catch(() => null)]);
        return { weather, air };
      }),
      briefingCache.getOrLoad('pune', () =>
        deps.ai
          .generateJson({ system: PULSE_PROMPT, parts: [{ text: `Today is ${deps.now().toDateString()}. City: Pune, India.` }], schema: PulseAi, tools: ['search'] })
          .then((r) => r.data)
          .catch(() => null),
      ),
    ]);

    res.json({ ...env, briefing });
  });

  return router;
}

import { Router } from 'express';
import { istHour, istWeekday, PUNE_CENTER, type Deps } from '../deps.js';
import { TtlCache } from '../lib/cache.js';
import { CROWD_PROMPT } from '../prompts.js';
import { BestTimeRequest, CrowdAi } from '../schemas.js';
import { isOpenAt, scoreSlots, type SlotInput } from '../services/bestTime.js';

const SLOT_STEP_H = 2;
const SLOTS = 6;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function bestTimeRouter(deps: Deps) {
  const router = Router();
  const cache = new TtlCache<unknown>(30 * 60 * 1000, 200);

  router.post('/besttime', async (req, res) => {
    const input = BestTimeRequest.parse(req.body);
    const origin = input.origin ?? PUNE_CENTER;
    const now = deps.now();
    const startHour = istHour(now);
    const key = JSON.stringify([input.placeId, origin.lat.toFixed(2), origin.lng.toFixed(2), startHour, input.lang]);

    const result = await cache.getOrLoad(key, async () => {
      const place = await deps.maps.getPlace(input.placeId, true);
      if (!place?.location) return null;
      const weekday = istWeekday(now);

      // Google's predicted traffic for each departure slot (future departure times).
      const departures = Array.from({ length: SLOTS }, (_, i) => new Date(now.getTime() + (i * SLOT_STEP_H * 60 + 10) * 60_000));
      const [travel, forecast, crowd] = await Promise.all([
        Promise.all(
          departures.map((d) =>
            deps.maps
              .computeRoutes(origin, { placeId: input.placeId }, 'DRIVE', false, d)
              .then((r) => (r[0] ? Math.round(r[0].durationSec / 60) : null))
              .catch(() => null),
          ),
        ),
        deps.maps.forecastHours(place.location, SLOTS * SLOT_STEP_H + 1).catch(() => []),
        deps.ai
          .generateJson({
            system: CROWD_PROMPT,
            parts: [{ text: JSON.stringify({ place: place.name, type: place.primaryType ?? 'unknown', weekday: WEEKDAYS[weekday], reviews: (place.reviews ?? []).map((r) => r.slice(0, 300)) }) }],
            schema: CrowdAi,
            temperature: 0.2,
            lang: input.lang,
          })
          .then((r) => r.data)
          .catch(() => null),
      ]);

      const slots: SlotInput[] = departures.map((_, i) => {
        const hour = (startHour + i * SLOT_STEP_H) % 24;
        const day = (weekday + Math.floor((startHour + i * SLOT_STEP_H) / 24)) % 7;
        return {
          hour,
          travelMin: travel[i] ?? null,
          crowd: crowd?.crowdByHour.find((c) => c.hour === hour)?.level ?? 50,
          rainChance: forecast.find((f) => f.hour === hour)?.rainChance ?? 0,
          open: isOpenAt(place.periods, day, hour),
        };
      });

      return {
        place: { id: place.id, name: place.name },
        slots: scoreSlots(slots),
        crowd: crowd ? { peakNote: crowd.peakNote, quietNote: crowd.quietNote, evidence: crowd.evidence } : null,
        model: 'score = 0.35·travel (Routes predicted traffic) + 0.40·(1 − crowd from reviews) + 0.25·(1 − rain chance); 0 when closed',
      };
    });

    if (!result) {
      res.status(404).json({ error: 'Could not find that place on Google Maps.' });
      return;
    }
    res.json(result);
  });

  return router;
}

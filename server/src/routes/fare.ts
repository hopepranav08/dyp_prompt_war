import { Router } from 'express';
import { istHour, type Deps } from '../deps.js';
import { FareRequest } from '../schemas.js';
import { AUTO_TARIFF, checkFare } from '../services/fare.js';

/** Fair-fare checker: real road distance from the Routes API + the official RTO tariff. */
export function fareRouter(deps: Deps) {
  const router = Router();

  router.post('/fare', async (req, res) => {
    const input = FareRequest.parse(req.body);
    const [route] = await deps.maps.computeRoutes(input.origin, input.destination, 'DRIVE', false);
    if (!route) {
      res.status(404).json({ error: 'Could not find a road route between those places. Add the area name, e.g. "Deccan, Pune".' });
      return;
    }
    const hour = input.hour ?? istHour(deps.now());
    res.json({
      hour,
      fare: checkFare(route.distanceM, hour, input.luggage, input.quoted),
      route: { distanceM: route.distanceM, durationSec: route.durationSec, description: route.description, path: route.path },
      tariff: AUTO_TARIFF,
    });
  });

  return router;
}

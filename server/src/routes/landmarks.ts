import { Router } from 'express';
import { PUNE_CENTER, type Deps } from '../deps.js';
import { TtlCache } from '../lib/cache.js';
import { photoFor } from './photos.js';

/** Curated icons of Pune, each resolved live on Google Places (photo, rating, location). */
export const LANDMARKS = [
  { query: 'Shaniwar Wada', deva: 'शनिवारवाडा', tag: 'Peshwa heritage' },
  { query: 'Aga Khan Palace', deva: 'आगाखान पॅलेस', tag: 'Freedom struggle' },
  { query: 'Sinhagad Fort', deva: 'सिंहगड', tag: 'Forts & treks' },
  { query: 'Shrimant Dagdusheth Halwai Ganpati Mandir', deva: 'दगडूशेठ गणपती', tag: 'Faith' },
  { query: 'Pataleshwar Cave Temple', deva: 'पाताळेश्वर', tag: '8th-century caves' },
  { query: 'Parvati Hill Temple', deva: 'पर्वती', tag: 'Sunset viewpoint' },
  { query: 'Raja Dinkar Kelkar Museum', deva: 'केळकर संग्रहालय', tag: 'Museum' },
  { query: 'Pu La Deshpande Udyan Pune Okayama Friendship Garden', deva: 'पु. ल. देशपांडे उद्यान', tag: 'Gardens' },
  { query: 'Tulshibaug Market', deva: 'तुळशीबाग', tag: 'Street shopping' },
  { query: 'Lal Mahal', deva: 'लाल महाल', tag: 'Shivaji Maharaj' },
] as const;

export function landmarksRouter(deps: Deps) {
  const router = Router();
  const cache = new TtlCache<unknown[]>(6 * 60 * 60 * 1000, 2);

  const load = () =>
    cache.getOrLoad('all', async () => {
      const items = await Promise.all(
        LANDMARKS.map(async (l) => {
          const place = await deps.maps.searchPlace(`${l.query}, Pune`, PUNE_CENTER).catch(() => null);
          if (!place) return null;
          return {
            id: place.id,
            name: place.name,
            deva: l.deva,
            tag: l.tag,
            rating: place.rating,
            ratingCount: place.ratingCount,
            mapsUri: place.mapsUri,
            location: place.location,
            photoUri: await photoFor(deps.maps, place, 1200),
            attribution: place.photoAttribution,
          };
        }),
      );
      return items.filter((x) => x !== null);
    });

  router.get('/landmarks', async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=1800').json({ landmarks: await load() });
  });

  return Object.assign(router, { warm: () => load().catch(() => undefined) });
}

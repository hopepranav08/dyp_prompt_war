import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { istDate, PUNE_CENTER, type Deps } from '../deps.js';
import { currentUser } from '../lib/auth.js';
import { TtlCache } from '../lib/cache.js';
import { LangSchema } from '../lang.js';
import { EVENT_MODERATION_PROMPT, EVENTS_PROMPT, wrapUserInput } from '../prompts.js';
import { EventCreateRequest, EventsAi, ModerationAi } from '../schemas.js';
import type { CityEvent } from '../services/eventStore.js';

/** Community board: Search-grounded "this fortnight in Pune" plus moderated events organised by signed-in users. */
export function eventsRouter(deps: Deps) {
  const router = Router();
  const webCache = new TtlCache<CityEvent[]>(3 * 60 * 60 * 1000, 5);

  const createLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req, res) => currentUser(res)?.uid ?? ipKeyGenerator(req.ip ?? 'unknown'),
    message: { error: 'You can organise up to 5 events per hour.' },
  });

  const webEvents = (lang: string) =>
    webCache.getOrLoad(`web:${lang}`, async () => {
      const { data } = await deps.ai.generateJson({
        system: EVENTS_PROMPT,
        parts: [{ text: `Today is ${istDate(deps.now())} (IST). City: Pune, India.` }],
        schema: EventsAi,
        tools: ['search'],
        lang: LangSchema.parse(lang),
      });
      const today = istDate(deps.now());
      const upcoming = data.events.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date >= today);
      return Promise.all(
        upcoming.map(async (e): Promise<CityEvent> => {
          const place = await deps.maps.searchPlace(`${e.venue}, ${e.area}, Pune`, PUNE_CENTER).catch(() => null);
          return { ...e, id: randomUUID(), url: e.url || undefined, location: place?.location, source: 'web', createdAt: deps.now().getTime() };
        }),
      );
    });

  router.get('/events', async (req, res) => {
    const lang = typeof req.query.lang === 'string' ? req.query.lang : 'en';
    const [web, community] = await Promise.all([webEvents(lang).catch(() => []), deps.events.upcoming(istDate(deps.now()))]);
    const events = [...community.map(({ organizerId: _o, ...e }) => e), ...web].sort((a, b) => a.date.localeCompare(b.date));
    res.json({ events });
  });

  router.post('/events', createLimit, async (req, res) => {
    const user = currentUser(res);
    if (!user) {
      res.status(401).json({ error: 'Please sign in (or continue as guest) to organise an event.' });
      return;
    }
    const input = EventCreateRequest.parse(req.body);
    if (input.date < istDate(deps.now())) {
      res.status(400).json({ error: 'The event date is in the past.' });
      return;
    }
    const { data: mod } = await deps.ai.generateJson({
      system: EVENT_MODERATION_PROMPT,
      parts: [{ text: wrapUserInput(JSON.stringify({ title: input.title, venue: input.venue, description: input.description })) }],
      schema: ModerationAi,
      temperature: 0,
    });
    if (!mod.ok) {
      res.status(422).json({ error: `This event can't be published: ${mod.note}` });
      return;
    }
    const place = await deps.maps.searchPlace(`${input.venue}, Pune`, PUNE_CENTER).catch(() => null);
    const event: CityEvent = {
      id: randomUUID(),
      title: input.title,
      date: input.date,
      time: input.time,
      venue: place?.name ?? input.venue,
      area: place?.address?.split(',').slice(-4, -3)[0]?.trim() ?? 'Pune',
      category: input.category,
      description: input.description,
      location: place?.location,
      source: 'community',
      organizerId: user.uid,
      createdAt: deps.now().getTime(),
    };
    await deps.events.add(event);
    const { organizerId: _o, ...publicEvent } = event;
    res.status(201).json({ event: publicEvent });
  });

  return router;
}

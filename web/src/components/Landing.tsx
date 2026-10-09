import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarHeart, Camera, Check, CloudRain, Compass, IndianRupee, Landmark as LandmarkIcon, Megaphone, Minus, Radio, Route, Scale, ShieldCheck, Star, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import type { Landmark } from '../lib/types';
import { LangSwitcher, ThemeToggle } from './Controls';
import { ScoreBadge } from './ui';

/** Devanagari graphemes, split by hand so conjuncts like त्री never break apart. */
const WORDMARK = ['स', 'ह', 'या', 'त्री'];

const SERVICES = ['Gemini on Vertex AI', 'Grounding with Google Maps', 'Grounding with Google Search', 'Places API', 'Place Photos', 'Routes API', 'Weather API', 'Air Quality API', 'Maps JavaScript API', 'Identity Platform', 'Firestore', 'Secret Manager', 'Cloud Run', 'Cloud Build'];

const STATS = [
  { value: '290', label: 'road deaths in Pune in 2025' },
  { value: '20', label: 'official accident black spots' },
  { value: '1.3L', label: 'autos, but only 540 official stands' },
  { value: '3,500+', label: 'potholes needing repair (PMC)' },
];

const COMPARISON: Array<[string, boolean, boolean]> = [
  ['Fastest route with live traffic', true, true],
  ['Routes scored against official accident black spots', false, true],
  ['Night-time and live-rain risk on every route', false, true],
  ['Citizen reports verified with a transparent trust score', false, true],
  ['Fair auto fare by the Pune RTO tariff + what to say', false, true],
  ['Whole-day plans that fit budget, rain forecast and safety', false, true],
  ['Voice reports in मराठी and हिंदी', false, true],
  ['Best vs worst with quotes from real reviews', false, true],
];

const FEATURES = [
  { Icon: Compass, deva: 'खोज', title: 'Explore', body: 'Misal, stays, cafés and budget spots, grounded in Google Maps and verified on Places with a live area-safety score.', tone: 'panel' },
  { Icon: CalendarHeart, deva: 'दिवस', title: 'Plan my day', body: 'Time, budget, parents in tow, rain at 3 PM? Get a full day with verified stops, safe legs and auto fares that add up.', tone: 'bg-sun' },
  { Icon: Route, deva: 'सुरक्षित मार्ग', title: 'Safe Route', body: 'Alternatives scored against Pune Police black spots, verified reports, night-time risk and live rain. Code decides; Gemini explains.', tone: 'card-dark' },
  { Icon: IndianRupee, deva: 'योग्य भाडे', title: 'Fair Fare', body: 'Real road distance × the Pune RTO tariff (₹30 + ₹20/km, +25% after midnight). Know before you argue.', tone: 'panel' },
  { Icon: Megaphone, deva: 'तक्रार', title: 'Report & verify', body: 'A voice note in Marathi, a photo or a line of text becomes a structured incident with a transparent trust score.', tone: 'card-dark' },
  { Icon: Scale, deva: 'तुलना', title: 'Best vs worst', body: 'Safety, cleanliness, affordability, rating and accessibility side by side, with quotes from real reviews.', tone: 'hatch' },
  { Icon: LandmarkIcon, deva: 'वारसा', title: 'Heritage stories', body: 'Peshwa wadas, forts and festivals told as stories, grounded in Maps and Search so the history stays honest.', tone: 'panel' },
  { Icon: Radio, deva: 'नाडी', title: 'City pulse', body: 'Live weather, air quality and a Search-grounded morning briefing on diversions, festivals and alerts.', tone: 'bg-sun' },
] as const;

const LADDER = [
  { status: 'Unverified', score: '< 45', copy: 'A single claim. Shown, but it never changes a route on its own.', cls: 'bg-surface' },
  { status: 'Corroborated', score: '45–69', copy: 'Evidence or independent reports agree. It starts to count in safety scoring.', cls: 'bg-sun text-[#1f1f1f]' },
  { status: 'Verified', score: '70+', copy: 'Multiple signals line up. Treated as a real hazard across the city map.', cls: 'card-dark' },
];

const SIGNALS = ['+15 photo evidence', '±20 Gemini evidence check', '+15 live rain confirms flooding', '−10 weather contradicts', '+12 per nearby report', '+10 near official black spot', '+5–20 reporter reputation'];

function useLandmarks() {
  const [items, setItems] = useState<Landmark[] | null>(null);
  useEffect(() => {
    api.landmarks().then((r) => setItems(r.landmarks)).catch(() => setItems([]));
  }, []);
  return items;
}

function Gallery() {
  const { t } = usePrefs();
  const items = useLandmarks();
  return (
    <section id="gallery" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-20 md:px-8" aria-labelledby="gallery-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{t('land.galleryKicker')}</p>
          <h2 id="gallery-title" className="mt-3 max-w-2xl text-4xl font-light text-balance md:text-6xl">
            {t('land.galleryTitle')}
          </h2>
        </div>
        <p className="max-w-sm text-sm text-muted">{t('land.gallerySub')}</p>
      </div>

      <ul className="mt-10 grid auto-rows-[190px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-4">
        {(items ?? Array.from({ length: 8 }, () => null)).slice(0, 10).map((l, i) => {
          const span = i === 0 ? 'col-span-2 row-span-2' : i === 5 ? 'md:col-span-2' : '';
          if (!l) return <li key={i} className={`${span} animate-pulse rounded-[28px] bg-surface/50`} aria-hidden />;
          return (
            <motion.li
              key={l.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: (i % 4) * 0.06 }}
              className={`group relative overflow-hidden rounded-[28px] bg-charcoal shadow-lift ${span}`}
            >
              <a href={`/app?tab=explore&mode=heritage&q=${encodeURIComponent(`${l.name}: history, what to see and food nearby`)}`} className="block h-full" aria-label={`${l.name}: explore in the co-pilot`}>
                {l.photoUri && (
                  <img src={l.photoUri} alt="" loading={i < 3 ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110" />
                )}
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" aria-hidden />
                <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#1f1f1f]">{l.tag}</span>
                {l.rating && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] text-white">
                    <Star className="size-3 fill-sun text-sun" aria-hidden /> {l.rating}
                  </span>
                )}
                <span className="absolute inset-x-4 bottom-5 text-white">
                  <span lang="mr" className={`block font-deva leading-none text-sun ${i === 0 ? 'text-5xl md:text-7xl' : 'text-2xl md:text-3xl'}`}>
                    {l.deva}
                  </span>
                  <span className={`mt-1 block font-light ${i === 0 ? 'text-xl' : 'text-sm'}`}>{l.name}</span>
                </span>
                {l.attribution && <span className="absolute right-3 bottom-1.5 max-w-[60%] truncate text-[9px] text-white/60">📷 {l.attribution}</span>}
              </a>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

export function Landing() {
  const { t } = usePrefs();
  return (
    <>
      <a href="#content" className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Skip to content
      </a>

      {/* ---------- Nav ---------- */}
      <header className="sticky top-0 z-40 px-3 pt-3 md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 rounded-full border border-ink/5 bg-surface/75 p-1.5 pl-2 shadow-soft backdrop-blur-xl">
          <a href="/" className="flex items-center gap-2" aria-label="Sahayatri home">
            <span className="grid size-10 place-items-center rounded-full bg-charcoal font-deva text-xl text-sun" aria-hidden>
              स
            </span>
            <span className="hidden text-lg font-medium tracking-tight sm:inline">Sahayatri</span>
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {(
              [
                ['#gallery', 'nav.gallery'],
                ['#features', 'nav.features'],
                ['#verify', 'nav.verify'],
              ] as const
            ).map(([href, key]) => (
              <a key={href} href={href} className="rounded-full px-4 py-2 text-sm font-medium hover:bg-ink/5">
                {t(key)}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <LangSwitcher />
            <ThemeToggle />
            <a href="/app" className="btn btn-primary py-2.5">
              <span className="hidden sm:inline">{t('nav.open')}</span>
              <ArrowUpRight className="size-4" aria-hidden />
              <span className="sr-only sm:hidden">{t('nav.open')}</span>
            </a>
          </div>
        </div>
      </header>

      <main id="content">
        {/* ---------- Hero ---------- */}
        <section className="relative mx-auto max-w-7xl px-4 pt-10 md:px-8 md:pt-14" aria-labelledby="hero-title">
          <div className="flex justify-center">
            <p className="kicker relative z-10 bg-surface/70 backdrop-blur">
              <span className="size-2 rounded-full bg-sun" aria-hidden /> {t('land.kicker')}
            </p>
          </div>

          <div className="relative mt-12 flex justify-center md:mt-10">
            <div aria-hidden className="sun-disc absolute top-1/2 left-1/2 size-[42vw] max-h-[440px] max-w-[440px] -translate-x-1/2 -translate-y-[55%] rounded-full md:size-[50vw]" />
            <h1 id="hero-title" className="relative text-center">
              <span className="sr-only">Sahayatri (सहयात्री), your verified co-pilot for Pune</span>
              <span aria-hidden lang="mr" className="relative block font-deva leading-[1.05] text-[clamp(4.25rem,18vw,14.5rem)]">
                <span className="pointer-events-none absolute inset-0 translate-x-[0.05em] translate-y-[0.05em] text-transparent opacity-40 [-webkit-text-stroke:2px_var(--color-ink)]">
                  सहयात्री
                </span>
                {WORDMARK.map((g, i) => (
                  <span key={g} className="wordmark animate-rise relative inline-block" style={{ animationDelay: `${0.15 + i * 0.1}s`, ['--r' as string]: `${i % 2 ? 8 : -8}deg` }}>
                    {g}
                  </span>
                ))}
              </span>
            </h1>
          </div>

          <div className="relative mt-4 text-center">
            <p style={{ animationDelay: '0.6s' }} className="animate-rise text-sm font-medium tracking-[0.55em] uppercase">
              Sahayatri
            </p>
            <p style={{ animationDelay: '0.7s' }} className="animate-rise mx-auto mt-4 max-w-3xl text-3xl leading-tight font-light text-balance md:text-5xl">
              {t('land.headline1')} <em className="font-serif text-[1.12em]">{t('land.verified')}</em> {t('land.headline2')} <em className="font-serif text-[1.12em]">{t('land.chaos')}</em>
            </p>
            <p style={{ animationDelay: '0.8s' }} className="animate-rise mx-auto mt-4 max-w-xl text-base text-pretty text-muted">
              {t('land.sub')}
            </p>
            <div style={{ animationDelay: '0.9s' }} className="animate-rise mt-8 flex flex-wrap justify-center gap-3">
              <a href="/app" className="btn btn-primary px-7 py-4 text-base">
                {t('land.cta')} <ArrowRight className="size-4" aria-hidden />
              </a>
              <a href="/app?tab=plan" className="btn px-7 py-4 text-base">
                <CalendarHeart className="size-4" aria-hidden /> {t('tab.plan')}
              </a>
            </div>
          </div>

          {/* preview cards, in normal flow (never overlapping), echoing the three-screen reference */}
          <div className="mx-auto mt-16 grid max-w-5xl items-start gap-5 md:grid-cols-3" aria-label="Product preview">
            <div className="panel animate-float p-5 [--tilt:-2deg] md:mt-10">
              <p className="text-xs font-medium text-muted">Safe Route · Tonight 10 PM</p>
              <p className="mt-1 text-xl font-light">Route safety</p>
              <div className="mt-3 flex justify-center">
                <ScoreBadge score={78} label="Route safety preview" size={150} />
              </div>
              <p className="mt-2 text-center text-xs text-muted">Avoids Navale Bridge black spot · +3 min</p>
            </div>

            <div className="card-dark animate-float p-5 [animation-delay:-2s]">
              <div className="flex items-end justify-between">
                <p className="text-base">Live city reports</p>
                <p className="text-2xl font-light">2/3</p>
              </div>
              <ul className="mt-3 space-y-3 text-sm">
                {(
                  [
                    [CloudRain, 'Waterlogging, Sinhagad Rd', 'Verified', 'bg-[#6fd394]'],
                    [Camera, 'Pothole cluster, Karve Rd', 'Verified', 'bg-[#6fd394]'],
                    [Users, 'Dark lane, FC Road', 'Corroborated', 'bg-sun'],
                  ] as const
                ).map(([Icon, title, status, dot]) => (
                  <li key={title} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-[#1f1f1f]" aria-hidden>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{title}</span>
                    <span className="flex items-center gap-1.5 text-xs text-white/70">
                      <span className={`size-2 rounded-full ${dot}`} aria-hidden />
                      {status}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-white/50">Preview · illustrative data</p>
            </div>

            <div className="card animate-float p-5 [animation-delay:-4s] [--tilt:2deg] md:mt-16">
              <p className="text-xs font-medium text-muted">Fair Fare · Station → Koregaon Park</p>
              <p className="mt-2 text-5xl font-light tracking-tight">₹75</p>
              <p className="text-xs text-muted">3.8 km · RTO meter fare</p>
              <p className="mt-3 rounded-2xl bg-danger px-3 py-2 text-sm text-on-primary">Driver asked ₹250 · +233% overcharging</p>
              <p lang="mr" className="mt-3 text-sm">
                “दादा, मीटरने चला.”
              </p>
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-charcoal px-3 py-1 text-xs text-white">
                <BadgeCheck className="size-3.5 text-sun" aria-hidden /> Distance from Google Routes
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Google services marquee ---------- */}
        <section aria-label="Google services used" className="mt-20 overflow-hidden bg-charcoal py-5 text-white">
          <div className="animate-marquee flex w-max gap-10 pr-10">
            {[...SERVICES, ...SERVICES].map((s, i) => (
              <span key={i} className="flex items-center gap-3 text-lg font-light whitespace-nowrap" aria-hidden={i >= SERVICES.length}>
                <span className="size-2 rounded-full bg-sun" aria-hidden /> {s}
              </span>
            ))}
          </div>
        </section>

        <Gallery />

        {/* ---------- Why not Google Maps ---------- */}
        <section className="mx-auto max-w-7xl px-4 pb-20 md:px-8" aria-labelledby="why-title">
          <p className="kicker">{t('land.whyKicker')}</p>
          <h2 id="why-title" className="mt-3 max-w-4xl text-4xl font-light text-balance md:text-6xl">
            {t('land.whyTitle1')} <em className="font-serif">{t('land.fastest')}</em> {t('land.whyTitle2')} <em className="font-serif">{t('land.safest')}</em> {t('land.whyTitle3')}
          </h2>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <div className="panel overflow-x-auto p-2">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="sr-only">Google Maps compared with Sahayatri</caption>
                <thead>
                  <tr className="text-xs tracking-wider text-muted uppercase">
                    <th scope="col" className="p-4 font-medium">
                      Capability
                    </th>
                    <th scope="col" className="p-4 text-center font-medium">
                      Maps
                    </th>
                    <th scope="col" className="rounded-t-2xl bg-charcoal p-4 text-center font-medium text-sun">
                      सहयात्री
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map(([cap, maps, us], i) => (
                    <tr key={cap} className="border-t border-ink/8">
                      <th scope="row" className="p-4 font-normal">
                        {cap}
                      </th>
                      <td className="p-4 text-center">{maps ? <Check className="mx-auto size-5" aria-label="Yes" /> : <Minus className="mx-auto size-5 opacity-40" aria-label="No" />}</td>
                      <td className={`bg-charcoal p-4 text-center text-sun ${i === COMPARISON.length - 1 ? 'rounded-b-2xl' : ''}`}>{us && <Check className="mx-auto size-5" aria-label="Yes" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="grid grid-cols-2 gap-4">
              {STATS.map((s, i) => (
                <div key={s.label} className={`${i === 0 ? 'card-dark' : i === 3 ? 'bg-sun text-[#1f1f1f] shadow-soft' : 'panel'} flex flex-col justify-between rounded-[28px] p-5`}>
                  <dt className="text-sm opacity-80">{s.label}</dt>
                  <dd className="mt-6 text-4xl font-light tracking-tight md:text-5xl">{s.value}</dd>
                </div>
              ))}
              <p className="col-span-2 text-xs text-muted">Sources: Pune City Police Road Safety Report 2024–25; Pune RTO; PMC; Pune Traffic Police black-spot lists.</p>
            </dl>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-20 md:px-8" aria-labelledby="features-title">
          <p className="kicker">{t('land.featuresKicker')}</p>
          <h2 id="features-title" className="mt-3 text-4xl font-light md:text-6xl">
            {t('land.featuresTitle')} <em className="font-serif">{t('land.verifyWord')}</em>
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ Icon, deva, title, body, tone }, i) => {
              const dark = tone === 'card-dark';
              const sun = tone === 'bg-sun';
              return (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: (i % 4) * 0.07, duration: 0.5 }}
                  className={`${tone} ${sun ? 'text-[#1f1f1f] shadow-soft' : ''} ${tone === 'hatch' ? 'shadow-soft' : ''} flex flex-col rounded-[28px] p-6`}
                >
                  <span className={`grid size-11 place-items-center rounded-full ${dark ? 'bg-sun text-[#1f1f1f]' : 'bg-charcoal text-sun'}`} aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <p lang="mr" className={`mt-5 font-deva text-3xl ${dark ? 'text-sun' : ''}`}>
                    {deva}
                  </p>
                  <h3 className="mt-1 text-xl font-normal">{title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-white/80' : 'opacity-80'}`}>{body}</p>
                </motion.li>
              );
            })}
          </ul>
        </section>

        {/* ---------- Verification ladder ---------- */}
        <section id="verify" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-20 md:px-8" aria-labelledby="verify-title">
          <div className="panel p-6 md:p-10">
            <p className="kicker">
              <ShieldCheck className="size-3.5" aria-hidden /> The trust engine
            </p>
            <h2 id="verify-title" className="mt-3 max-w-3xl text-4xl font-light text-balance md:text-5xl">
              AI alone is a weak verifier. So Gemini is just <em className="font-serif">one</em> signal.
            </h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {LADDER.map((step, i) => (
                <motion.li key={step.status} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} className={`${step.cls} rounded-[24px] p-6 shadow-soft`}>
                  <p className="font-mono text-xs opacity-75">
                    Step {i + 1} · trust {step.score}
                  </p>
                  <p className="mt-3 text-2xl">{step.status}</p>
                  <p className="mt-2 text-sm opacity-85">{step.copy}</p>
                </motion.li>
              ))}
            </ol>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Trust signals">
              {SIGNALS.map((s) => (
                <li key={s} className="chip px-3 py-1.5 text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="mx-auto max-w-7xl px-4 pb-16 md:px-8" aria-labelledby="cta-title">
          <div className="card-dark relative overflow-hidden p-8 md:p-14">
            <div aria-hidden className="absolute -right-24 -bottom-32 size-96 rounded-full bg-sun opacity-90" />
            <p lang="mr" className="relative font-deva text-5xl text-sun md:text-7xl">
              चला, निघूया!
            </p>
            <h2 id="cta-title" className="relative mt-2 max-w-lg text-3xl font-light md:text-5xl">
              {t('land.ctaTitle')}
            </h2>
            <a href="/app" className="btn relative mt-8 bg-sun px-7 py-4 text-base text-[#1f1f1f]">
              {t('land.cta')} <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-sm md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/15 pt-6">
          <p>
            <span lang="mr" className="font-deva">
              सहयात्री
            </span>{' '}
            · Built for PromptWars × BRAIN DYPCOEI with Google for Developers & Hack2skill
          </p>
          <p>In an emergency, call 112.</p>
        </div>
      </footer>
    </>
  );
}

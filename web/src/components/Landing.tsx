import { ArrowRight, ArrowUpRight, BadgeCheck, Camera, CloudRain, Compass, Landmark, Megaphone, Radio, Route, Scale, ShieldCheck, Star, Users } from 'lucide-react';
import { motion, MotionConfig } from 'motion/react';
import { ScoreBadge } from './ui';

/** Devanagari graphemes, split by hand so conjuncts like त्री never break apart. */
const WORDMARK = ['स', 'ह', 'या', 'त्री'];

const SERVICES = [
  'Gemini on Vertex AI',
  'Grounding with Google Maps',
  'Grounding with Google Search',
  'Places API',
  'Routes API',
  'Weather API',
  'Air Quality API',
  'Maps JavaScript API',
  'Firestore',
  'Secret Manager',
  'Cloud Run',
  'Cloud Build',
];

const STATS = [
  { value: '290', label: 'road deaths in Pune in 2025' },
  { value: '20', label: 'official accident black spots' },
  { value: '54%', label: 'of fatal crashes were hit-and-run' },
  { value: '12', label: 'Google services working together' },
];

const FEATURES = [
  { Icon: Compass, deva: 'खोज', title: 'Explore', body: 'Misal, stays, cafés and budget spots from Gemini grounded in Google Maps. Every place is verified on Places with a live area-safety score.', tone: 'panel' },
  { Icon: Landmark, deva: 'वारसा', title: 'Heritage stories', body: 'Peshwa-era wadas, forts and festivals told as stories, grounded in Maps and Search so the history stays honest.', tone: 'bg-sun' },
  { Icon: Route, deva: 'सुरक्षित मार्ग', title: 'Safe Route', body: 'Alternatives scored against Pune Police black spots, verified reports, night-time risk and live rain. Code decides the score; Gemini explains it.', tone: 'card-dark' },
  { Icon: Megaphone, deva: 'तक्रार', title: 'Report & verify', body: 'A voice note in Marathi, Hindi or English, a photo or a line of text becomes a structured incident with a transparent trust score.', tone: 'card-dark' },
  { Icon: Scale, deva: 'तुलना', title: 'Best vs worst', body: 'Safety, cleanliness, affordability, rating and accessibility side by side, with quotes from real reviews as evidence.', tone: 'panel' },
  { Icon: Radio, deva: 'नाडी', title: 'City pulse', body: 'Live weather, air quality and a Search-grounded morning briefing on diversions, festivals and alerts.', tone: 'hatch' },
] as const;

const LADDER = [
  { status: 'Unverified', score: '< 45', copy: 'A single claim. Shown, but it never changes a route on its own.', cls: 'bg-white' },
  { status: 'Corroborated', score: '45–69', copy: 'Evidence or independent reports agree. It starts to count in safety scoring.', cls: 'bg-sun' },
  { status: 'Verified', score: '70+', copy: 'Multiple signals line up. Treated as a real hazard across the city map.', cls: 'bg-charcoal text-white' },
];

const SIGNALS = ['+15 photo evidence', '±20 Gemini evidence check', '+15 live rain confirms flooding', '−10 weather contradicts', '+12 per nearby report', '+10 near official black spot'];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <a href="#content" className="btn sr-only bg-sun focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Skip to content
      </a>

      {/* ---------- Nav ---------- */}
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-5 md:px-8">
        <a href="/" className="flex items-center gap-2" aria-label="Sahayatri home">
          <span className="grid size-11 place-items-center rounded-full bg-charcoal font-deva text-xl text-sun shadow-soft" aria-hidden>
            स
          </span>
          <span className="text-lg font-medium tracking-tight">Sahayatri</span>
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-2 md:flex">
          <a href="#features" className="btn py-2.5">
            Features
          </a>
          <a href="#verify" className="btn py-2.5">
            How it verifies
          </a>
          <a href="https://github.com/hopepranav08/dyp_prompt_war" target="_blank" rel="noopener noreferrer" className="btn py-2.5">
            GitHub <span className="sr-only">(opens in new tab)</span>
          </a>
        </nav>
        <a href="/app" className="btn bg-charcoal py-2.5 text-white">
          Open co-pilot <ArrowUpRight className="size-4" aria-hidden />
        </a>
      </header>

      <main id="content">
        {/* ---------- Hero ---------- */}
        <section className="relative mx-auto max-w-7xl px-4 pt-10 pb-16 md:px-8 md:pt-16 xl:min-h-[57rem]" aria-labelledby="hero-title">
          <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="kicker relative z-10 mx-auto w-fit bg-white/70 backdrop-blur">
            <span className="size-2 rounded-full bg-sun" aria-hidden /> PromptWars × BRAIN DYPCOEI · Pune
          </motion.p>

          <div className="relative mt-12 flex justify-center md:mt-6">
            {/* rising sun behind the wordmark */}
            <motion.div
              aria-hidden
              initial={{ scale: 0.4, opacity: 0, y: 80 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-1/2 left-1/2 size-[46vw] max-h-[460px] max-w-[460px] md:size-[58vw] -translate-x-1/2 -translate-y-[55%] rounded-full bg-sun shadow-[0_0_120px_40px_rgb(247_205_75/0.45)]"
            />
            <h1 id="hero-title" className="relative text-center">
              <span className="sr-only">Sahayatri (सहयात्री), your verified co-pilot for Pune</span>
              <span aria-hidden lang="mr" className="relative block font-deva leading-[1.05] text-[clamp(4.5rem,19vw,15rem)]">
                {/* outlined echo for depth */}
                <span className="pointer-events-none absolute inset-0 translate-x-[0.05em] translate-y-[0.05em] text-transparent [-webkit-text-stroke:2px_var(--color-ink)] opacity-40">
                  सहयात्री
                </span>
                {WORDMARK.map((g, i) => (
                  <span
                    key={g}
                    className="animate-rise relative inline-block text-ink"
                    style={{ animationDelay: `${0.25 + i * 0.12}s`, ['--r' as string]: `${i % 2 ? 8 : -8}deg` }}
                  >
                    {g}
                  </span>
                ))}
              </span>
            </h1>
          </div>

          <div className="relative mt-4 text-center">
            <p style={{ animationDelay: '0.75s' }} className="animate-rise text-sm font-medium tracking-[0.55em] uppercase">
              Sahayatri
            </p>
            <p style={{ animationDelay: '0.85s' }} className="animate-rise mx-auto mt-4 max-w-2xl text-3xl leading-tight font-light md:text-5xl">
              Your <em className="font-serif text-[1.15em]">verified</em> co-pilot for Pune’s <em className="font-serif text-[1.15em]">beautiful chaos.</em>
            </p>
            <p style={{ animationDelay: '0.95s' }} className="animate-rise mx-auto mt-4 max-w-xl text-base text-ink/80">
              Discover food and heritage, take the safest way home, and turn messy citizen reports into verified, actionable city intelligence.
            </p>
            <div style={{ animationDelay: '1.05s' }} className="animate-rise mt-8 flex flex-wrap justify-center gap-3">
              <a href="/app" className="btn bg-charcoal px-7 py-4 text-base text-white">
                Open the co-pilot <ArrowRight className="size-4" aria-hidden />
              </a>
              <a href="#verify" className="btn px-7 py-4 text-base">
                See how it verifies
              </a>
            </div>
          </div>

          {/* floating preview cards */}
          <div className="mt-14 grid gap-5 md:grid-cols-3 xl:pointer-events-none xl:absolute xl:inset-x-0 xl:top-24 xl:mt-0 xl:block" aria-label="Product preview">
            <div className="panel animate-float p-5 xl:absolute xl:top-[21rem] xl:left-0 xl:w-60 [--tilt:-4deg]">
              <p className="text-xs font-medium text-muted">Safe Route · Tonight 10 PM</p>
              <p className="mt-1 text-xl font-light">Route safety</p>
              <div className="mt-3 flex justify-center">
                <ScoreBadge score={78} label="Route safety preview" size={150} />
              </div>
              <p className="mt-2 text-center text-xs text-muted">Avoids Navale Bridge black spot · +3 min</p>
            </div>

            <div className="card-dark animate-float p-5 [animation-delay:-2s] xl:absolute xl:top-[29rem] xl:right-0 xl:w-64 [--tilt:3deg]">
              <div className="flex items-end justify-between">
                <p className="text-base">Live city reports</p>
                <p className="text-2xl font-light">2/3</p>
              </div>
              <ul className="mt-3 space-y-3 text-sm">
                {[
                  [CloudRain, 'Waterlogging, Sinhagad Rd', 'Verified', 'bg-[#6fd394]'],
                  [Camera, 'Pothole cluster, Karve Rd', 'Verified', 'bg-[#6fd394]'],
                  [Users, 'Dark lane, FC Road', 'Corroborated', 'bg-sun'],
                ].map(([Icon, title, status, dot]) => {
                  const I = Icon as typeof Camera;
                  return (
                    <li key={title as string} className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-full bg-white text-ink" aria-hidden>
                        <I className="size-4" />
                      </span>
                      <span className="flex-1">{title as string}</span>
                      <span className="flex items-center gap-1.5 text-xs text-white/70">
                        <span className={`size-2 rounded-full ${dot as string}`} aria-hidden />
                        {status as string}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-[11px] text-white/50">Preview · illustrative data</p>
            </div>

            <div className="card animate-float p-4 [animation-delay:-4s] xl:absolute xl:top-[19rem] xl:right-2 xl:w-60 [--tilt:4deg]">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-sun font-semibold">1</span>
                <div>
                  <p className="font-medium">Thorat Misal, JM Road</p>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <Star className="size-3 fill-sun text-sun" aria-hidden /> 4.0 · ₹100–150 · food
                  </p>
                </div>
              </div>
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-charcoal px-3 py-1 text-xs text-white">
                <BadgeCheck className="size-3.5 text-sun" aria-hidden /> Verified on Google Places
              </p>
            </div>
          </div>
        </section>

        {/* ---------- Google services marquee ---------- */}
        <section aria-label="Google services used" className="overflow-hidden bg-charcoal py-5 text-white">
          <div className="animate-marquee flex w-max gap-10 pr-10">
            {[...SERVICES, ...SERVICES].map((s, i) => (
              <span key={i} className="flex items-center gap-3 text-lg font-light whitespace-nowrap" aria-hidden={i >= SERVICES.length}>
                <span className="size-2 rounded-full bg-sun" aria-hidden /> {s}
              </span>
            ))}
          </div>
        </section>

        {/* ---------- Stats ---------- */}
        <section className="mx-auto max-w-7xl px-4 py-20 md:px-8" aria-labelledby="why-title">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={reveal}>
            <p className="kicker">Why it matters</p>
            <h2 id="why-title" className="mt-3 max-w-3xl text-4xl font-light md:text-6xl">
              Maps tell you the <em className="font-serif">fastest</em> way. Nobody tells you the <em className="font-serif">safest</em> one.
            </h2>
          </motion.div>
          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`${i === 3 ? 'bg-sun' : i === 0 ? 'card-dark' : 'panel'} rounded-[28px] p-6`}
              >
                <dt className={`text-sm ${i === 0 ? 'text-white/75' : 'text-ink/75'}`}>{s.label}</dt>
                <dd className="mt-6 text-6xl font-light tracking-tight">{s.value}</dd>
              </motion.div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-ink/75">Sources: Pune City Police Road Safety Report 2024–25; Pune Traffic Police black-spot lists.</p>
        </section>

        {/* ---------- Features ---------- */}
        <section id="features" className="mx-auto max-w-7xl scroll-mt-6 px-4 pb-20 md:px-8" aria-labelledby="features-title">
          <p className="kicker">Everything in one co-pilot</p>
          <h2 id="features-title" className="mt-3 text-4xl font-light md:text-6xl">
            Explore. Navigate. <em className="font-serif">Verify.</em>
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ Icon, deva, title, body, tone }, i) => {
              const dark = tone === 'card-dark';
              return (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
                  className={`${tone} group relative overflow-hidden rounded-[28px] p-7 ${tone === 'bg-sun' || tone === 'hatch' ? 'shadow-soft' : ''}`}
                >
                  <span className={`grid size-12 place-items-center rounded-full ${dark ? 'bg-sun text-ink' : 'bg-charcoal text-sun'}`} aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <p lang="mr" className={`mt-6 font-deva text-4xl ${dark ? 'text-sun' : 'text-ink'}`}>
                    {deva}
                  </p>
                  <h3 className="mt-1 text-2xl font-normal">{title}</h3>
                  <p className={`mt-3 text-sm leading-relaxed ${dark ? 'text-white/80' : 'text-ink/80'}`}>{body}</p>
                </motion.li>
              );
            })}
          </ul>
        </section>

        {/* ---------- Verification ladder ---------- */}
        <section id="verify" className="mx-auto max-w-7xl scroll-mt-6 px-4 pb-20 md:px-8" aria-labelledby="verify-title">
          <div className="panel p-6 md:p-10">
            <p className="kicker">
              <ShieldCheck className="size-3.5" aria-hidden /> The trust engine
            </p>
            <h2 id="verify-title" className="mt-3 max-w-3xl text-4xl font-light md:text-5xl">
              AI alone is a weak verifier. So Gemini is just <em className="font-serif">one</em> signal.
            </h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {LADDER.map((step, i) => (
                <motion.li
                  key={step.status}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className={`${step.cls} rounded-[24px] p-6 shadow-soft`}
                >
                  <p className="font-mono text-xs opacity-75">Step {i + 1} · trust {step.score}</p>
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
            <div aria-hidden className="absolute -right-24 -bottom-32 size-96 rounded-full bg-sun opacity-90 blur-[2px]" />
            <p lang="mr" className="relative font-deva text-5xl text-sun md:text-7xl">
              चला, निघूया!
            </p>
            <h2 id="cta-title" className="relative mt-2 text-3xl font-light md:text-5xl">
              Let’s go. Pune is waiting.
            </h2>
            <a href="/app" className="btn relative mt-8 bg-sun px-7 py-4 text-base text-ink">
              Open the co-pilot <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 text-sm text-ink/80 md:px-8">
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
    </MotionConfig>
  );
}

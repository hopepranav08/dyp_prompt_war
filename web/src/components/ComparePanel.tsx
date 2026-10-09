import { ChevronDown, Crown, Plus, Scale, Sparkles, ThumbsDown, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import type { CompareResult, CompareScores } from '../lib/types';
import { ErrorNote, listItem, ScoreBar, SectionTitle, Spinner } from './ui';

const AXES: Array<[keyof CompareScores, string]> = [
  ['safety', 'Safety'],
  ['cleanliness', 'Cleanliness'],
  ['affordability', 'Affordability'],
  ['rating', 'Rating'],
  ['accessibility', 'Accessibility'],
];
const SERIES = ['#f7cd4b', '#e0603f', '#3f8f63', '#5b7bd5'];
const TIERS = [
  { id: 'cheap', label: 'Cheap', sign: '₹' },
  { id: 'moderate', label: 'Moderate', sign: '₹₹' },
  { id: 'expensive', label: 'Expensive', sign: '₹₹₹' },
] as const;
const CRAVINGS = ['Misal', 'Biryani', 'Vada pav', 'Café', 'Maharashtrian thali', 'Rooftop dinner'];
const PRICE_SIGN: Record<string, string> = { PRICE_LEVEL_FREE: 'Free', PRICE_LEVEL_INEXPENSIVE: '₹', PRICE_LEVEL_MODERATE: '₹₹', PRICE_LEVEL_EXPENSIVE: '₹₹₹', PRICE_LEVEL_VERY_EXPENSIVE: '₹₹₹₹' };

export function ComparePanel() {
  const { t } = usePrefs();
  const [mode, setMode] = useState<'tier' | 'custom'>('tier');
  const [craving, setCraving] = useState('Misal');
  const [tier, setTier] = useState<(typeof TIERS)[number]['id']>('cheap');
  const [names, setNames] = useState(['Shaniwar Wada', 'Aga Khan Palace']);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (i: number, v: string) => setNames((n) => n.map((x, j) => (j === i ? v : x)));

  async function compare(list: string[]) {
    setLoading(true);
    setError('');
    try {
      const r = await api.compare(list);
      setResult(r);
      setExpanded(r.bestId ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'tier') {
      setLoading(true);
      setError('');
      try {
        const { places } = await api.compareSuggest(craving, tier);
        if (places.length < 2) throw new Error(`Couldn’t find enough well-reviewed ${TIERS.find((x) => x.id === tier)!.label.toLowerCase()} places for “${craving}”. Try another tier.`);
        setNames(places);
        await compare(places);
      } catch (err) {
        setError((err as Error).message);
        setLoading(false);
      }
      return;
    }
    const list = names.map((n) => n.trim()).filter((n) => n.length >= 2);
    if (list.length < 2) return setError('Enter at least two places.');
    await compare(list);
  }

  const chartData = result ? AXES.map(([key, label]) => ({ axis: label, ...Object.fromEntries(result.results.map((r) => [r.place.name, r.scores[key]])) })) : [];

  return (
    <div>
      <SectionTitle kicker={t('compare.kicker')} title={t('compare.title')}>
        {t('compare.sub')}
      </SectionTitle>

      <div className="mb-4 inline-flex rounded-full border border-ink/10 bg-surface p-1" role="radiogroup" aria-label="Compare mode">
        {(
          [
            ['tier', 'By price tier'],
            ['custom', 'Pick places'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={mode === id} onClick={() => setMode(id)} className={`rounded-full px-4 py-1.5 text-sm font-medium ${mode === id ? 'bg-primary text-on-primary' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'tier' ? (
          <>
            <label className="block text-sm font-medium">
              What are you craving?
              <input className="field mt-1" value={craving} onChange={(e) => setCraving(e.target.value)} maxLength={80} required minLength={2} />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CRAVINGS.map((c) => (
                <button key={c} type="button" onClick={() => setCraving(c)} className={`chip ${craving === c ? 'bg-sun text-[#1f1f1f]' : 'hover:bg-cream'}`}>
                  {c}
                </button>
              ))}
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Budget tier</legend>
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map((x) => (
                  <label key={x.id} className={`cursor-pointer rounded-2xl border p-3 text-center transition-all has-[:focus-visible]:outline-3 ${tier === x.id ? 'border-transparent bg-charcoal text-white shadow-lift' : 'border-ink/10 bg-surface hover:-translate-y-0.5'}`}>
                    <input type="radio" name="tier" className="sr-only" checked={tier === x.id} onChange={() => setTier(x.id)} />
                    <span className={`block text-xl font-semibold ${tier === x.id ? 'text-sun' : ''}`}>{x.sign}</span>
                    <span className="text-xs">{x.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn btn-primary w-full" disabled={loading}>
              <Sparkles className="size-4" aria-hidden /> Find & compare the top 3
            </button>
          </>
        ) : (
          <>
            {names.map((n, i) => (
              <div key={i} className="flex gap-2">
                <label htmlFor={`cmp-${i}`} className="sr-only">
                  Place {i + 1}
                </label>
                <input id={`cmp-${i}`} className="field" value={n} onChange={(e) => update(i, e.target.value)} maxLength={120} placeholder={`Place ${i + 1}`} />
                {names.length > 2 && (
                  <button type="button" className="btn btn-icon" onClick={() => setNames((x) => x.filter((_, j) => j !== i))} aria-label={`Remove place ${i + 1}`}>
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              {names.length < 4 && (
                <button type="button" className="btn" onClick={() => setNames((x) => [...x, ''])}>
                  <Plus className="size-4" aria-hidden /> {t('compare.add')}
                </button>
              )}
              <button className="btn btn-primary flex-1" disabled={loading}>
                <Scale className="size-4" aria-hidden /> {t('compare.go')}
              </button>
            </div>
          </>
        )}
      </form>

      <div className="mt-5 space-y-3" aria-live="polite">
        {loading && <Spinner label={t('compare.loading')} />}
        {error && <ErrorNote message={error} />}
        {result && !loading && (
          <>
            <p className="card bg-cream p-3 text-sm font-medium">{result.summary}</p>

            <figure className="card p-2">
              <div className="h-72" aria-hidden>
                <ResponsiveContainer>
                  <RadarChart data={chartData} outerRadius="70%">
                    <PolarGrid stroke="var(--color-ink)" strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fontWeight: 600, fill: 'var(--color-ink)' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {result.results.map((r, i) => (
                      <Radar key={r.place.id} name={r.place.name} dataKey={r.place.name} stroke={SERIES[i]} fill={SERIES[i]} fillOpacity={0.18} strokeWidth={2.5} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">Radar chart comparing places. The same scores are listed below.</figcaption>
            </figure>

            <ul className="space-y-3">
              {[...result.results]
                .sort((a, b) => b.overall - a.overall)
                .map((r, i) => {
                  const best = r.place.id === result.bestId;
                  const worst = r.place.id === result.worstId && !best;
                  const open = expanded === r.place.id;
                  const price = r.place.priceLevel ? PRICE_SIGN[r.place.priceLevel] : undefined;
                  return (
                    <motion.li key={r.place.id} custom={i} variants={listItem} initial="hidden" animate="show" whileHover={{ y: -3 }} className={`card overflow-hidden ${best ? 'ring-2 ring-sun' : ''}`}>
                      <button type="button" aria-expanded={open} onClick={() => setExpanded(open ? null : r.place.id)} className="relative block h-40 w-full overflow-hidden text-left text-white">
                        {r.photoUri ? (
                          <img src={r.photoUri} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 hover:scale-105" />
                        ) : (
                          <span className="absolute inset-0 bg-gradient-to-br from-charcoal to-[#4a4a4a]" />
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" aria-hidden />
                        <span className="absolute top-3 left-3 flex gap-1.5">
                          <span className="grid size-7 place-items-center rounded-full bg-white/90 text-sm font-semibold text-[#1f1f1f]">{i + 1}</span>
                          {best && (
                            <span className="chip border-transparent bg-sun text-[#1f1f1f]">
                              <Crown className="size-3.5" aria-hidden /> Best
                            </span>
                          )}
                          {worst && (
                            <span className="chip border-transparent bg-[#b3362a] text-white">
                              <ThumbsDown className="size-3.5" aria-hidden /> Worst
                            </span>
                          )}
                        </span>
                        {price && <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-sm font-semibold text-sun">{price}</span>}
                        <span className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-lg font-medium">{r.place.name}</span>
                            <span className="block truncate text-xs text-white/80">{r.verdict}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="text-3xl font-light">{r.overall}</span>
                            <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                          </span>
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="p-4">
                              <div className="grid gap-2 sm:grid-cols-2">
                                {AXES.map(([k, label]) => (
                                  <ScoreBar key={k} label={label} value={r.scores[k]} />
                                ))}
                              </div>
                              <dl className="mt-3 space-y-1 text-xs">
                                <div>
                                  <dt className="inline font-semibold">Cleanliness evidence: </dt>
                                  <dd className="inline italic">{r.evidence.cleanliness || 'n/a'}</dd>
                                </div>
                                <div>
                                  <dt className="inline font-semibold">Safety evidence: </dt>
                                  <dd className="inline italic">
                                    {r.evidence.safety || 'n/a'}
                                    {r.evidence.area?.blackspots.length ? ` · near ${r.evidence.area.blackspots.join(', ')}` : ''}
                                  </dd>
                                </div>
                              </dl>
                              {r.place.mapsUri && (
                                <a href={r.place.mapsUri} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-xs font-medium underline">
                                  {t('common.openMaps')}
                                </a>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  );
                })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

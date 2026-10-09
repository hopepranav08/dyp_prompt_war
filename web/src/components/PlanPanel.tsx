import { BadgeCheck, CloudRain, Footprints, Home, Lightbulb, Sparkles, Utensils } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import type { PlanResult } from '../lib/types';
import { ErrorNote, listItem, PlacePhoto, ScoreBadge, SectionTitle, Spinner } from './ui';

const SUGGESTIONS = ['Peshwa history with my parents, must eat misal, relaxed pace', 'Budget student day: ₹400, street food, a fort and a sunset view', 'Rainy-day plan: museums, cafés and Tulshibaug shopping'];
const HOURS = [3, 4, 6, 8, 10];
const STARTS = [7, 8, 9, 10, 11, 12, 14, 16, 17, 18];

const fmtHour = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

export function PlanPanel({ onResult }: { onResult: (r: PlanResult) => void }) {
  const { t } = usePrefs();
  const [prompt, setPrompt] = useState('');
  const [hours, setHours] = useState(6);
  const [budget, setBudget] = useState('800');
  const [start, setStart] = useState(10);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(text: string) {
    if (text.trim().length < 3) return;
    setPrompt(text);
    setLoading(true);
    setError('');
    try {
      const b = Number.parseInt(budget, 10);
      const r = await api.plan(text, hours, Number.isFinite(b) && b >= 100 ? b : undefined, start);
      setResult(r);
      onResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(prompt);
  };

  const window = result?.forecast.filter((f) => f.hour >= result.startHour && f.hour < result.startHour + hours) ?? [];
  const underBudget = result?.totals.budget != null && result.totals.total <= result.totals.budget;

  return (
    <div>
      <SectionTitle kicker={t('plan.kicker')} title={t('plan.title')}>
        {t('plan.sub')}
      </SectionTitle>

      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="plan-q" className="block text-sm font-medium">
          {t('plan.prompt')}
        </label>
        <textarea id="plan-q" className="field min-h-20" value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={400} placeholder={t('plan.placeholder')} />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs font-medium text-muted">
            {t('plan.hours')}
            <select className="field mt-1 py-2" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            {t('plan.budget')}
            <input className="field mt-1 py-2" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, '').slice(0, 5))} />
          </label>
          <label className="text-xs font-medium text-muted">
            {t('plan.start')}
            <select className="field mt-1 py-2" value={start} onChange={(e) => setStart(Number(e.target.value))}>
              {STARTS.map((h) => (
                <option key={h} value={h}>
                  {fmtHour(h)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="btn btn-primary w-full" disabled={loading || prompt.trim().length < 3}>
          <Sparkles className="size-4" aria-hidden /> {t('plan.go')}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chip text-left hover:bg-cream" onClick={() => void run(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {loading && <Spinner label={t('plan.loading')} />}
        {error && <ErrorNote message={error} />}
        {result && !loading && (
          <>
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-dark p-5">
              <h3 className="text-2xl font-light">{result.title}</h3>
              <p className="mt-1 text-sm text-white/75">{result.summary}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-sun p-3 text-[#1f1f1f]">
                  <dt className="text-[11px] font-medium">{t('plan.total')}</dt>
                  <dd className="text-2xl font-semibold">₹{result.totals.total}</dd>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <dt className="text-[11px] text-white/70">{t('plan.activities')}</dt>
                  <dd className="text-xl">₹{result.totals.activities}</dd>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <dt className="text-[11px] text-white/70">{t('plan.transport')}</dt>
                  <dd className="text-xl">₹{result.totals.transport}</dd>
                </div>
              </dl>
              {result.totals.budget != null && (
                <p className={`mt-3 text-xs ${underBudget ? 'text-[#8fe0ad]' : 'text-[#ffb3a6]'}`}>
                  {underBudget ? '✓' : '!'} ₹{result.totals.total} / ₹{result.totals.budget} budget per person
                </p>
              )}
            </motion.section>

            {window.length > 0 && (
              <section aria-label="Hourly forecast" className="card flex gap-1 overflow-x-auto p-3 scroll-soft">
                {window.map((f) => (
                  <div key={f.hour} className={`flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs ${f.rainChance >= 50 ? 'bg-sun-soft text-[#1f1f1f]' : ''}`}>
                    <span className="font-medium">{fmtHour(f.hour)}</span>
                    <CloudRain className={`size-4 ${f.rainChance >= 50 ? '' : 'opacity-40'}`} aria-hidden />
                    <span className="font-mono">{f.rainChance}%</span>
                  </div>
                ))}
              </section>
            )}

            <ol className="relative space-y-0">
              {result.stops.map((s, i) => {
                const leg = result.legs.find((l) => l.toIndex === i);
                return (
                  <motion.li key={`${s.name}-${i}`} custom={i} variants={listItem} initial="hidden" animate="show">
                    {leg && (
                      <div className="flex items-center gap-3 py-2 pl-6 text-xs text-muted">
                        <span className="h-8 w-0.5 rounded bg-ink/15" aria-hidden />
                        {leg.walk ? <Footprints className="size-4" aria-hidden /> : <span aria-hidden>🛺</span>}
                        <span>
                          {leg.walk ? t('plan.walk') : `${leg.km} km`} · {leg.minutes} min{!leg.walk && ` · ₹${leg.autoFare}`} · safety {leg.safetyScore}
                        </span>
                      </div>
                    )}
                    <article className="card overflow-hidden">
                      <div className="grid sm:grid-cols-[180px_1fr]">
                        <PlacePhoto src={s.photoUri} alt={s.name} attribution={s.place?.photoAttribution} className="h-40 sm:h-full" />
                        <div className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-sun px-2.5 py-1 font-mono text-xs font-bold text-[#1f1f1f]">{s.startTime}</span>
                            {s.verified && (
                              <span className="chip">
                                <BadgeCheck className="size-3.5 text-ok" aria-hidden /> {t('common.verifiedPlace')}
                              </span>
                            )}
                            {s.indoor && (
                              <span className="chip">
                                <Home className="size-3.5" aria-hidden /> {t('plan.indoor')}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="text-lg font-medium">{s.name}</h3>
                              <p className="text-xs text-muted">
                                {s.category} · {s.durationMin} min · {s.costPerPerson > 0 ? `₹${s.costPerPerson}` : 'Free'}
                              </p>
                            </div>
                            {s.area && <ScoreBadge score={s.area.score} label="Area safety" size={56} />}
                          </div>
                          <p className="mt-2 text-sm">{s.why}</p>
                          <p className="mt-2 flex gap-1.5 text-xs text-muted">
                            <Lightbulb className="size-3.5 shrink-0 text-sun" aria-hidden /> {s.tip}
                          </p>
                        </div>
                      </div>
                    </article>
                  </motion.li>
                );
              })}
            </ol>

            {result.foodToTry.length > 0 && (
              <section className="card p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Utensils className="size-4" aria-hidden /> {t('plan.foodToTry')}
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {result.foodToTry.map((f) => (
                    <li key={f} className="chip bg-sun-soft text-[#1f1f1f]">
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

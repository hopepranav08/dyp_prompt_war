import { ExternalLink, Megaphone, Phone, Search, ShieldAlert, ThumbsDown, ThumbsUp, UtensilsCrossed } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { FoodAlerts, FoodCheck } from '../lib/types';
import { ErrorNote, listItem, PlacePhoto, ScoreBadge, SectionTitle, Spinner } from './ui';

const VERDICT: Record<FoodCheck['verdict'], { label: string; cls: string }> = {
  looks_safe: { label: 'Looks safe', cls: 'bg-ok text-on-primary' },
  some_concerns: { label: 'Some concerns', cls: 'bg-sun text-[#1f1f1f]' },
  serious_concerns: { label: 'Serious concerns', cls: 'bg-danger text-on-primary' },
  insufficient_data: { label: 'Not enough data', cls: 'bg-surface text-ink' },
};

const SAMPLES = ['Vaishali FC Road', 'Bedekar Misal', 'Goodluck Cafe Deccan'];

/** Food Safety Radar: recent Pune FDA actions, an eatery check with citations, and a path to report. */
export function FoodPanel({ onReport }: { onReport: (text: string) => void }) {
  const [alerts, setAlerts] = useState<FoodAlerts | null>(null);
  const [name, setName] = useState('');
  const [check, setCheck] = useState<FoodCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.foodAlerts().then(setAlerts).catch(() => setAlerts(null));
  }, []);

  async function run(q: string) {
    if (q.trim().length < 2) return;
    setName(q);
    setLoading(true);
    setError('');
    try {
      setCheck(await api.foodCheck(q));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(name);
  };

  return (
    <div>
      <SectionTitle kicker="Food safety radar · Maharashtra FDA + reviews" title="Is it safe to eat there?">
        Pune’s FDA has been suspending licences all year. Check any eatery against cited FDA actions and real review hygiene signals, then report what you see.
      </SectionTitle>

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="food-q" className="sr-only">
          Restaurant, bakery or stall name
        </label>
        <input id="food-q" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. a biryani house in Wagholi" maxLength={120} />
        <button className="btn btn-primary" disabled={loading || name.trim().length < 2}>
          <Search className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Check</span>
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <button key={s} type="button" className="chip hover:bg-cream" onClick={() => void run(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4" aria-live="polite">
        {loading && <Spinner label="Searching FDA actions and reading reviews…" />}
        {error && <ErrorNote message={error} />}
        {check && !loading && (
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
            <PlacePhoto src={check.photoUri} alt={check.place?.name ?? name} className="h-36" />
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <span className={`chip ${VERDICT[check.verdict].cls}`}>{VERDICT[check.verdict].label}</span>
                  <h3 className="mt-2 text-lg font-medium">{check.place?.name ?? name}</h3>
                  {check.place?.address && <p className="text-xs text-muted">{check.place.address}</p>}
                </div>
                <ScoreBadge score={Math.round(check.hygieneScore)} label="Hygiene score" size={64} />
              </div>
              <p className="mt-3 text-sm">{check.summary}</p>

              {check.fdaFindings.length > 0 && (
                <div className="mt-3 rounded-2xl bg-error-bg p-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                    <ShieldAlert className="size-3.5" aria-hidden /> FDA findings
                  </h4>
                  <ul className="mt-1 space-y-1 text-sm">
                    {check.fdaFindings.map((f) => (
                      <li key={f.date + f.action}>
                        <strong>{f.date}</strong> · {f.action}: {f.detail}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {check.reviewSignals.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {check.reviewSignals.map((r) => (
                    <li key={r.quote} className="flex gap-2">
                      {r.signal === 'positive' ? <ThumbsUp className="mt-0.5 size-3.5 shrink-0 text-ok" aria-label="positive" /> : <ThumbsDown className="mt-0.5 size-3.5 shrink-0 text-danger" aria-label="negative" />}
                      <span className="italic">“{r.quote}”</span>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-xs text-muted">
                {check.communityReports} community food-safety report(s) here in the last 30 days · Findings come from public sources and may since have been resolved.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn py-2 text-sm" onClick={() => onReport(`Food safety at ${check.place?.name ?? name}: `)}>
                  <Megaphone className="size-4" aria-hidden /> Report an issue here
                </button>
                <a href={`tel:${check.helpline}`} className="btn py-2 text-sm">
                  <Phone className="size-4" aria-hidden /> FDA {check.helpline}
                </a>
              </div>
              {check.sources.length > 0 && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-medium">Sources ({check.sources.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {check.sources.map((s) => (
                      <li key={s.uri}>
                        <a className="underline" href={s.uri} target="_blank" rel="noopener noreferrer">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </motion.article>
        )}

        <section className="card-dark p-5" aria-labelledby="fda-title">
          <h3 id="fda-title" className="flex items-center gap-2 text-lg font-normal">
            <UtensilsCrossed className="size-5 text-sun" aria-hidden /> Recent FDA actions in Pune
          </h3>
          {!alerts ? (
            <p className="mt-3 text-sm text-white/70">Searching the latest Maharashtra FDA enforcement news…</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-white/70">{alerts.summary}</p>
              <ol className="mt-4 space-y-3">
                {alerts.actions.map((a, i) => (
                  <motion.li key={a.establishment + a.date} custom={i} variants={listItem} initial="hidden" animate="show" className="rounded-2xl bg-white/5 p-3">
                    <p className="text-[11px] tracking-wider text-sun uppercase">
                      {a.date} · {a.area}
                    </p>
                    <p className="font-medium">{a.establishment}</p>
                    <p className="text-sm text-white/80">
                      {a.action}: {a.reason}
                    </p>
                  </motion.li>
                ))}
              </ol>
              {alerts.sources.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                  {alerts.sources.slice(0, 4).map((s) => (
                    <li key={s.uri}>
                      <a href={s.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-white/80 hover:bg-white/20">
                        {s.title.slice(0, 32)} <ExternalLink className="size-3" aria-hidden />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

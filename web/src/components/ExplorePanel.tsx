import { BadgeCheck, Clock, ExternalLink, Landmark, Search, ShieldAlert, Sparkles, Star, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { ExploreResult, LatLng } from '../lib/types';
import { ErrorNote, listItem, ScoreBadge, SectionTitle, Spinner } from './ui';

const SUGGESTIONS = {
  explore: ['Cheap misal pav near FC Road open now', 'Budget hotel near Pune station under ₹2000', 'Quiet cafés in Koregaon Park to work from'],
  heritage: ['Peshwa-era history around Shaniwar Wada', 'A heritage walk through the old peths', 'Forts near Pune for a day trip'],
};

interface Props {
  location?: LatLng;
  onResult: (r: ExploreResult) => void;
}

export function ExplorePanel({ location, onResult }: Props) {
  const [mode, setMode] = useState<'explore' | 'heritage'>('explore');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function run(q: string) {
    if (q.trim().length < 2) return;
    setQuery(q);
    setLoading(true);
    setError('');
    try {
      const r = await api.explore(q, mode, location);
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
    void run(query);
  };

  return (
    <div>
      <SectionTitle kicker="Explore · History & Culture" title="Discover Pune, grounded in Google Maps">
        Every place is checked against Google Places and gets a live area-safety score.
      </SectionTitle>

      <div className="mb-3 inline-flex rounded-full border border-ink/10 bg-white p-1" role="radiogroup" aria-label="Explore mode">
        {(['explore', 'heritage'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold ${mode === m ? 'bg-ink text-white' : ''}`}
          >
            {m === 'explore' ? <Sparkles className="size-4" aria-hidden /> : <Landmark className="size-4" aria-hidden />}
            {m === 'explore' ? 'Food, stays & fun' : 'Heritage stories'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="explore-q" className="sr-only">
          What are you looking for?
        </label>
        <input id="explore-q" className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. vada pav under ₹50 near Swargate" maxLength={300} />
        <button className="btn bg-ink text-white" disabled={loading || query.trim().length < 2}>
          <Search className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Ask</span>
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS[mode].map((s) => (
          <button key={s} type="button" className="chip hover:bg-cream" onClick={() => void run(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3" aria-live="polite">
        {loading && <Spinner label="Gemini is searching Google Maps…" />}
        {error && <ErrorNote message={error} />}
        {result && !loading && (
          <>
            <p className="card bg-cream p-3 text-sm font-medium">{result.summary}</p>

            {result.heritage && (
              <motion.article initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-4">
                <h3 className="mb-2 flex items-center gap-2 text-lg font-bold">
                  <Landmark className="size-5 text-danger" aria-hidden /> The story
                </h3>
                <p className="text-sm leading-relaxed">{result.heritage.story}</p>
                {result.heritage.traditions.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {result.heritage.traditions.map((t) => (
                      <li key={t} className="chip bg-sun">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.article>
            )}

            <ol className="space-y-3">
              {result.places.map((p, i) => (
                <motion.li key={`${p.name}-${i}`} custom={i} variants={listItem} initial="hidden" animate="show" className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-ink/10 bg-ink font-bold text-white" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="flex flex-wrap items-center gap-2 font-bold">
                        {p.name}
                        {p.verified && (
                          <span className="chip bg-ok text-white" title="Confirmed on Google Places">
                            <BadgeCheck className="size-3.5" aria-hidden /> Verified place
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-muted">
                        {p.category}
                        {p.place?.rating !== undefined && (
                          <>
                            {' · '}
                            <Star className="inline size-3 fill-sun" aria-hidden /> {p.place.rating} ({p.place.ratingCount ?? 0} reviews)
                          </>
                        )}
                      </p>
                      <p className="mt-2 text-sm">{p.why}</p>
                      <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
                        <div className="flex gap-1.5">
                          <Wallet className="size-3.5 shrink-0" aria-hidden />
                          <dt className="sr-only">Budget</dt>
                          <dd>{p.budget}</dd>
                        </div>
                        <div className="flex gap-1.5">
                          <Clock className="size-3.5 shrink-0" aria-hidden />
                          <dt className="sr-only">Best time</dt>
                          <dd>{p.bestTime}</dd>
                        </div>
                        <div className="flex gap-1.5 sm:col-span-2">
                          <ShieldAlert className="size-3.5 shrink-0 text-danger" aria-hidden />
                          <dt className="sr-only">Safety note</dt>
                          <dd>
                            {p.safetyNote}
                            {p.area && p.area.blackspots.length > 0 && ` · Near black spot: ${p.area.blackspots.join(', ')}`}
                          </dd>
                        </div>
                      </dl>
                      {p.place?.mapsUri && (
                        <a href={p.place.mapsUri} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-ink underline">
                          Open in Google Maps <ExternalLink className="size-3" aria-hidden />
                          <span className="sr-only">(opens in new tab)</span>
                        </a>
                      )}
                    </div>
                    {p.area && <ScoreBadge score={p.area.score} label="Area safety" size={52} />}
                  </div>
                </motion.li>
              ))}
            </ol>

            {result.tips.length > 0 && (
              <div className="card p-3">
                <h3 className="mb-1 text-sm font-bold">Local tips</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {result.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.sources.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer font-semibold">Grounding sources ({result.sources.length})</summary>
                <ul className="mt-2 space-y-1">
                  {result.sources.map((s) => (
                    <li key={s.uri}>
                      <a href={s.uri} target="_blank" rel="noopener noreferrer" className="underline">
                        {s.kind === 'maps' ? '📍' : '🔎'} {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

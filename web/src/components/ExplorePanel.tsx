import { BadgeCheck, Clock, ExternalLink, Landmark, Search, ShieldAlert, Sparkles, Star, Wallet } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import type { ExploreResult, LatLng } from '../lib/types';
import { BestTime } from './BestTime';
import { ErrorNote, listItem, PlacePhoto, ScoreBadge, SectionTitle, Spinner } from './ui';

const SUGGESTIONS = {
  explore: ['Cheap misal pav near FC Road open now', 'Budget hotel near Pune station under ₹2000', 'Quiet cafés in Koregaon Park to work from'],
  heritage: ['Peshwa-era history around Shaniwar Wada', 'A heritage walk through the old peths', 'Forts near Pune for a day trip'],
};

interface Props {
  location?: LatLng;
  onResult: (r: ExploreResult) => void;
}

export function ExplorePanel({ location, onResult }: Props) {
  const { t } = usePrefs();
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

  // Deep link from the landing gallery: /app?tab=explore&mode=heritage&q=Shaniwar%20Wada
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (!q) return;
    const m = params.get('mode') === 'heritage' ? 'heritage' : 'explore';
    setMode(m);
    setQuery(q);
    setLoading(true);
    api
      .explore(q.slice(0, 300), m, location)
      .then((r) => {
        setResult(r);
        onResult(r);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
    window.history.replaceState(null, '', '/app');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(query);
  };

  return (
    <div>
      <SectionTitle kicker={t('explore.kicker')} title={t('explore.title')}>
        {t('explore.sub')}
      </SectionTitle>

      <div className="mb-3 inline-flex rounded-full border border-ink/10 bg-surface p-1" role="radiogroup" aria-label="Explore mode">
        {(['explore', 'heritage'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-sm font-semibold ${mode === m ? 'bg-primary text-on-primary' : ''}`}
          >
            {m === 'explore' ? <Sparkles className="size-4" aria-hidden /> : <Landmark className="size-4" aria-hidden />}
            {m === 'explore' ? t('explore.modeFood') : t('explore.modeHeritage')}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="explore-q" className="sr-only">
          What are you looking for?
        </label>
        <input id="explore-q" className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('explore.placeholder')} maxLength={300} />
        <button className="btn btn-primary " disabled={loading || query.trim().length < 2}>
          <Search className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t('explore.ask')}</span>
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
        {loading && <Spinner label={t('explore.loading')} />}
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
                    {result.heritage.traditions.map((tr) => (
                      <li key={tr} className="chip bg-sun text-[#1f1f1f]">
                        {tr}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.article>
            )}

            <ol className="space-y-3">
              {result.places.map((p, i) => (
                <motion.li key={`${p.name}-${i}`} custom={i} variants={listItem} initial="hidden" animate="show" className="card overflow-hidden">
                  <PlacePhoto src={p.photoUri} alt={p.name} attribution={(p.place as { photoAttribution?: string } | null)?.photoAttribution} className="h-44" />
                  <div className="flex items-start gap-3 p-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sun font-bold text-[#1f1f1f]" aria-hidden>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="flex flex-wrap items-center gap-2 font-bold">
                        {p.name}
                        {p.verified && (
                          <span className="chip bg-ok text-on-primary" title="Confirmed on Google Places">
                            <BadgeCheck className="size-3.5" aria-hidden /> {t('common.verifiedPlace')}
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
                      {p.place?.id && <BestTime placeId={p.place.id} name={p.name} />}
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

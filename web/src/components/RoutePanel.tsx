import { ArrowRightLeft, Bike, Car, Footprints, Moon, Navigation, ShieldCheck, Sun, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import { formatHour, km, minutes } from '../lib/format';
import type { RouteResult, RouteTag } from '../lib/types';
import { ErrorNote, listItem, ScoreBadge, SectionTitle, Spinner } from './ui';

const MODES = [
  { id: 'TWO_WHEELER', label: 'Two-wheeler', Icon: Bike },
  { id: 'DRIVE', label: 'Car', Icon: Car },
  { id: 'WALK', label: 'Walk', Icon: Footprints },
] as const;

const TAG_STYLE: Record<RouteTag, { label: string; className: string; Icon: typeof Zap }> = {
  safest: { label: 'Safest', className: 'bg-ok text-on-primary', Icon: ShieldCheck },
  fastest: { label: 'Fastest', className: 'bg-primary text-on-primary', Icon: Zap },
  balanced: { label: 'Balanced', className: 'bg-sun text-ink', Icon: ArrowRightLeft },
};

interface Props {
  selectedId?: string;
  onResult: (r: RouteResult) => void;
  onSelect: (id: string) => void;
}

export function RoutePanel({ selectedId, onResult, onSelect }: Props) {
  const { t } = usePrefs();
  const [origin, setOrigin] = useState('Swargate, Pune');
  const [destination, setDestination] = useState('Warje, Pune');
  const [mode, setMode] = useState<string>('TWO_WHEELER');
  const [when, setWhen] = useState<'now' | 'night'>('now');
  const [result, setResult] = useState<RouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await api.route(origin, destination, mode, when === 'night' ? 22 : undefined);
      setResult(r);
      onResult(r);
      const safest = r.routes.find((x) => x.tags.includes('safest'));
      if (safest) onSelect(safest.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionTitle kicker={t('route.kicker')} title={t('route.title')}>
        {t('route.sub')}
      </SectionTitle>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label htmlFor="r-from" className="mb-1 block text-sm font-semibold">
            {t('route.from')}
          </label>
          <input id="r-from" className="field" value={origin} onChange={(e) => setOrigin(e.target.value)} required minLength={2} maxLength={200} />
        </div>
        <div>
          <label htmlFor="r-to" className="mb-1 block text-sm font-semibold">
            {t('route.to')}
          </label>
          <input id="r-to" className="field" value={destination} onChange={(e) => setDestination(e.target.value)} required minLength={2} maxLength={200} />
        </div>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-sm font-semibold">{t('route.by')}</legend>
          {MODES.map(({ id, label, Icon }) => (
            <label key={id} className={`chip cursor-pointer px-3 py-1.5 has-[:focus-visible]:outline-3 ${mode === id ? 'bg-primary text-on-primary' : ''}`}>
              <input type="radio" name="mode" value={id} checked={mode === id} onChange={() => setMode(id)} className="sr-only" />
              <Icon className="size-4" aria-hidden /> {label}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-sm font-semibold">{t('route.when')}</legend>
          {(
            [
              ['now', t('route.now'), Sun],
              ['night', t('route.night'), Moon],
            ] as const
          ).map(([id, label, Icon]) => (
            <label key={id} className={`chip cursor-pointer px-3 py-1.5 has-[:focus-visible]:outline-3 ${when === id ? 'bg-primary text-on-primary' : ''}`}>
              <input type="radio" name="when" value={id} checked={when === id} onChange={() => setWhen(id)} className="sr-only" />
              <Icon className="size-4" aria-hidden /> {label}
            </label>
          ))}
        </fieldset>

        <button className="btn btn-primary w-full " disabled={loading}>
          <Navigation className="size-4" aria-hidden /> {t('route.go')}
        </button>
      </form>

      <div className="mt-5 space-y-3" aria-live="polite">
        {loading && <Spinner label={t('route.loading')} />}
        {error && <ErrorNote message={error} />}
        {result && !loading && (
          <>
            {result.explanation && (
              <div className="card bg-cream p-4">
                <p className="font-display text-lg font-bold">{result.explanation.headline}</p>
                <p className="mt-1 text-sm">{result.explanation.recommendation}</p>
                {result.explanation.precautions.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {result.explanation.precautions.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <p className="text-xs text-muted">
              Scored for {formatHour(result.hour)} IST · {result.weather ? `${result.weather.condition}${result.weather.isRaining ? ' (rain penalty applied)' : ''}` : 'weather unavailable'}
            </p>

            <ul className="space-y-3" aria-label="Route options">
              {result.routes.map((r, i) => {
                const selected = r.id === selectedId;
                return (
                  <motion.li key={r.id} custom={i} variants={listItem} initial="hidden" animate="show">
                    <button
                      type="button"
                      onClick={() => onSelect(r.id)}
                      aria-pressed={selected}
                      className={`card w-full p-4 text-left transition-transform ${selected ? '-translate-x-0.5 -translate-y-0.5 shadow-lift ring-2 ring-sun' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <ScoreBadge score={r.safetyScore} label="Route safety" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-1.5">
                            {r.tags.map((t) => {
                              const s = TAG_STYLE[t];
                              return (
                                <span key={t} className={`chip ${s.className}`}>
                                  <s.Icon className="size-3.5" aria-hidden /> {s.label}
                                </span>
                              );
                            })}
                          </div>
                          <p className="mt-1 font-bold">via {r.description || `route ${i + 1}`}</p>
                          <p className="font-mono text-sm">
                            {minutes(r.durationSec)} · {km(r.distanceM)}
                          </p>
                          {r.factors.length > 0 ? (
                            <ul className="mt-2 space-y-0.5 text-xs">
                              {r.factors.map((f) => (
                                <li key={f.label} className="flex justify-between gap-2">
                                  <span>{f.label}</span>
                                  <span className="font-mono text-danger">−{Math.round(f.points * 1.6)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-ok">No known risks on this route.</p>
                          )}
                        </div>
                      </div>
                    </button>
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

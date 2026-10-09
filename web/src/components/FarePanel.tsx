import { Moon, Navigation, Phone, ShieldAlert, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { googleMapsRouteUrl } from '../lib/navigate';
import { usePrefs } from '../lib/prefs';
import type { FareResult, FareVerdict } from '../lib/types';
import { ErrorNote, SectionTitle, Spinner } from './ui';

const VERDICT_STYLE: Record<FareVerdict, string> = {
  fair: 'bg-ok text-on-primary',
  slightly_high: 'bg-sun text-[#1f1f1f]',
  overcharging: 'bg-danger text-on-primary',
  below_meter: 'bg-surface text-ink',
};

/** What to actually say to the driver, in the languages Pune autos speak. */
const phrases = (meter: number) => [
  { lang: 'मराठी', text: `दादा, मीटरने चला. मीटरप्रमाणे ₹${meter} होतात.` },
  { lang: 'हिंदी', text: `भैया, मीटर से चलिए। मीटर के हिसाब से ₹${meter} बनते हैं।` },
  { lang: 'English', text: `Please go by the meter. The RTO fare for this trip is ₹${meter}.` },
];

export function FarePanel({ onResult }: { onResult: (r: FareResult) => void }) {
  const { t } = usePrefs();
  const [origin, setOrigin] = useState('Pune Railway Station');
  const [destination, setDestination] = useState('Koregaon Park, Pune');
  const [quoted, setQuoted] = useState('');
  const [luggage, setLuggage] = useState(0);
  const [night, setNight] = useState(false);
  const [result, setResult] = useState<FareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const q = Number.parseInt(quoted, 10);
      const r = await api.fare(origin, destination, Number.isFinite(q) && q > 0 ? q : undefined, luggage, night ? 1 : undefined);
      setResult(r);
      onResult(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const f = result?.fare;

  return (
    <div>
      <SectionTitle kicker={t('fare.kicker')} title={t('fare.title')}>
        {t('fare.sub')}
      </SectionTitle>

      <form onSubmit={submit} className="space-y-3">
        <label className="block text-sm font-medium">
          {t('route.from')}
          <input className="field mt-1" value={origin} onChange={(e) => setOrigin(e.target.value)} required minLength={2} maxLength={200} />
        </label>
        <label className="block text-sm font-medium">
          {t('route.to')}
          <input className="field mt-1" value={destination} onChange={(e) => setDestination(e.target.value)} required minLength={2} maxLength={200} />
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="text-sm font-medium">
            {t('fare.quoted')}
            <input className="field mt-1" inputMode="numeric" placeholder="₹" value={quoted} onChange={(e) => setQuoted(e.target.value.replace(/\D/g, '').slice(0, 5))} />
          </label>
          <label className="text-sm font-medium">
            {t('fare.luggage')}
            <select className="field mt-1" value={luggage} onChange={(e) => setLuggage(Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1 text-sm font-medium">{t('route.when')}</legend>
          {(
            [
              [false, t('route.now'), Sun],
              [true, '1:00 AM (+25%)', Moon],
            ] as const
          ).map(([isNight, label, Icon]) => (
            <label key={label} className={`chip cursor-pointer px-3 py-1.5 has-[:focus-visible]:outline-3 ${night === isNight ? 'bg-primary text-on-primary' : ''}`}>
              <input type="radio" name="fare-when" checked={night === isNight} onChange={() => setNight(isNight)} className="sr-only" />
              <Icon className="size-4" aria-hidden /> {label}
            </label>
          ))}
        </fieldset>
        <button className="btn btn-primary w-full" disabled={loading}>
          🛺 {t('fare.go')}
        </button>
      </form>

      <div className="mt-6 space-y-4" aria-live="polite">
        {loading && <Spinner label="Google Routes + RTO tariff…" />}
        {error && <ErrorNote message={error} />}
        {f && result && !loading && (
          <>
            {f.verdict && (
              <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`rounded-[24px] p-5 shadow-lift ${VERDICT_STYLE[f.verdict]}`}>
                <p className="text-sm font-medium opacity-90">
                  ₹{f.quoted} {f.differencePct !== undefined && `(${f.differencePct > 0 ? '+' : ''}${f.differencePct}%)`}
                </p>
                <p className="text-3xl font-light">{t(`fare.${f.verdict}`)}</p>
              </motion.div>
            )}

            <section className="card p-5">
              <p className="text-sm text-muted">{t('fare.meter')}</p>
              <p className="text-6xl font-light tracking-tight">₹{f.total}</p>
              <p className="mt-1 text-xs text-muted">
                {f.distanceKm} km · {Math.round(result.route.durationSec / 60)} min {result.route.description && `· via ${result.route.description}`}
              </p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt>First 1.5 km</dt>
                  <dd className="font-mono">₹{f.base}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{Math.max(0, f.distanceKm - 1.5).toFixed(1)} km × ₹20</dt>
                  <dd className="font-mono">₹{f.distanceCharge}</dd>
                </div>
                {f.nightCharge > 0 && (
                  <div className="flex justify-between">
                    <dt>Night surcharge (25%)</dt>
                    <dd className="font-mono">₹{f.nightCharge}</dd>
                  </div>
                )}
                {f.luggageCharge > 0 && (
                  <div className="flex justify-between">
                    <dt>Luggage</dt>
                    <dd className="font-mono">₹{f.luggageCharge}</dd>
                  </div>
                )}
              </dl>
              {googleMapsRouteUrl(result.route.path) && (
                <a href={googleMapsRouteUrl(result.route.path)!} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-4 w-full">
                  <Navigation className="size-4" aria-hidden /> Open this route in Google Maps
                </a>
              )}
            </section>

            <section className="card-dark p-5">
              <h3 className="text-sm text-white/70">{t('fare.say')}</h3>
              <ul className="mt-3 space-y-3">
                {phrases(f.total).map((p) => (
                  <li key={p.lang}>
                    <p className="text-[11px] tracking-widest text-sun uppercase">{p.lang}</p>
                    <p lang={p.lang === 'English' ? 'en' : p.lang === 'हिंदी' ? 'hi' : 'mr'} className="text-lg">
                      {p.text}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 text-xs text-white/70">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden /> Note the auto’s number plate before you ride. If a driver threatens or harasses you, call
                <a href="tel:112" className="inline-flex items-center gap-1 font-semibold text-sun underline">
                  <Phone className="size-3" aria-hidden /> 112
                </a>
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

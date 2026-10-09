import { Activity, CloudRain, Megaphone, Wind } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import type { Pulse } from '../lib/types';
import { weatherMood } from '../lib/weatherMood';

const istHour = () => Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date()));

/** "Pune today": a living weather card with a Pune-flavoured quip, an AQI dial and the Search-grounded briefing. */
export function PulseBar() {
  const { t, lang } = usePrefs();
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    let alive = true;
    let retries = 0;
    // The briefing is generated in the background on a cold server: poll a few times until it lands.
    const load = (): Promise<unknown> =>
      api
        .pulse()
        .then((p) => {
          if (!alive) return;
          setPulse(p);
          if (!p.briefing && retries++ < 4) window.setTimeout(load, 5000);
        })
        .catch(() => undefined);
    void load();
    const id = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [lang]);

  const mood = weatherMood(pulse, istHour());
  const w = pulse?.weather;
  const aqi = pulse?.air?.aqi ?? null;
  const alerts = pulse?.briefing?.alerts ?? [];

  return (
    <section aria-label="Live city pulse for Pune" className="grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(0,0.6fr)_minmax(0,1.4fr)]">
      {/* Weather + quip */}
      <div className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${mood.sky} p-5 shadow-lift ${mood.onDark ? 'text-white' : 'text-[#1f1f1f]'}`}>
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -top-5 -right-3 text-[6.5rem] leading-none select-none"
          animate={{ y: [0, -6, 0], rotate: [0, 4, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {mood.emoji}
        </motion.span>
        <p className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase opacity-80">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-current" />
          </span>
          {t('pulse.live')}
        </p>
        <div className="mt-2 flex items-end gap-3">
          <p className="text-6xl leading-none font-light tracking-tight">{w?.tempC != null ? `${Math.round(w.tempC)}°` : '—'}</p>
          <div className="pb-1 text-sm">
            <p className="font-medium">{w?.condition ?? '…'}</p>
            <p className="flex items-center gap-1 opacity-75">
              <CloudRain className="size-3.5" aria-hidden /> {w?.rainChance ?? 0}% rain
            </p>
          </div>
        </div>
        <p className="relative mt-3 max-w-[38ch] font-serif text-xl leading-snug italic">“{mood.quip}”</p>
        <p className={`relative mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${mood.onDark ? 'bg-white/15' : 'bg-white/65'}`}>💡 {mood.tip}</p>
      </div>

      {/* AQI dial */}
      <div className="panel flex flex-col items-center justify-center p-4 text-center">
        <p className="flex items-center gap-1 text-xs font-semibold tracking-widest text-muted uppercase">
          <Wind className="size-3.5" aria-hidden /> Air
        </p>
        <div className="relative mt-2 grid size-24 place-items-center" role="img" aria-label={aqi !== null ? `Air quality index ${aqi}, ${pulse?.air?.category}` : 'Air quality loading'}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-ink)" strokeOpacity="0.12" strokeWidth="10" />
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={pulse?.air?.color ?? 'var(--color-sun)'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - (aqi ?? 0) / 100) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
          <span className="text-3xl font-light">{aqi ?? '—'}</span>
        </div>
        <p className="mt-2 text-xs leading-tight">{pulse?.air?.category ?? '…'}</p>
        <p className="text-[11px] text-muted">Universal AQI · higher is cleaner</p>
      </div>

      {/* Briefing + alerts */}
      <div className="panel flex min-w-0 flex-col justify-center gap-3 p-5">
        <p className="flex items-start gap-2 text-sm leading-relaxed">
          <Activity className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{pulse?.briefing?.briefing ?? t('pulse.loadingBriefing')}</span>
        </p>
        {alerts.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {alerts.map((a) => (
              <li key={a.title} className={`pill-stat max-w-full border py-1.5 text-xs ${a.level === 'danger' ? 'border-danger bg-danger text-on-primary' : a.level === 'warning' ? 'border-transparent bg-sun text-[#1f1f1f]' : 'border-ink/15'}`}>
                <Megaphone className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate" title={a.title}>
                  {a.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

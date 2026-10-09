import { Activity, Megaphone, Thermometer, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Pulse } from '../lib/types';

const ALERT_STYLE = { info: 'bg-white', warning: 'bg-gyellow', danger: 'bg-gred-ink text-white' } as const;

export function PulseBar() {
  const [pulse, setPulse] = useState<Pulse | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => api.pulse().then((p) => alive && setPulse(p)).catch(() => undefined);
    load();
    const id = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section aria-label="Live city pulse for Pune" className="card flex flex-col gap-3 p-3 md:flex-row md:items-center">
      <div className="flex shrink-0 items-center gap-2">
        <span className="relative flex size-3" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gred opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-gred" />
        </span>
        <span className="font-display text-sm font-bold tracking-wide uppercase">Pune live</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="chip">
          <Thermometer className="size-3.5" aria-hidden />
          {pulse?.weather?.tempC != null ? `${Math.round(pulse.weather.tempC)}°C · ${pulse.weather.condition}` : 'Weather…'}
        </span>
        <span className="chip">
          <Wind className="size-3.5" aria-hidden />
          {pulse?.air?.aqi != null ? (
            <>
              <span className="inline-block size-2.5 rounded-full border border-ink" style={{ background: pulse.air.color }} aria-hidden />
              AQI {pulse.air.aqi} · {pulse.air.category}
            </>
          ) : (
            'Air quality…'
          )}
        </span>
        {pulse?.briefing?.alerts.map((a) => (
          <span key={a.title} className={`chip ${ALERT_STYLE[a.level]}`}>
            <Megaphone className="size-3.5" aria-hidden />
            <span className="max-w-[28ch] truncate" title={a.title}>
              {a.title}
            </span>
          </span>
        ))}
      </div>

      <p className="flex min-w-0 items-start gap-2 text-sm text-muted md:ml-auto md:max-w-[52ch]">
        <Activity className="mt-0.5 size-4 shrink-0 text-gblue-ink" aria-hidden />
        <span>{pulse?.briefing?.briefing ?? 'Fetching today’s city briefing from Google Search…'}</span>
      </p>
    </section>
  );
}

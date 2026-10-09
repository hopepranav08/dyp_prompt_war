import { Activity, Megaphone, Thermometer, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Pulse } from '../lib/types';

/** Live strip in the reference's stat-pill style: charcoal, sunflower, hatched and outline pills. */
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

  const alerts = pulse?.briefing?.alerts ?? [];

  return (
    <section aria-label="Live city pulse for Pune" className="panel flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill-stat bg-charcoal text-white">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-sun" />
          </span>
          Pune live
        </span>
        <span className="pill-stat bg-sun">
          <Thermometer className="size-4" aria-hidden />
          {pulse?.weather?.tempC != null ? `${Math.round(pulse.weather.tempC)}°C · ${pulse.weather.condition}` : 'Weather…'}
        </span>
        <span className="pill-stat hatch">
          <Wind className="size-4" aria-hidden />
          {pulse?.air?.aqi != null ? `AQI ${pulse.air.aqi} · ${pulse.air.category}` : 'Air quality…'}
        </span>
        {alerts.map((a) => (
          <span key={a.title} className={`pill-stat border ${a.level === 'danger' ? 'border-danger bg-danger text-white' : 'border-ink/70'}`}>
            <Megaphone className="size-4 shrink-0" aria-hidden />
            <span className="max-w-[30ch] truncate" title={a.title}>
              {a.title}
            </span>
          </span>
        ))}
      </div>

      <p className="flex min-w-0 items-start gap-2 text-sm leading-relaxed text-muted md:ml-auto md:max-w-[56ch]">
        <Activity className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
        <span>{pulse?.briefing?.briefing ?? 'Fetching today’s city briefing from Google Search…'}</span>
      </p>
    </section>
  );
}

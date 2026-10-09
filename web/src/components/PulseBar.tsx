import { Activity, Megaphone, Thermometer, Wind } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import type { Pulse } from '../lib/types';

/** Live strip in the reference's stat-pill style: charcoal, sunflower, hatched and outline pills. */
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

  const alerts = pulse?.briefing?.alerts ?? [];

  return (
    <section aria-label="Live city pulse for Pune" className="panel flex flex-col gap-4 p-4 md:flex-row md:items-center md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="pill-stat bg-charcoal text-white ring-1 ring-white/10">
          <span className="relative flex size-2.5" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sun opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-sun" />
          </span>
          {t('pulse.live')}
        </span>
        <span className="pill-stat bg-sun text-[#1f1f1f]">
          <Thermometer className="size-4" aria-hidden />
          {pulse?.weather?.tempC != null ? `${Math.round(pulse.weather.tempC)}°C · ${pulse.weather.condition}` : 'Weather…'}
        </span>
        <span className="pill-stat hatch">
          <Wind className="size-4" aria-hidden />
          {pulse?.air?.aqi != null ? `AQI ${pulse.air.aqi} · ${pulse.air.category}` : 'Air quality…'}
        </span>
        {alerts.map((a) => (
          <span key={a.title} className={`pill-stat border ${a.level === 'danger' ? 'border-danger bg-danger text-on-primary' : 'border-ink/70'}`}>
            <Megaphone className="size-4 shrink-0" aria-hidden />
            <span className="max-w-[30ch] truncate" title={a.title}>
              {a.title}
            </span>
          </span>
        ))}
      </div>

      <p className="flex min-w-0 items-start gap-2 text-sm leading-relaxed text-muted md:ml-auto md:max-w-[56ch]">
        <Activity className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
        <span>{pulse?.briefing?.briefing ?? t('pulse.loadingBriefing')}</span>
      </p>
    </section>
  );
}

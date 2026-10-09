import { Clock3, CloudRain, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { api } from '../lib/api';
import type { BestTimeResult } from '../lib/types';
import { Spinner } from './ui';

const fmt = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

/** Expandable "best time to visit" chart: predicted traffic × review crowds × rain × opening hours. */
export function BestTime({ placeId, name }: { placeId: string; name: string }) {
  const [data, setData] = useState<BestTimeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await api.bestTime(placeId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!data && !loading) {
    return (
      <div>
        <button type="button" className="btn mt-3 py-2 text-sm" onClick={() => void load()}>
          <Clock3 className="size-4" aria-hidden /> Best time to visit
        </button>
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      </div>
    );
  }
  if (loading) return <Spinner label="Predicting traffic, crowds and rain for the next 12 hours…" />;
  if (!data) return null;

  const best = data.slots.find((s) => s.best);
  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-ink/5 p-3" aria-label={`Best time to visit ${name}`}>
      <p className="text-sm">
        {best ? (
          <>
            Best: <strong>{fmt(best.hour)}</strong> · score {best.score}/100
          </>
        ) : (
          'Closed for the rest of today'
        )}
      </p>
      <ol className="mt-3 grid grid-cols-6 items-end gap-1.5" aria-label="Score by departure time">
        {data.slots.map((s) => (
          <li key={s.hour} className="flex flex-col items-center gap-1 text-center">
            <span className="font-mono text-[11px]">{s.open === false ? 'shut' : s.score}</span>
            <div className="flex h-20 w-full items-end overflow-hidden rounded-lg bg-ink/5">
              <motion.div
                className={`w-full rounded-lg ${s.best ? 'bg-sun' : s.open === false ? 'bg-ink/15' : 'bg-ink/35'}`}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(4, s.score)}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
            <span className={`text-[11px] ${s.best ? 'font-bold' : 'text-muted'}`}>{fmt(s.hour)}</span>
            <span className="text-[10px] text-muted" title="Predicted drive from city centre">
              {s.travelMin !== null ? `${s.travelMin}m` : '–'}
            </span>
          </li>
        ))}
      </ol>
      {data.crowd && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          <li className="flex gap-1.5">
            <Users className="size-3.5 shrink-0" aria-hidden /> {data.crowd.peakNote} · {data.crowd.quietNote}
          </li>
          <li className="flex gap-1.5 italic">“{data.crowd.evidence}”</li>
        </ul>
      )}
      <p className="mt-2 flex gap-1.5 text-[11px] text-muted">
        <CloudRain className="size-3 shrink-0" aria-hidden /> {data.model}
      </p>
    </motion.section>
  );
}

import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { scoreTone } from '../lib/format';

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-6 font-display font-semibold">
      <Loader2 className="size-5 animate-spin text-gblue-ink" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="card flex items-start gap-2 bg-[#fde8e6] p-3 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gred-ink" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

/** Compact circular 0–100 score with a text label for screen readers. */
export function ScoreBadge({ score, label, size = 56 }: { score: number; label: string; size?: number }) {
  const tone = scoreTone(score);
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score} out of 100, ${tone.label}`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="white" stroke="var(--color-ink)" strokeWidth={2} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          className={tone.bg.replace('bg-', 'stroke-')}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (score / 100) * c }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-sm font-bold">{score}</span>
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone = scoreTone(value);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-white" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
        <motion.div className={`h-full ${tone.bg}`} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-4">
      <p className="font-mono text-xs font-bold tracking-widest text-gblue-ink uppercase">{kicker}</p>
      <h2 className="text-2xl font-bold">{title}</h2>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
    </header>
  );
}

export const listItem = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.3 } }),
};

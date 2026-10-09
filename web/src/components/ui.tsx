import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { ReactNode } from 'react';
import { scoreTone } from '../lib/format';

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 py-6 font-medium">
      <span className="grid size-9 place-items-center rounded-full bg-sun">
        <Loader2 className="size-4 animate-spin" aria-hidden />
      </span>
      <span>{label}</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="card flex items-start gap-2 bg-error-bg p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

const ARC_LENGTH = Math.PI * 40;

/**
 * Semicircle gauge (sunflower value arc + charcoal remainder), used for every 0–100 score.
 * Exposed to assistive tech as an image with a full text label.
 */
export function ScoreBadge({ score, label, size = 72, dark = false }: { score: number; label: string; size?: number; dark?: boolean }) {
  const tone = scoreTone(score);
  const value = (Math.max(0, Math.min(100, score)) / 100) * ARC_LENGTH;
  const gap = score > 0 && score < 100 ? 7 : 0;
  return (
    <div className="relative shrink-0" style={{ width: size }} role="img" aria-label={`${label}: ${score} out of 100, ${tone.label}`}>
      <svg viewBox="0 0 100 58" width={size} aria-hidden>
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={dark ? '#5a5a5a' : 'var(--color-track)'}
          strokeWidth={11}
          strokeLinecap="round"
          strokeDasharray={`0 ${value + gap} ${ARC_LENGTH}`}
        />
        <motion.path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="var(--color-sun)"
          strokeWidth={11}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: score / 100 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute inset-x-0 bottom-0 text-center leading-none font-medium" style={{ fontSize: size * 0.26 }}>
        {score}
      </span>
    </div>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-medium">
        <span className="text-muted">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-ink/8" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label={label}>
        <motion.div
          className={`h-full rounded-full ${value >= 70 ? 'bg-ink' : value >= 45 ? 'bg-sun' : 'bg-danger'}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function SectionTitle({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      <p className="kicker">{kicker}</p>
      <h2 className="mt-3 text-3xl font-light tracking-tight md:text-4xl">{title}</h2>
      {children && <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>}
    </header>
  );
}

export const listItem = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.35 } }),
};

/** Google Places photo with lazy loading, a soft fade-in, a graceful fallback and the required attribution. */
export function PlacePhoto({ src, alt, attribution, className = '' }: { src?: string | null; alt: string; attribution?: string; className?: string }) {
  return (
    <figure className={`relative overflow-hidden bg-gradient-to-br from-sun-soft via-cream to-mist ${className}`}>
      {src && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-0 transition-opacity duration-500"
          onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
          onError={(e) => e.currentTarget.remove()}
        />
      )}
      {attribution && <figcaption className="absolute right-2 bottom-1.5 max-w-[80%] truncate rounded-full bg-black/45 px-2 py-0.5 text-[11px] text-white/90">📷 {attribution}</figcaption>}
    </figure>
  );
}

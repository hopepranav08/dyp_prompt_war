export const minutes = (sec: number) => `${Math.round(sec / 60)} min`;
export const km = (m: number) => `${(m / 1000).toFixed(1)} km`;

/** Score band shared by every 0–100 score in the UI so colours always mean the same thing. */
export function scoreTone(score: number): { label: string; bg: string; text: string } {
  if (score >= 70) return { label: 'Good', bg: 'bg-ok', text: 'text-ok' };
  if (score >= 45) return { label: 'Caution', bg: 'bg-sun', text: 'text-ink' };
  return { label: 'Risky', bg: 'bg-danger', text: 'text-danger' };
}

export const STATUS_STYLE = {
  verified: { label: 'Verified', className: 'bg-ok text-on-primary' },
  corroborated: { label: 'Corroborated', className: 'bg-sun text-ink' },
  unverified: { label: 'Unverified', className: 'bg-white text-ink' },
} as const;

export const prettyCategory = (c: string) => c.replaceAll('_', ' ').replace(/^\w/, (m) => m.toUpperCase());

export const formatHour = (h: number) => `${((h + 11) % 12) + 1}:00 ${h < 12 ? 'AM' : 'PM'}`;

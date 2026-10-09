/**
 * Best-time-to-visit model. Each candidate hour blends three predicted signals:
 *  - travel time from Google Routes' traffic-aware prediction for that departure time,
 *  - crowd level inferred by Gemini from real reviews and the place type,
 *  - rain probability from the Weather API hourly forecast,
 * and is zeroed when the place is closed (Places opening hours).
 */
export interface SlotInput {
  hour: number;
  travelMin: number | null;
  crowd: number;
  rainChance: number;
  open: boolean | null;
}

export interface ScoredSlot extends SlotInput {
  score: number;
  best: boolean;
}

export const WEIGHTS = { travel: 0.35, crowd: 0.4, rain: 0.25 } as const;

export function scoreSlots(slots: readonly SlotInput[]): ScoredSlot[] {
  const times = slots.map((s) => s.travelMin).filter((t): t is number => t !== null);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const travelScore = (t: number | null) => (t === null || times.length === 0 || max === min ? 1 : 1 - (t - min) / (max - min));

  const scored = slots.map((s) => {
    const raw = WEIGHTS.travel * travelScore(s.travelMin) + WEIGHTS.crowd * (1 - clamp(s.crowd) / 100) + WEIGHTS.rain * (1 - clamp(s.rainChance) / 100);
    return { ...s, score: s.open === false ? 0 : Math.round(raw * 100), best: false };
  });
  const top = scored.reduce<ScoredSlot | undefined>((a, b) => (b.score > (a?.score ?? -1) ? b : a), undefined);
  if (top && top.score > 0) top.best = true;
  return scored;
}

/** Places opening periods → open at (weekday 0=Sun, hour)? null when hours are unknown. */
export interface OpeningPeriod {
  open: { day: number; hour: number };
  close?: { day: number; hour: number };
}

export function isOpenAt(periods: readonly OpeningPeriod[] | undefined, day: number, hour: number): boolean | null {
  if (!periods || periods.length === 0) return null;
  // A single period with no close means open 24 hours.
  if (periods.some((p) => !p.close)) return true;
  const t = day * 24 + hour;
  return periods.some((p) => {
    const start = p.open.day * 24 + p.open.hour;
    let end = p.close!.day * 24 + p.close!.hour;
    if (end <= start) end += 7 * 24; // wraps past Saturday night
    return (t >= start && t < end) || (t + 7 * 24 >= start && t + 7 * 24 < end);
  });
}

const clamp = (n: number) => Math.min(100, Math.max(0, n));

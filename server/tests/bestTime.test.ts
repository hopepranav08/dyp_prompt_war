import { describe, expect, it } from 'vitest';
import { isOpenAt, scoreSlots } from '../src/services/bestTime.js';

describe('best-time model', () => {
  it('prefers short travel, low crowds and no rain', () => {
    const slots = scoreSlots([
      { hour: 10, travelMin: 20, crowd: 20, rainChance: 0, open: true },
      { hour: 18, travelMin: 45, crowd: 90, rainChance: 60, open: true },
    ]);
    expect(slots[0]).toMatchObject({ score: 92, best: true }); // 0.35·1 + 0.40·0.8 + 0.25·1
    expect(slots[1]!.score).toBeLessThan(20);
  });

  it('gives closed hours a zero score and never marks them best', () => {
    const slots = scoreSlots([
      { hour: 6, travelMin: 10, crowd: 0, rainChance: 0, open: false },
      { hour: 12, travelMin: 30, crowd: 60, rainChance: 10, open: true },
    ]);
    expect(slots[0]).toMatchObject({ score: 0, best: false });
    expect(slots[1]!.best).toBe(true);
  });

  it('handles unknown travel times', () => {
    expect(scoreSlots([{ hour: 9, travelMin: null, crowd: 50, rainChance: 50, open: null }])[0]!.score).toBe(68); // 0.35 + 0.20 + 0.125
  });
});

describe('opening hours', () => {
  const periods = [{ open: { day: 1, hour: 9 }, close: { day: 1, hour: 18 } }];

  it('reads open and closed hours', () => {
    expect(isOpenAt(periods, 1, 10)).toBe(true);
    expect(isOpenAt(periods, 1, 19)).toBe(false);
    expect(isOpenAt(periods, 2, 10)).toBe(false);
  });

  it('handles overnight, 24-hour and unknown schedules', () => {
    expect(isOpenAt([{ open: { day: 5, hour: 20 }, close: { day: 6, hour: 2 } }], 6, 1)).toBe(true);
    expect(isOpenAt([{ open: { day: 0, hour: 0 } }], 3, 3)).toBe(true);
    expect(isOpenAt(undefined, 1, 10)).toBeNull();
  });
});

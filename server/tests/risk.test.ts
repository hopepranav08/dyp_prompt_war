import { describe, expect, it } from 'vitest';
import type { BlackSpot } from '../src/data/blackspots.js';
import { isNight, rankRoutes, scoreRoute, type RouteCandidate } from '../src/services/risk.js';
import type { StoredReport } from '../src/services/reportStore.js';

const SPOT: BlackSpot = { id: 's', name: 'Test Bridge', lat: 18.5, lng: 73.85, severity: 3, note: '' };

const through: RouteCandidate = {
  id: 'through',
  durationSec: 600,
  distanceM: 5000,
  path: [
    { lat: 18.5, lng: 73.8 },
    { lat: 18.5, lng: 73.9 },
  ],
};
const around: RouteCandidate = {
  id: 'around',
  durationSec: 780,
  distanceM: 6500,
  path: [
    { lat: 18.53, lng: 73.8 },
    { lat: 18.53, lng: 73.9 },
  ],
};

const report = (over: Partial<StoredReport> = {}): StoredReport => ({
  id: 'r1',
  title: 'Waterlogging',
  category: 'waterlogging',
  severity: 4,
  summary: '',
  location: { lat: 18.53, lng: 73.85 },
  status: 'verified',
  trustScore: 80,
  signals: [],
  actions: [],
  authority: '',
  language: 'English',
  hasPhoto: true,
  hasVoice: false,
  createdAt: 0,
  ...over,
});

const base = { hour: 12, isRaining: false, reports: [], blackspots: [SPOT] };

describe('route risk engine', () => {
  it('detects a black spot on the route and explains it', () => {
    const r = scoreRoute(through, base);
    expect(r.factors).toEqual([expect.objectContaining({ kind: 'blackspot', label: 'Accident black spot: Test Bridge', points: 18 })]);
    expect(r.safetyScore).toBe(71);
  });

  it('gives a clean route a perfect score in the daytime', () => {
    expect(scoreRoute(around, base).safetyScore).toBe(100);
  });

  it('adds night and rain penalties', () => {
    const day = scoreRoute(through, base);
    const nightRain = scoreRoute(through, { ...base, hour: 23, isRaining: true });
    expect(nightRain.riskPoints).toBeGreaterThan(day.riskPoints);
    expect(nightRain.factors.map((f) => f.kind)).toEqual(['blackspot', 'night', 'weather']);
  });

  it('counts trusted reports but ignores low-trust unverified ones', () => {
    expect(scoreRoute(around, { ...base, reports: [report()] }).factors).toHaveLength(1);
    expect(scoreRoute(around, { ...base, reports: [report({ status: 'unverified', trustScore: 20 })] }).factors).toHaveLength(0);
  });

  it('tags safest, fastest and balanced routes', () => {
    const ranked = rankRoutes([through, around], base);
    const byId = Object.fromEntries(ranked.map((r) => [r.id, r.tags]));
    expect(byId.through).toContain('fastest');
    expect(byId.around).toContain('safest');
    expect(ranked.flatMap((r) => r.tags).filter((t) => t === 'balanced')).toHaveLength(1);
  });

  it('handles an empty route list', () => {
    expect(rankRoutes([], base)).toEqual([]);
  });

  it('defines night as 20:00–06:00', () => {
    expect([19, 20, 2, 5, 6].map(isNight)).toEqual([false, true, true, true, false]);
  });
});

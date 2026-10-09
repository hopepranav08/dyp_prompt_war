import { describe, expect, it } from 'vitest';
import { computeTrust, type TrustInput } from '../src/services/trust.js';

const input = (over: Partial<TrustInput> = {}): TrustInput => ({
  category: 'waterlogging',
  location: { lat: 18.52, lng: 73.85 },
  evidenceConsistency: 0.5,
  hasPhoto: false,
  hasVoice: false,
  isRaining: null,
  nearbySimilarReports: 0,
  ...over,
});

describe('trust engine', () => {
  it('keeps a bare text claim unverified', () => {
    const r = computeTrust(input());
    expect(r.status).toBe('unverified');
    expect(r.trustScore).toBe(20);
  });

  it('verifies a flood photo that Gemini confirms while it is raining', () => {
    const r = computeTrust(input({ hasPhoto: true, evidenceConsistency: 0.95, isRaining: true }));
    expect(r.trustScore).toBe(68);
    expect(r.status).toBe('corroborated');
    const withNeighbour = computeTrust(input({ hasPhoto: true, evidenceConsistency: 0.95, isRaining: true, nearbySimilarReports: 1 }));
    expect(withNeighbour.status).toBe('verified');
  });

  it('penalises media that contradicts the claim and weather that disagrees', () => {
    const r = computeTrust(input({ hasPhoto: true, evidenceConsistency: 0, isRaining: false }));
    expect(r.signals.map((s) => s.delta)).toEqual([20, 15, -20, -10]);
    expect(r.status).toBe('unverified');
  });

  it('rewards independent corroboration but caps it', () => {
    const four = computeTrust(input({ nearbySimilarReports: 4 }));
    const ten = computeTrust(input({ nearbySimilarReports: 10 }));
    expect(four.trustScore).toBe(ten.trustScore);
    expect(four.trustScore).toBe(68);
    expect(four.status).toBe('corroborated');
  });

  it('boosts road incidents next to an official black spot', () => {
    const r = computeTrust(input({ category: 'accident', location: { lat: 18.4622, lng: 73.8203 } }));
    expect(r.signals.at(-1)?.label).toContain('Navale Bridge');
    expect(r.trustScore).toBe(30);
  });

  it('clamps scores to 0–100', () => {
    const r = computeTrust(input({ hasPhoto: true, hasVoice: true, evidenceConsistency: 1, isRaining: true, nearbySimilarReports: 4 }));
    expect(r.trustScore).toBe(100);
  });
});

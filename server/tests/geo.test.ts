import { describe, expect, it } from 'vitest';
import { decodePolyline, distanceToPath, haversine } from '../src/lib/geo.js';
import { TtlCache } from '../src/lib/cache.js';

describe('geo', () => {
  it('computes haversine distance (Shaniwar Wada → Swargate ≈ 2.3 km)', () => {
    const d = haversine({ lat: 18.5195, lng: 73.8553 }, { lat: 18.5018, lng: 73.8636 });
    expect(d).toBeGreaterThan(2100);
    expect(d).toBeLessThan(2400);
  });

  it('decodes the reference Google encoded polyline', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ lat: 38.5, lng: -120.2 });
    expect(pts[2]).toEqual({ lat: 43.252, lng: -126.453 });
  });

  it('measures perpendicular distance to a path, not just to its vertices', () => {
    const path = [
      { lat: 18.5, lng: 73.8 },
      { lat: 18.5, lng: 73.9 },
    ];
    const d = distanceToPath({ lat: 18.501, lng: 73.85 }, path);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });

  it('returns Infinity for an empty path', () => {
    expect(distanceToPath({ lat: 0, lng: 0 }, [])).toBe(Infinity);
  });
});

describe('TtlCache', () => {
  it('loads once and serves the cached value', async () => {
    const cache = new TtlCache<number>(60_000);
    let calls = 0;
    const load = async () => ++calls;
    expect(await cache.getOrLoad('k', load)).toBe(1);
    expect(await cache.getOrLoad('k', load)).toBe(1);
    expect(calls).toBe(1);
  });

  it('expires entries and evicts the oldest when full', async () => {
    const expired = new TtlCache<string>(-1);
    expired.set('a', 'x');
    expect(expired.get('a')).toBeUndefined();

    const small = new TtlCache<string>(60_000, 2);
    small.set('a', '1');
    small.set('b', '2');
    small.set('c', '3');
    expect(small.get('a')).toBeUndefined();
    expect(small.get('c')).toBe('3');
  });
});

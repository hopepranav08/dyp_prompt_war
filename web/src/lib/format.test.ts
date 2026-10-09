import { describe, expect, it } from 'vitest';
import { formatHour, km, minutes, prettyCategory, scoreTone } from './format';

describe('format helpers', () => {
  it('bands scores consistently', () => {
    expect(scoreTone(85).label).toBe('Good');
    expect(scoreTone(50).label).toBe('Caution');
    expect(scoreTone(10).label).toBe('Risky');
  });

  it('formats units, hours and categories', () => {
    expect(minutes(1133)).toBe('19 min');
    expect(km(8268)).toBe('8.3 km');
    expect(formatHour(22)).toBe('10:00 PM');
    expect(formatHour(0)).toBe('12:00 AM');
    expect(prettyCategory('traffic_jam')).toBe('Traffic jam');
  });
});

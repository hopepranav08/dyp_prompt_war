import { describe, expect, it } from 'vitest';
import { withRetry, withTimeout } from '../src/lib/retry.js';
import { checkFare, isAutoNight, meterFare } from '../src/services/fare.js';

describe('RTO auto fare (Pune, from 1 Sep 2026)', () => {
  it('charges the ₹30 minimum up to 1.5 km', () => {
    expect(meterFare(800, 12).total).toBe(30);
    expect(meterFare(1500, 12).total).toBe(30);
  });

  it('adds ₹20 per km after 1.5 km', () => {
    expect(meterFare(5000, 12)).toMatchObject({ distanceCharge: 70, total: 100 });
  });

  it('adds 25% between midnight and 5 AM only', () => {
    expect(meterFare(5000, 1)).toMatchObject({ nightCharge: 25, total: 125, isNight: true });
    expect(meterFare(5000, 23).nightCharge).toBe(0);
    expect([0, 4, 5, 23].map(isAutoNight)).toEqual([true, true, false, false]);
  });

  it('charges ₹3 per large luggage item', () => {
    expect(meterFare(1000, 12, 2).total).toBe(36);
  });

  it('gives a verdict on a quoted fare', () => {
    expect(checkFare(5000, 12, 0, 105).verdict).toBe('fair');
    expect(checkFare(5000, 12, 0, 120).verdict).toBe('slightly_high');
    expect(checkFare(5000, 12, 0, 150)).toMatchObject({ verdict: 'overcharging', differencePct: 50 });
    expect(checkFare(5000, 12, 0, 60).verdict).toBe('below_meter');
    expect(checkFare(5000, 12).verdict).toBeUndefined();
  });
});

describe('retry & timeout', () => {
  it('retries transient failures then succeeds', async () => {
    let n = 0;
    const out = await withRetry(
      async () => {
        if (++n < 3) throw new Error('503');
        return 'ok';
      },
      { baseMs: 1 },
    );
    expect(out).toBe('ok');
    expect(n).toBe(3);
  });

  it('does not retry non-retryable errors', async () => {
    let n = 0;
    await expect(
      withRetry(
        async () => {
          n++;
          throw new Error('400');
        },
        { baseMs: 1, isRetryable: () => false },
      ),
    ).rejects.toThrow('400');
    expect(n).toBe(1);
  });

  it('times out slow promises', async () => {
    await expect(withTimeout(new Promise(() => undefined), 10, 'too slow')).rejects.toThrow('too slow');
  });
});

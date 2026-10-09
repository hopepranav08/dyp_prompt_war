/**
 * Pune & Pimpri-Chinchwad auto-rickshaw tariff, effective 1 Sep 2026 (RTA revision):
 * ₹30 for the first 1.5 km, ₹20 per km after that, +25% between midnight and 5 AM inside
 * municipal limits, ₹3 per large luggage item (60×40 cm or bigger).
 */
export const AUTO_TARIFF = {
  baseFare: 30,
  baseKm: 1.5,
  perKm: 20,
  nightSurcharge: 0.25,
  nightStartHour: 0,
  nightEndHour: 5,
  luggagePerItem: 3,
  effectiveFrom: '2026-09-01',
} as const;

export type FareVerdict = 'fair' | 'slightly_high' | 'overcharging' | 'below_meter';

export interface FareBreakdown {
  distanceKm: number;
  base: number;
  distanceCharge: number;
  nightCharge: number;
  luggageCharge: number;
  total: number;
  isNight: boolean;
}

export interface FareCheck extends FareBreakdown {
  quoted?: number;
  verdict?: FareVerdict;
  differencePct?: number;
}

export const isAutoNight = (hour: number) => hour >= AUTO_TARIFF.nightStartHour && hour < AUTO_TARIFF.nightEndHour;

/** Official meter fare for a distance, rounded to the rupee the way meters display it. */
export function meterFare(distanceM: number, hour: number, luggageItems = 0): FareBreakdown {
  const distanceKm = Math.max(0, distanceM) / 1000;
  const extraKm = Math.max(0, distanceKm - AUTO_TARIFF.baseKm);
  const base = AUTO_TARIFF.baseFare;
  const distanceCharge = Math.round(extraKm * AUTO_TARIFF.perKm);
  const isNight = isAutoNight(hour);
  const nightCharge = isNight ? Math.round((base + distanceCharge) * AUTO_TARIFF.nightSurcharge) : 0;
  const luggageCharge = Math.max(0, Math.floor(luggageItems)) * AUTO_TARIFF.luggagePerItem;
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    base,
    distanceCharge,
    nightCharge,
    luggageCharge,
    total: base + distanceCharge + nightCharge + luggageCharge,
    isNight,
  };
}

/** Compares a driver's quote with the meter: within 10% is fair, up to 25% is slightly high, beyond that is overcharging. */
export function checkFare(distanceM: number, hour: number, luggageItems = 0, quoted?: number): FareCheck {
  const fare = meterFare(distanceM, hour, luggageItems);
  if (quoted === undefined) return fare;
  const differencePct = Math.round(((quoted - fare.total) / fare.total) * 100);
  const verdict: FareVerdict = differencePct < -10 ? 'below_meter' : differencePct <= 10 ? 'fair' : differencePct <= 25 ? 'slightly_high' : 'overcharging';
  return { ...fare, quoted, verdict, differencePct };
}

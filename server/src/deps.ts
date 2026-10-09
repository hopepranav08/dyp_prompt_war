import type { TokenVerifier } from './lib/auth.js';
import type { AiClient } from './lib/gemini.js';
import type { LatLng } from './lib/geo.js';
import type { MapsClient } from './lib/maps.js';
import type { EventStore } from './services/eventStore.js';
import type { ReportStore } from './services/reportStore.js';

export interface Deps {
  ai: AiClient;
  maps: MapsClient;
  reports: ReportStore;
  events: EventStore;
  browserMapsKey: string;
  /** Identity Platform token verifier; undefined disables sign-in features. */
  auth?: TokenVerifier;
  now: () => Date;
}

export const PUNE_CENTER: LatLng = { lat: 18.5204, lng: 73.8567 };
export const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in IST as YYYY-MM-DD. */
export function istDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

/** Weekday in IST, 0 = Sunday. */
export function istWeekday(date: Date): number {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getDay();
}

/** Current hour in India (Cloud Run runs in UTC). */
export function istHour(date: Date): number {
  return Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(date));
}

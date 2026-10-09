import { BLACKSPOTS, type BlackSpot } from '../data/blackspots.js';
import { distanceToPath, type LatLng } from '../lib/geo.js';
import type { StoredReport } from './reportStore.js';

export interface RouteCandidate {
  id: string;
  durationSec: number;
  distanceM: number;
  path: LatLng[];
  description?: string;
}

export interface RiskContext {
  hour: number;
  isRaining: boolean;
  reports: readonly StoredReport[];
  blackspots?: readonly BlackSpot[];
}

export interface RiskFactor {
  kind: 'blackspot' | 'report' | 'night' | 'weather';
  label: string;
  points: number;
}

export type RouteTag = 'safest' | 'fastest' | 'balanced';

export interface ScoredRoute extends RouteCandidate {
  safetyScore: number;
  riskPoints: number;
  factors: RiskFactor[];
  tags: RouteTag[];
}

export const BLACKSPOT_RADIUS_M = 250;
export const REPORT_RADIUS_M = 150;
const PERSONAL_SAFETY_CATEGORIES = new Set(['unsafe_area', 'harassment', 'crime', 'streetlight_out']);

export const isNight = (hour: number) => hour >= 20 || hour < 6;

/** Scores one route: higher safetyScore (0–100) = safer. Every risk point is explained by a factor. */
export function scoreRoute(route: RouteCandidate, ctx: RiskContext): Omit<ScoredRoute, 'tags'> {
  const factors: RiskFactor[] = [];
  const night = isNight(ctx.hour);

  for (const spot of ctx.blackspots ?? BLACKSPOTS) {
    if (distanceToPath(spot, route.path) > BLACKSPOT_RADIUS_M) continue;
    let points = spot.severity * 6;
    if (ctx.isRaining) points *= 1.25;
    if (night) points *= 1.15;
    factors.push({ kind: 'blackspot', label: `Accident black spot: ${spot.name}`, points: round(points) });
  }

  for (const report of ctx.reports) {
    if (report.status === 'unverified' && report.trustScore < 35) continue;
    if (distanceToPath(report.location, route.path) > REPORT_RADIUS_M) continue;
    let points = report.severity * 3 * (report.trustScore / 100);
    if (night && PERSONAL_SAFETY_CATEGORIES.has(report.category)) points *= 1.5;
    factors.push({ kind: 'report', label: `${capitalize(report.status)} report: ${report.title}`, points: round(points) });
  }

  if (night) factors.push({ kind: 'night', label: 'Night-time travel (20:00–06:00)', points: 4 });
  if (ctx.isRaining) factors.push({ kind: 'weather', label: 'Rain: wet roads and low visibility', points: 3 });

  const riskPoints = round(factors.reduce((sum, f) => sum + f.points, 0));
  const safetyScore = Math.max(0, Math.round(100 - riskPoints * 1.6));
  return { ...route, factors, riskPoints, safetyScore };
}

/** Scores all routes and tags the safest, fastest and best-balanced options. */
export function rankRoutes(routes: readonly RouteCandidate[], ctx: RiskContext): ScoredRoute[] {
  const scored: ScoredRoute[] = routes.map((r) => ({ ...scoreRoute(r, ctx), tags: [] }));
  if (scored.length === 0) return scored;

  const safest = scored.reduce((a, b) =>
    b.safetyScore > a.safetyScore || (b.safetyScore === a.safetyScore && b.durationSec < a.durationSec) ? b : a,
  );
  const fastest = scored.reduce((a, b) => (b.durationSec < a.durationSec ? b : a));
  const minDuration = fastest.durationSec || 1;
  const balance = (r: ScoredRoute) => r.safetyScore - ((r.durationSec - minDuration) / minDuration) * 100;
  const balanced = scored.reduce((a, b) => (balance(b) > balance(a) ? b : a));

  safest.tags.push('safest');
  fastest.tags.push('fastest');
  balanced.tags.push('balanced');
  return scored;
}

const round = (n: number) => Math.round(n * 10) / 10;
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

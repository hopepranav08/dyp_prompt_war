import type { LatLng } from './types';

const MODE: Record<string, string> = { DRIVE: 'driving', TWO_WHEELER: 'two-wheeler', WALK: 'walking' };
const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * Google Maps directions URL that reproduces *our* chosen route: a few waypoints sampled along the
 * path pin Google's navigation to the safe alternative instead of its default fastest one.
 * (Maps URLs allow 3 waypoints on mobile, so we stay within that.)
 */
export function googleMapsRouteUrl(path: readonly LatLng[], mode = 'DRIVE', maxWaypoints = 3): string | null {
  if (path.length < 2) return null;
  const origin = path[0]!;
  const destination = path[path.length - 1]!;
  const waypoints = Array.from({ length: maxWaypoints }, (_, i) => path[Math.round(((i + 1) * (path.length - 1)) / (maxWaypoints + 1))]!).filter(Boolean);
  const params = new URLSearchParams({ api: '1', origin: fmt(origin), destination: fmt(destination), travelmode: MODE[mode] ?? 'driving' });
  if (waypoints.length > 0) params.set('waypoints', waypoints.map(fmt).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Multi-stop day plan straight into Google Maps (first stop → last stop via the middle ones). */
export function googleMapsStopsUrl(stops: readonly LatLng[], mode = 'DRIVE'): string | null {
  if (stops.length < 2) return null;
  const params = new URLSearchParams({ api: '1', origin: fmt(stops[0]!), destination: fmt(stops[stops.length - 1]!), travelmode: MODE[mode] ?? 'driving' });
  const middle = stops.slice(1, -1).slice(0, 8);
  if (middle.length > 0) params.set('waypoints', middle.map(fmt).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

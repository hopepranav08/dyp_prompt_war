import type { MapsClient, PlaceInfo } from '../lib/maps.js';

/** Resolves a place's first Google photo to a browser-safe URL; failures just mean "no photo". */
export async function photoFor(maps: MapsClient, place: PlaceInfo | null | undefined, maxWidthPx = 640): Promise<string | null> {
  if (!place?.photoName) return null;
  return maps.photoUri(place.photoName, maxWidthPx).catch(() => null);
}

/** Strips internal fields before a place goes to the browser. */
export function publicPlace(p: PlaceInfo | null | undefined) {
  if (!p) return null;
  const { reviews: _reviews, photoName: _photoName, accessibility: _accessibility, ...rest } = p;
  return rest;
}

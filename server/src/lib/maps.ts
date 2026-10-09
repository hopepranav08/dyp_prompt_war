import { decodePolyline, type LatLng } from './geo.js';
import { isTransientStatus, withRetry } from './retry.js';
import type { RouteCandidate } from '../services/risk.js';

export type TravelMode = 'DRIVE' | 'TWO_WHEELER' | 'WALK';

/** A route endpoint: free text ("FC Road, Pune"), a Google place ID, or coordinates. */
export type Endpoint = string | { placeId: string } | LatLng;

export interface PlaceInfo {
  id: string;
  name: string;
  address?: string;
  location?: LatLng;
  rating?: number;
  ratingCount?: number;
  priceLevel?: string;
  mapsUri?: string;
  accessibility?: Record<string, boolean>;
  reviews?: string[];
  /** Resource name of the first photo (places/…/photos/…); resolve with photoUri(). */
  photoName?: string;
  photoAttribution?: string;
}

export interface Weather {
  tempC: number | null;
  condition: string;
  conditionType: string;
  isRaining: boolean;
  rainChance: number | null;
  iconUri?: string;
}

export interface HourForecast {
  hour: number;
  tempC: number | null;
  condition: string;
  rainChance: number;
}

export interface AirQuality {
  aqi: number | null;
  category: string;
  color?: string;
}

/** Google Maps Platform surface used by the routes — faked in tests. */
export interface MapsClient {
  getPlace(placeId: string, withReviews?: boolean): Promise<PlaceInfo | null>;
  searchPlace(query: string, bias: LatLng, withReviews?: boolean): Promise<PlaceInfo | null>;
  computeRoutes(origin: Endpoint, destination: Endpoint, mode: TravelMode, alternatives?: boolean): Promise<RouteCandidate[]>;
  weather(at: LatLng): Promise<Weather>;
  forecastHours(at: LatLng, hours: number): Promise<HourForecast[]>;
  airQuality(at: LatLng): Promise<AirQuality>;
  photoUri(photoName: string, maxWidthPx: number): Promise<string | null>;
}

export class MapsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

const BASE_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'priceLevel', 'googleMapsUri', 'accessibilityOptions', 'photos'];
const RAIN_TYPES = /RAIN|SHOWER|THUNDER|DRIZZLE/;

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  googleMapsUri?: string;
  accessibilityOptions?: Record<string, boolean>;
  reviews?: Array<{ text?: { text?: string } }>;
  photos?: Array<{ name: string; authorAttributions?: Array<{ displayName?: string }> }>;
}

const toWaypoint = (e: Endpoint) =>
  typeof e === 'string' ? { address: e } : 'placeId' in e ? { placeId: e.placeId } : { location: { latLng: { latitude: e.lat, longitude: e.lng } } };

export class GoogleMapsClient implements MapsClient {
  constructor(private readonly key: string) {}

  /** Every Maps call gets a 10 s timeout and up to two retries on 429/5xx/network errors. */
  private call<T>(url: string, init: RequestInit & { fieldMask?: string } = {}): Promise<T> {
    const { fieldMask, ...rest } = init;
    return withRetry(
      async () => {
        const res = await fetch(url, {
          ...rest,
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': this.key,
            ...(fieldMask && { 'X-Goog-FieldMask': fieldMask }),
          },
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new MapsError(`${new URL(url).hostname} responded ${res.status}`, res.status);
        return (await res.json()) as T;
      },
      { retries: 2, baseMs: 250, isRetryable: (e) => !(e instanceof MapsError) || isTransientStatus(e.status) },
    );
  }

  async getPlace(placeId: string, withReviews = false): Promise<PlaceInfo | null> {
    const fields = withReviews ? [...BASE_FIELDS, 'reviews'] : BASE_FIELDS;
    const raw = await this.call<RawPlace>(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      fieldMask: fields.join(','),
    });
    return toPlace(raw);
  }

  async searchPlace(query: string, bias: LatLng, withReviews = false): Promise<PlaceInfo | null> {
    const fields = (withReviews ? [...BASE_FIELDS, 'reviews'] : BASE_FIELDS).map((f) => `places.${f}`);
    const body = {
      textQuery: query,
      maxResultCount: 1,
      languageCode: 'en',
      locationBias: { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: 30_000 } },
    };
    const raw = await this.call<{ places?: RawPlace[] }>('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      body: JSON.stringify(body),
      fieldMask: fields.join(','),
    });
    const first = raw.places?.[0];
    return first ? toPlace(first) : null;
  }

  async computeRoutes(origin: Endpoint, destination: Endpoint, mode: TravelMode, alternatives = true): Promise<RouteCandidate[]> {
    const body = {
      origin: toWaypoint(origin),
      destination: toWaypoint(destination),
      travelMode: mode,
      ...(mode !== 'WALK' && { routingPreference: 'TRAFFIC_AWARE' }),
      computeAlternativeRoutes: alternatives,
      languageCode: 'en-IN',
      regionCode: 'IN',
      units: 'METRIC',
    };
    const raw = await this.call<{ routes?: Array<{ duration?: string; distanceMeters?: number; description?: string; polyline?: { encodedPolyline?: string } }> }>(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      { method: 'POST', body: JSON.stringify(body), fieldMask: 'routes.duration,routes.distanceMeters,routes.description,routes.polyline.encodedPolyline' },
    );
    return (raw.routes ?? []).map((r, i) => ({
      id: `route-${i + 1}`,
      durationSec: Number.parseInt(r.duration ?? '0', 10),
      distanceM: r.distanceMeters ?? 0,
      description: r.description,
      path: decodePolyline(r.polyline?.encodedPolyline ?? ''),
    }));
  }

  async weather(at: LatLng): Promise<Weather> {
    const url = `https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=${at.lat}&location.longitude=${at.lng}`;
    const raw = await this.call<{
      temperature?: { degrees?: number };
      weatherCondition?: { type?: string; description?: { text?: string }; iconBaseUri?: string };
      precipitation?: { probability?: { percent?: number }; qpf?: { quantity?: number } };
    }>(url);
    const type = raw.weatherCondition?.type ?? 'UNKNOWN';
    return {
      tempC: raw.temperature?.degrees ?? null,
      condition: raw.weatherCondition?.description?.text ?? 'Unavailable',
      conditionType: type,
      isRaining: RAIN_TYPES.test(type) || (raw.precipitation?.qpf?.quantity ?? 0) > 0,
      rainChance: raw.precipitation?.probability?.percent ?? null,
      iconUri: raw.weatherCondition?.iconBaseUri ? `${raw.weatherCondition.iconBaseUri}.svg` : undefined,
    };
  }

  async forecastHours(at: LatLng, hours: number): Promise<HourForecast[]> {
    const url = `https://weather.googleapis.com/v1/forecast/hours:lookup?location.latitude=${at.lat}&location.longitude=${at.lng}&hours=${hours}`;
    const raw = await this.call<{
      forecastHours?: Array<{
        displayDateTime?: { hours?: number };
        temperature?: { degrees?: number };
        weatherCondition?: { description?: { text?: string } };
        precipitation?: { probability?: { percent?: number } };
      }>;
    }>(url);
    return (raw.forecastHours ?? []).map((h) => ({
      hour: h.displayDateTime?.hours ?? 0,
      tempC: h.temperature?.degrees ?? null,
      condition: h.weatherCondition?.description?.text ?? '',
      rainChance: h.precipitation?.probability?.percent ?? 0,
    }));
  }

  async airQuality(at: LatLng): Promise<AirQuality> {
    const raw = await this.call<{ indexes?: Array<{ aqi?: number; category?: string; color?: { red?: number; green?: number; blue?: number } }> }>(
      'https://airquality.googleapis.com/v1/currentConditions:lookup',
      { method: 'POST', body: JSON.stringify({ location: { latitude: at.lat, longitude: at.lng } }) },
    );
    const idx = raw.indexes?.[0];
    const c = idx?.color;
    return {
      aqi: idx?.aqi ?? null,
      category: idx?.category ?? 'Unavailable',
      color: c ? `rgb(${Math.round((c.red ?? 0) * 255)}, ${Math.round((c.green ?? 0) * 255)}, ${Math.round((c.blue ?? 0) * 255)})` : undefined,
    };
  }

  /** Resolves a Place Photo to a short-lived googleusercontent URL, so the API key never reaches the browser. */
  async photoUri(photoName: string, maxWidthPx: number): Promise<string | null> {
    if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(photoName)) return null;
    const raw = await this.call<{ photoUri?: string }>(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`);
    return raw.photoUri ?? null;
  }
}

function toPlace(raw: RawPlace): PlaceInfo {
  const photo = raw.photos?.[0];
  return {
    id: raw.id,
    name: raw.displayName?.text ?? 'Unknown place',
    address: raw.formattedAddress,
    location: raw.location ? { lat: raw.location.latitude, lng: raw.location.longitude } : undefined,
    rating: raw.rating,
    ratingCount: raw.userRatingCount,
    priceLevel: raw.priceLevel,
    mapsUri: raw.googleMapsUri,
    accessibility: raw.accessibilityOptions,
    reviews: raw.reviews?.map((r) => r.text?.text ?? '').filter(Boolean).slice(0, 5),
    photoName: photo?.name,
    photoAttribution: photo?.authorAttributions?.map((a) => a.displayName).filter(Boolean).join(', ') || undefined,
  };
}

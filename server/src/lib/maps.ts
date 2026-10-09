import { decodePolyline, type LatLng } from './geo.js';
import type { RouteCandidate } from '../services/risk.js';

export type TravelMode = 'DRIVE' | 'TWO_WHEELER' | 'WALK';

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
}

export interface Weather {
  tempC: number | null;
  condition: string;
  conditionType: string;
  isRaining: boolean;
  rainChance: number | null;
  iconUri?: string;
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
  computeRoutes(origin: string, destination: string, mode: TravelMode): Promise<RouteCandidate[]>;
  weather(at: LatLng): Promise<Weather>;
  airQuality(at: LatLng): Promise<AirQuality>;
}

export class MapsError extends Error {}

const BASE_FIELDS = ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'priceLevel', 'googleMapsUri', 'accessibilityOptions'];
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
}

export class GoogleMapsClient implements MapsClient {
  constructor(private readonly key: string) {}

  private async call<T>(url: string, init: RequestInit & { fieldMask?: string } = {}): Promise<T> {
    const { fieldMask, ...rest } = init;
    const res = await fetch(url, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.key,
        ...(fieldMask && { 'X-Goog-FieldMask': fieldMask }),
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new MapsError(`${new URL(url).hostname} responded ${res.status}`);
    return (await res.json()) as T;
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

  async computeRoutes(origin: string, destination: string, mode: TravelMode): Promise<RouteCandidate[]> {
    const body = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: mode,
      ...(mode !== 'WALK' && { routingPreference: 'TRAFFIC_AWARE' }),
      computeAlternativeRoutes: true,
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
}

function toPlace(raw: RawPlace): PlaceInfo {
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
  };
}

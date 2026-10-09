import { auth } from './auth';
import { getLang } from './prefs';
import type { BestTimeResult, BlackSpot, CityEvent, CompareResult, ExploreResult, FareResult, FoodAlerts, FoodCheck, Landmark, LatLng, PlanResult, Pulse, Report, RouteResult } from './types';

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.idToken();
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...init?.headers },
    });
  } catch {
    throw new ApiError('Network error: check your connection and try again.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
  if (!res.ok) throw new ApiError([body.error ?? `Request failed (${res.status})`, ...(body.details ?? [])].join(' · '));
  return body as T;
}

/** Every AI-backed call carries the UI language so Gemini answers in English, Hindi or Marathi. */
const post = <T>(path: string, data: Record<string, unknown>) => request<T>(path, { method: 'POST', body: JSON.stringify({ ...data, lang: getLang() }) });

export interface MediaPayload {
  mimeType: string;
  data: string;
}

export const api = {
  config: () => request<{ mapsKey: string; center: LatLng }>('/api/config'),
  pulse: () => request<Pulse>(`/api/pulse?lang=${getLang()}`),
  blackspots: () => request<{ blackspots: BlackSpot[]; sources: string[] }>('/api/blackspots'),
  reports: () => request<{ reports: Report[] }>('/api/reports'),
  landmarks: () => request<{ landmarks: Landmark[] }>('/api/landmarks'),
  me: () => request<{ user: { uid: string; anonymous: boolean; email?: string } | null; history: { total: number; verified: number } | null }>('/api/me'),
  explore: (query: string, mode: 'explore' | 'heritage', location?: LatLng) => post<ExploreResult>('/api/explore', { query, mode, location }),
  plan: (prompt: string, hours: number, budget: number | undefined, startHour: number) => post<PlanResult>('/api/plan', { prompt, hours, budget, startHour }),
  route: (origin: string, destination: string, mode: string, hour?: number) => post<RouteResult>('/api/route', { origin, destination, mode, hour }),
  fare: (origin: string, destination: string, quoted?: number, luggage = 0, hour?: number) => post<FareResult>('/api/fare', { origin, destination, quoted, luggage, hour }),
  report: (payload: { text?: string; image?: MediaPayload; audio?: MediaPayload; location: LatLng }) => post<{ report: Report }>('/api/report', payload),
  compare: (places: string[]) => post<CompareResult>('/api/compare', { places }),
  compareSuggest: (query: string, tier: 'cheap' | 'moderate' | 'expensive') => request<{ places: string[] }>('/api/compare/suggest', { method: 'POST', body: JSON.stringify({ query, tier }) }),
  bestTime: (placeId: string, origin?: LatLng) => post<BestTimeResult>('/api/besttime', { placeId, origin }),
  foodAlerts: () => request<FoodAlerts>(`/api/food/alerts?lang=${getLang()}`),
  foodCheck: (name: string) => post<FoodCheck>('/api/food/check', { name }),
  events: () => request<{ events: CityEvent[] }>(`/api/events?lang=${getLang()}`),
  createEvent: (e: { title: string; date: string; time: string; venue: string; category: string; description: string }) => post<{ event: CityEvent }>('/api/events', e),
};

/** Reads a Blob as bare base64 (no data: prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(blob);
  });
}

/** Downscales a photo in the browser so uploads stay small and fast. */
export async function compressImage(file: File, maxSide = 1280): Promise<MediaPayload> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image encode failed'))), 'image/jpeg', 0.82));
  return { mimeType: 'image/jpeg', data: await blobToBase64(blob) };
}

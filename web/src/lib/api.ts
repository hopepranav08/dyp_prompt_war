import type { BlackSpot, CompareResult, ExploreResult, LatLng, Pulse, Report, RouteResult } from './types';

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch {
    throw new ApiError('Network error: check your connection and try again.');
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
  if (!res.ok) throw new ApiError([body.error ?? `Request failed (${res.status})`, ...(body.details ?? [])].join(' · '));
  return body as T;
}

const post = <T>(path: string, data: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data) });

export interface MediaPayload {
  mimeType: string;
  data: string;
}

export const api = {
  config: () => request<{ mapsKey: string; center: LatLng }>('/api/config'),
  pulse: () => request<Pulse>('/api/pulse'),
  blackspots: () => request<{ blackspots: BlackSpot[]; sources: string[] }>('/api/blackspots'),
  reports: () => request<{ reports: Report[] }>('/api/reports'),
  explore: (query: string, mode: 'explore' | 'heritage', location?: LatLng) => post<ExploreResult>('/api/explore', { query, mode, location }),
  route: (origin: string, destination: string, mode: string, hour?: number) => post<RouteResult>('/api/route', { origin, destination, mode, hour }),
  report: (payload: { text?: string; image?: MediaPayload; audio?: MediaPayload; location: LatLng }) => post<{ report: Report }>('/api/report', payload),
  compare: (places: string[]) => post<CompareResult>('/api/compare', { places }),
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

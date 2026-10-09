import { z } from 'zod';

/* ---------- Request schemas (everything from the browser is validated) ---------- */

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const ExploreRequest = z.object({
  query: z.string().trim().min(2).max(300),
  mode: z.enum(['explore', 'heritage']).default('explore'),
  location: LatLngSchema.optional(),
});

export const RouteRequest = z.object({
  origin: z.string().trim().min(2).max(200),
  destination: z.string().trim().min(2).max(200),
  mode: z.enum(['DRIVE', 'TWO_WHEELER', 'WALK']).default('TWO_WHEELER'),
  /** Optional "plan for later" hour (0–23, IST). Defaults to now. */
  hour: z.number().int().min(0).max(23).optional(),
});

const MAX_MEDIA_B64 = 7_000_000; // ~5 MB binary

const Media = <T extends readonly [string, ...string[]]>(types: T) =>
  z.object({
    mimeType: z.enum(types),
    data: z.string().min(1).max(MAX_MEDIA_B64).regex(/^[A-Za-z0-9+/=]+$/, 'must be base64'),
  });

export const ReportRequest = z
  .object({
    text: z.string().trim().max(1000).optional(),
    image: Media(['image/jpeg', 'image/png', 'image/webp']).optional(),
    audio: Media(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']).optional(),
    location: LatLngSchema,
  })
  .refine((r) => Boolean(r.text?.length || r.image || r.audio), { message: 'Add a description, photo or voice note' });

export const CompareRequest = z.object({
  places: z.array(z.string().trim().min(2).max(120)).min(2).max(4),
});

/* ---------- Gemini output schemas (model output is validated, never trusted) ---------- */

export const PLACE_CATEGORIES = ['food', 'attraction', 'heritage', 'hotel', 'shopping', 'nature', 'nightlife', 'other'] as const;

export const ExploreAi = z.object({
  summary: z.string(),
  places: z
    .array(
      z.object({
        name: z.string(),
        category: z.enum(PLACE_CATEGORIES),
        why: z.string(),
        budget: z.string(),
        bestTime: z.string(),
        safetyNote: z.string(),
      }),
    )
    .max(6),
  tips: z.array(z.string()).max(4),
  heritage: z.object({ story: z.string(), traditions: z.array(z.string()).max(5) }).nullable(),
});

export const REPORT_CATEGORIES = [
  'accident', 'traffic_jam', 'waterlogging', 'pothole', 'tree_fall', 'unsafe_area', 'harassment',
  'streetlight_out', 'garbage', 'crime', 'fire', 'other',
] as const;

export const ReportAi = z.object({
  title: z.string(),
  category: z.enum(REPORT_CATEGORIES),
  severity: z.number().int().min(1).max(5),
  summary: z.string(),
  transcript: z.string().nullable(),
  language: z.string(),
  evidenceConsistency: z.number().min(0).max(1),
  actions: z.array(z.string()).max(4),
  authority: z.string(),
});

export const RouteAi = z.object({
  headline: z.string(),
  recommendation: z.string(),
  precautions: z.array(z.string()).max(4),
});

export const CompareAi = z.object({
  places: z.array(
    z.object({
      index: z.number().int(),
      cleanliness: z.number().min(0).max(100),
      cleanlinessEvidence: z.string(),
      safetyPerception: z.number().min(0).max(100),
      safetyEvidence: z.string(),
      affordabilityEstimate: z.number().min(0).max(100),
      verdict: z.string(),
    }),
  ),
  summary: z.string(),
});

export const PulseAi = z.object({
  briefing: z.string(),
  alerts: z.array(z.object({ title: z.string(), level: z.enum(['info', 'warning', 'danger']) })).max(3),
});

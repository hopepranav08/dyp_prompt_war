import { z } from 'zod';
import { LangSchema } from './lang.js';

/* ---------- Request schemas (everything from the browser is validated) ---------- */

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const ExploreRequest = z.object({
  query: z.string().trim().min(2).max(300),
  mode: z.enum(['explore', 'heritage']).default('explore'),
  location: LatLngSchema.optional(),
  lang: LangSchema,
});

export const RouteRequest = z.object({
  origin: z.string().trim().min(2).max(200),
  destination: z.string().trim().min(2).max(200),
  mode: z.enum(['DRIVE', 'TWO_WHEELER', 'WALK']).default('TWO_WHEELER'),
  /** Optional "plan for later" hour (0–23, IST). Defaults to now. */
  hour: z.number().int().min(0).max(23).optional(),
  lang: LangSchema,
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
    lang: LangSchema,
  })
  .refine((r) => Boolean(r.text?.length || r.image || r.audio), { message: 'Add a description, photo or voice note' });

export const CompareRequest = z.object({
  places: z.array(z.string().trim().min(2).max(120)).min(2).max(4),
  lang: LangSchema,
});

export const PlanRequest = z.object({
  prompt: z.string().trim().min(3).max(400),
  hours: z.number().int().min(2).max(12).default(6),
  budget: z.number().int().min(100).max(50_000).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  location: LatLngSchema.optional(),
  lang: LangSchema,
});

export const FareRequest = z.object({
  origin: z.string().trim().min(2).max(200),
  destination: z.string().trim().min(2).max(200),
  hour: z.number().int().min(0).max(23).optional(),
  luggage: z.number().int().min(0).max(10).default(0),
  quoted: z.number().int().min(1).max(20_000).optional(),
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
  isCivicIssue: z.boolean(),
  moderationNote: z.string(),
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

export const PlanAi = z.object({
  title: z.string(),
  summary: z.string(),
  stops: z
    .array(
      z.object({
        name: z.string(),
        category: z.enum(PLACE_CATEGORIES),
        startTime: z.string(),
        durationMin: z.number().int().min(10).max(300),
        costPerPerson: z.number().min(0),
        why: z.string(),
        indoor: z.boolean(),
        tip: z.string(),
      }),
    )
    .min(2)
    .max(7),
  foodToTry: z.array(z.string()).max(4),
  tips: z.array(z.string()).max(3),
});

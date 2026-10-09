import { BLACKSPOTS } from '../data/blackspots.js';
import { haversine, type LatLng } from '../lib/geo.js';

export type ReportStatus = 'verified' | 'corroborated' | 'unverified';

export interface TrustInput {
  category: string;
  location: LatLng;
  /** 0–1: Gemini's judgement of whether the attached media actually shows what is claimed. */
  evidenceConsistency: number;
  hasPhoto: boolean;
  hasVoice: boolean;
  /** null when live weather is unavailable */
  isRaining: boolean | null;
  nearbySimilarReports: number;
  /** Signed-in (non-guest) reporter and their track record; absent for guests. */
  reporter?: { signedIn: boolean; verifiedReports: number };
}

export interface TrustSignal {
  label: string;
  delta: number;
}

export interface TrustResult {
  trustScore: number;
  status: ReportStatus;
  signals: TrustSignal[];
}

const WEATHER_CATEGORIES = new Set(['waterlogging', 'tree_fall']);
const ROAD_CATEGORIES = new Set(['accident', 'traffic_jam', 'pothole']);
export const CORROBORATION_RADIUS_M = 300;

/**
 * Multi-signal corroboration. Research shows AI alone is a weak verifier, so the model's opinion is
 * just one signal next to physical evidence, live weather, independent reporters and official data.
 */
export function computeTrust(input: TrustInput): TrustResult {
  const signals: TrustSignal[] = [{ label: 'Base credibility for a new report', delta: 20 }];

  if (input.hasPhoto) signals.push({ label: 'Photo evidence attached', delta: 15 });
  if (input.hasVoice) signals.push({ label: 'Voice note attached', delta: 5 });

  if (input.hasPhoto || input.hasVoice) {
    const ai = clamp(input.evidenceConsistency, 0, 1);
    signals.push({
      label: `Gemini: media ${ai >= 0.5 ? 'supports' : 'contradicts'} the claim (${Math.round(ai * 100)}% consistent)`,
      delta: Math.round((ai - 0.5) * 40),
    });
  }

  if (WEATHER_CATEGORIES.has(input.category) && input.isRaining !== null) {
    signals.push(
      input.isRaining
        ? { label: 'Live weather confirms rain at this location', delta: 15 }
        : { label: 'Live weather shows no rain here right now', delta: -10 },
    );
  }

  const corroborations = Math.min(input.nearbySimilarReports, 4);
  if (corroborations > 0) {
    signals.push({ label: `${corroborations} independent similar report(s) within ${CORROBORATION_RADIUS_M} m`, delta: corroborations * 12 });
  }

  if (ROAD_CATEGORIES.has(input.category)) {
    const near = BLACKSPOTS.find((s) => haversine(s, input.location) < 400);
    if (near) signals.push({ label: `Near official accident black spot: ${near.name}`, delta: 10 });
  }

  if (input.reporter?.signedIn) {
    signals.push({ label: 'Signed-in reporter (accountable identity)', delta: 5 });
    const track = Math.min(input.reporter.verifiedReports, 3);
    if (track > 0) signals.push({ label: `Reporter has ${input.reporter.verifiedReports} previously verified report(s)`, delta: track * 5 });
  }

  const trustScore = clamp(Math.round(signals.reduce((sum, s) => sum + s.delta, 0)), 0, 100);
  const status: ReportStatus = trustScore >= 70 ? 'verified' : trustScore >= 45 ? 'corroborated' : 'unverified';
  return { trustScore, status, signals };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

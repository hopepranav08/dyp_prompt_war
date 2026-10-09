export interface LatLng {
  lat: number;
  lng: number;
}

export interface PlaceInfo {
  id: string;
  name: string;
  address?: string;
  location?: LatLng;
  rating?: number;
  ratingCount?: number;
  priceLevel?: string;
  mapsUri?: string;
}

export interface AreaSafety {
  score: number;
  blackspots: string[];
  liveReports: number;
}

export interface Source {
  title: string;
  uri: string;
  placeId?: string;
  kind: 'maps' | 'web';
}

export interface ExplorePlace {
  name: string;
  category: string;
  why: string;
  budget: string;
  bestTime: string;
  safetyNote: string;
  verified: boolean;
  place: PlaceInfo | null;
  area: AreaSafety | null;
}

export interface ExploreResult {
  summary: string;
  tips: string[];
  heritage: { story: string; traditions: string[] } | null;
  places: ExplorePlace[];
  sources: Source[];
}

export interface Weather {
  tempC: number | null;
  condition: string;
  conditionType: string;
  isRaining: boolean;
  rainChance: number | null;
  iconUri?: string;
}

export interface RiskFactor {
  kind: 'blackspot' | 'report' | 'night' | 'weather';
  label: string;
  points: number;
}

export type RouteTag = 'safest' | 'fastest' | 'balanced';

export interface ScoredRoute {
  id: string;
  durationSec: number;
  distanceM: number;
  description?: string;
  path: LatLng[];
  safetyScore: number;
  riskPoints: number;
  factors: RiskFactor[];
  tags: RouteTag[];
}

export interface RouteResult {
  hour: number;
  weather: Weather | null;
  routes: ScoredRoute[];
  explanation: { headline: string; recommendation: string; precautions: string[] } | null;
}

export type ReportStatus = 'verified' | 'corroborated' | 'unverified';

export interface Report {
  id: string;
  title: string;
  category: string;
  severity: number;
  summary: string;
  location: LatLng;
  status: ReportStatus;
  trustScore: number;
  signals: Array<{ label: string; delta: number }>;
  actions: string[];
  authority: string;
  language: string;
  transcript?: string;
  hasPhoto: boolean;
  hasVoice: boolean;
  createdAt: number;
}

export interface CompareScores {
  safety: number;
  cleanliness: number;
  affordability: number;
  rating: number;
  accessibility: number;
}

export interface CompareItem {
  place: PlaceInfo;
  scores: CompareScores;
  overall: number;
  evidence: { cleanliness: string; safety: string; area: AreaSafety | null };
  verdict: string;
}

export interface CompareResult {
  results: CompareItem[];
  bestId?: string;
  worstId?: string;
  summary: string;
}

export interface Pulse {
  weather: Weather | null;
  air: { aqi: number | null; category: string; color?: string } | null;
  briefing: { briefing: string; alerts: Array<{ title: string; level: 'info' | 'warning' | 'danger' }> } | null;
}

export interface BlackSpot extends LatLng {
  id: string;
  name: string;
  severity: 1 | 2 | 3;
  note: string;
}

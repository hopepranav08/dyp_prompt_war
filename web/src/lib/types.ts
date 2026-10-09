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
  photoUri?: string | null;
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
  photoUri?: string | null;
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

export interface PlaceInfoWithAttribution extends PlaceInfo {
  photoAttribution?: string;
}

export interface PlanStop {
  name: string;
  category: string;
  startTime: string;
  durationMin: number;
  costPerPerson: number;
  why: string;
  indoor: boolean;
  tip: string;
  verified: boolean;
  place: PlaceInfoWithAttribution | null;
  photoUri: string | null;
  area: AreaSafety | null;
}

export interface PlanLeg {
  fromIndex: number;
  toIndex: number;
  km: number;
  minutes: number;
  walk: boolean;
  autoFare: number;
  safetyScore: number;
  factors: string[];
  path: LatLng[];
}

export interface PlanResult {
  title: string;
  summary: string;
  startHour: number;
  stops: PlanStop[];
  legs: PlanLeg[];
  totals: { activities: number; transport: number; total: number; budget: number | null };
  forecast: Array<{ hour: number; tempC: number | null; condition: string; rainChance: number }>;
  foodToTry: string[];
  tips: string[];
}

export type FareVerdict = 'fair' | 'slightly_high' | 'overcharging' | 'below_meter';

export interface FareResult {
  hour: number;
  fare: {
    distanceKm: number;
    base: number;
    distanceCharge: number;
    nightCharge: number;
    luggageCharge: number;
    total: number;
    isNight: boolean;
    quoted?: number;
    verdict?: FareVerdict;
    differencePct?: number;
  };
  route: { distanceM: number; durationSec: number; description?: string; path: LatLng[] };
}

export interface Landmark {
  id: string;
  name: string;
  deva: string;
  tag: string;
  rating?: number;
  ratingCount?: number;
  mapsUri?: string;
  location?: LatLng;
  photoUri: string | null;
  attribution?: string;
}

export interface BestTimeSlot {
  hour: number;
  travelMin: number | null;
  crowd: number;
  rainChance: number;
  open: boolean | null;
  score: number;
  best: boolean;
}

export interface BestTimeResult {
  place: { id: string; name: string };
  slots: BestTimeSlot[];
  crowd: { peakNote: string; quietNote: string; evidence: string } | null;
  model: string;
}

export interface FoodCheck {
  place: PlaceInfo | null;
  photoUri: string | null;
  hygieneScore: number;
  verdict: 'looks_safe' | 'some_concerns' | 'serious_concerns' | 'insufficient_data';
  summary: string;
  fdaFindings: Array<{ date: string; action: string; detail: string }>;
  reviewSignals: Array<{ quote: string; signal: 'positive' | 'negative' }>;
  tips: string[];
  communityReports: number;
  sources: Source[];
  helpline: string;
}

export interface FoodAlerts {
  actions: Array<{ date: string; establishment: string; area: string; action: string; reason: string }>;
  summary: string;
  sources: Source[];
  helpline: string;
}

export interface CityEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  area: string;
  category: string;
  description: string;
  url?: string;
  location?: LatLng;
  source: 'web' | 'community';
}

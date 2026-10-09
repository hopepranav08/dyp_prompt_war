import { Firestore } from '@google-cloud/firestore';
import type { LatLng } from '../lib/geo.js';
import type { ReportStatus, TrustSignal } from './trust.js';

export interface StoredReport {
  id: string;
  title: string;
  category: string;
  severity: number;
  summary: string;
  location: LatLng;
  status: ReportStatus;
  trustScore: number;
  signals: TrustSignal[];
  actions: string[];
  authority: string;
  language: string;
  transcript?: string;
  hasPhoto: boolean;
  hasVoice: boolean;
  createdAt: number;
}

export interface ReportStore {
  add(report: StoredReport): Promise<void>;
  recent(sinceMs: number, limit?: number): Promise<StoredReport[]>;
}

export class MemoryReportStore implements ReportStore {
  private readonly reports: StoredReport[] = [];

  async add(report: StoredReport): Promise<void> {
    this.reports.unshift(report);
    this.reports.length = Math.min(this.reports.length, 1000);
  }

  async recent(sinceMs: number, limit = 200): Promise<StoredReport[]> {
    return this.reports.filter((r) => r.createdAt >= sinceMs).slice(0, limit);
  }
}

/** Firestore-backed store so every Cloud Run instance sees the same live citizen reports. */
export class FirestoreReportStore implements ReportStore {
  private readonly col;

  constructor(projectId: string) {
    this.col = new Firestore({ projectId, ignoreUndefinedProperties: true }).collection('reports');
  }

  async add(report: StoredReport): Promise<void> {
    await this.col.doc(report.id).set(report);
  }

  async recent(sinceMs: number, limit = 200): Promise<StoredReport[]> {
    const snap = await this.col.where('createdAt', '>=', sinceMs).orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => d.data() as StoredReport);
  }
}

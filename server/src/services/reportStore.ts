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
  /** Identity Platform uid of a signed-in reporter (never their email). */
  reporterId?: string;
}

export interface ReporterHistory {
  total: number;
  verified: number;
}

export interface ReportStore {
  add(report: StoredReport): Promise<void>;
  recent(sinceMs: number, limit?: number): Promise<StoredReport[]>;
  historyOf(reporterId: string): Promise<ReporterHistory>;
}

/** Reports auto-expire after a week (Firestore TTL policy on `expireAt`) — data minimisation by default. */
export const REPORT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export class MemoryReportStore implements ReportStore {
  private readonly reports: StoredReport[] = [];

  async add(report: StoredReport): Promise<void> {
    this.reports.unshift(report);
    this.reports.length = Math.min(this.reports.length, 1000);
  }

  async recent(sinceMs: number, limit = 200): Promise<StoredReport[]> {
    return this.reports.filter((r) => r.createdAt >= sinceMs).slice(0, limit);
  }

  async historyOf(reporterId: string): Promise<ReporterHistory> {
    const mine = this.reports.filter((r) => r.reporterId === reporterId);
    return { total: mine.length, verified: mine.filter((r) => r.status === 'verified').length };
  }
}

/** Firestore-backed store so every Cloud Run instance sees the same live citizen reports. */
export class FirestoreReportStore implements ReportStore {
  private readonly col;

  constructor(projectId: string) {
    this.col = new Firestore({ projectId, ignoreUndefinedProperties: true }).collection('reports');
  }

  async add(report: StoredReport): Promise<void> {
    await this.col.doc(report.id).set({ ...report, expireAt: new Date(report.createdAt + REPORT_RETENTION_MS) });
  }

  async recent(sinceMs: number, limit = 200): Promise<StoredReport[]> {
    const snap = await this.col.where('createdAt', '>=', sinceMs).orderBy('createdAt', 'desc').limit(limit).get();
    return snap.docs.map((d) => {
      const { expireAt: _expireAt, ...report } = d.data();
      return report as StoredReport;
    });
  }

  async historyOf(reporterId: string): Promise<ReporterHistory> {
    const snap = await this.col.where('reporterId', '==', reporterId).limit(100).select('status').get();
    return { total: snap.size, verified: snap.docs.filter((d) => d.get('status') === 'verified').length };
  }
}

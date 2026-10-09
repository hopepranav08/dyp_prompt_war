import { Firestore } from '@google-cloud/firestore';
import type { LatLng } from '../lib/geo.js';

export interface CityEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string;
  venue: string;
  area: string;
  category: string;
  description: string;
  url?: string;
  location?: LatLng;
  source: 'web' | 'community';
  organizerId?: string;
  createdAt: number;
}

export interface EventStore {
  add(event: CityEvent): Promise<void>;
  upcoming(fromDate: string, limit?: number): Promise<CityEvent[]>;
}

export class MemoryEventStore implements EventStore {
  private readonly events: CityEvent[] = [];

  async add(event: CityEvent): Promise<void> {
    this.events.push(event);
  }

  async upcoming(fromDate: string, limit = 50): Promise<CityEvent[]> {
    return this.events.filter((e) => e.date >= fromDate).sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
  }
}

/** Community-organised events; each document expires the day after the event (Firestore TTL on `expireAt`). */
export class FirestoreEventStore implements EventStore {
  private readonly col;

  constructor(projectId: string) {
    this.col = new Firestore({ projectId, ignoreUndefinedProperties: true }).collection('events');
  }

  async add(event: CityEvent): Promise<void> {
    await this.col.doc(event.id).set({ ...event, expireAt: new Date(new Date(`${event.date}T23:59:59+05:30`).getTime() + 24 * 3600 * 1000) });
  }

  async upcoming(fromDate: string, limit = 50): Promise<CityEvent[]> {
    const snap = await this.col.where('date', '>=', fromDate).orderBy('date').limit(limit).get();
    return snap.docs.map((d) => {
      const { expireAt: _expireAt, ...e } = d.data();
      return e as CityEvent;
    });
  }
}

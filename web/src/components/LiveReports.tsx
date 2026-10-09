import { AlertTriangle, Car, CloudRain, Construction, Flame, Lightbulb, ShieldAlert, Trash, TreePine, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { prettyCategory } from '../lib/format';
import type { Report } from '../lib/types';
import { listItem } from './ui';

const ICONS: Record<string, typeof Car> = {
  accident: Car,
  traffic_jam: Car,
  waterlogging: CloudRain,
  pothole: Construction,
  tree_fall: TreePine,
  unsafe_area: ShieldAlert,
  harassment: Users,
  streetlight_out: Lightbulb,
  garbage: Trash,
  crime: ShieldAlert,
  fire: Flame,
};

const STATUS_DOT = { verified: 'bg-[#6fd394]', corroborated: 'bg-sun', unverified: 'bg-white/40' } as const;

const timeAgo = (ms: number) => {
  const min = Math.max(1, Math.round((Date.now() - ms) / 60000));
  return min < 60 ? `${min} min ago` : `${Math.round(min / 60)} h ago`;
};

/** Charcoal "session history" style feed of the city's live citizen reports. */
export function LiveReports({ reports }: { reports: Report[] }) {
  const verified = reports.filter((r) => r.status === 'verified').length;
  return (
    <section className="card-dark p-5" aria-labelledby="live-reports-title">
      <div className="mb-4 flex items-end justify-between">
        <h3 id="live-reports-title" className="text-lg font-normal">
          Live city reports
        </h3>
        <p className="text-3xl font-light" aria-label={`${verified} of ${reports.length} verified`}>
          {verified}/{reports.length}
        </p>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-white/70">No reports in the last 48 hours. Be the first to flag something.</p>
      ) : (
        <ul className="space-y-3">
          {reports.slice(0, 6).map((r, i) => {
            const Icon = ICONS[r.category] ?? AlertTriangle;
            return (
              <motion.li key={r.id} custom={i} variants={listItem} initial="hidden" animate="show" className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink" aria-hidden>
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{r.title}</p>
                  <p className="text-xs text-white/60">
                    {prettyCategory(r.category)} · {timeAgo(r.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`ml-auto block size-2.5 rounded-full ${STATUS_DOT[r.status]}`} aria-hidden />
                  <p className="mt-1 text-xs text-white/70 capitalize">{r.status}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

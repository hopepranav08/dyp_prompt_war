import { CalendarPlus, ExternalLink, MapPin, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import type { CityEvent } from '../lib/types';
import { AuthButton, useSession } from './Controls';
import { ErrorNote, listItem, SectionTitle, Spinner } from './ui';

const CATEGORIES = ['all', 'music', 'festival', 'culture', 'food', 'tech', 'sports', 'workshop', 'trek', 'community'] as const;
const EMOJI: Record<string, string> = { music: '🎶', festival: '🪔', culture: '🎭', food: '🍛', tech: '💻', sports: '🏏', workshop: '🛠️', trek: '⛰️', community: '🤝', other: '📍' };

const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00+05:30`);
  return { day: d.toLocaleDateString('en-IN', { day: '2-digit', timeZone: 'Asia/Kolkata' }), month: d.toLocaleDateString('en-IN', { month: 'short', timeZone: 'Asia/Kolkata' }), weekday: d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }) };
};

/** Community board: what's on in Pune (Search-grounded) plus moderated events organised by signed-in users. */
export function EventsPanel({ onEvents }: { onEvents: (e: CityEvent[]) => void }) {
  const session = useSession();
  const [events, setEvents] = useState<CityEvent[] | null>(null);
  const [filter, setFilter] = useState<(typeof CATEGORIES)[number]>('all');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api
      .events()
      .then((r) => {
        setEvents(r.events);
        onEvents(r.events);
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shown = (events ?? []).filter((e) => filter === 'all' || e.category === filter);

  return (
    <div>
      <SectionTitle kicker="Community · this fortnight in Pune" title="What’s on in Pune">
        Concerts, festivals, food fests, meetups and treks found live on Google Search and pinned on the map, plus events organised by Punekars themselves.
      </SectionTitle>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary py-2.5" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <CalendarPlus className="size-4" aria-hidden /> Organise an event
        </button>
      </div>

      <AnimatePresence>{open && <OrganiseForm signedIn={Boolean(session)} onCreated={(e) => {
        const next = [e, ...(events ?? [])].sort((a, b) => a.date.localeCompare(b.date));
        setEvents(next);
        onEvents(next);
        setOpen(false);
      }} />}</AnimatePresence>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scroll-soft" role="radiogroup" aria-label="Filter events by category">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={filter === c} onClick={() => setFilter(c)} className={`chip shrink-0 capitalize ${filter === c ? 'bg-primary text-on-primary' : ''}`}>
            {c !== 'all' && <span aria-hidden>{EMOJI[c]}</span>} {c}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3" aria-live="polite">
        {!events && !error && <Spinner label="Finding events across Pune on Google Search…" />}
        {error && <ErrorNote message={error} />}
        {events && shown.length === 0 && <p className="text-sm text-muted">Nothing in this category yet. Be the first to organise one!</p>}
        <ol className="space-y-3">
          {shown.map((e, i) => {
            const d = dayLabel(e.date);
            return (
              <motion.li key={e.id} custom={i} variants={listItem} initial="hidden" animate="show" className="card flex gap-4 p-4 transition-transform hover:-translate-y-0.5">
                <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-sun py-2 text-[#1f1f1f]">
                  <span className="text-[10px] font-semibold uppercase">{d.weekday}</span>
                  <span className="text-2xl leading-none font-semibold">{d.day}</span>
                  <span className="text-[10px] uppercase">{d.month}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="chip capitalize">
                      {EMOJI[e.category] ?? '📍'} {e.category}
                    </span>
                    {e.source === 'community' && (
                      <span className="chip bg-charcoal text-white">
                        <Users className="size-3" aria-hidden /> Community
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1.5 font-medium">{e.title}</h3>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    <MapPin className="size-3 shrink-0" aria-hidden /> {e.venue}
                    {e.area && `, ${e.area}`} {e.time && `· ${e.time}`}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-sm">{e.description}</p>
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium underline">
                      Details & tickets <ExternalLink className="size-3" aria-hidden />
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  )}
                </div>
              </motion.li>
            );
          })}
        </ol>
        {!session && <p className="text-xs text-muted">Want your event here? Sign in, then tap “Organise an event”. Every submission is checked by AI moderation.</p>}
      </div>
    </div>
  );
}

function OrganiseForm({ signedIn, onCreated }: { signedIn: boolean; onCreated: (e: CityEvent) => void }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [form, setForm] = useState({ title: '', date: today, time: '', venue: '', category: 'community', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      onCreated((await api.createEvent(form)).event);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="card mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">Sign in (or continue as guest) to organise an event.</p>
        <AuthButton />
      </motion.div>
    );
  }

  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="card mt-3 grid gap-3 overflow-hidden p-4 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">
        Event title
        <input className="field mt-1" required minLength={4} maxLength={100} value={form.title} onChange={set('title')} placeholder="Sunday Mutha riverside clean-up" />
      </label>
      <label className="text-sm font-medium">
        Date
        <input type="date" className="field mt-1" required min={today} value={form.date} onChange={set('date')} />
      </label>
      <label className="text-sm font-medium">
        Time
        <input className="field mt-1" maxLength={20} value={form.time} onChange={set('time')} placeholder="7:00 AM" />
      </label>
      <label className="text-sm font-medium">
        Venue
        <input className="field mt-1" required minLength={3} maxLength={150} value={form.venue} onChange={set('venue')} placeholder="Z Bridge, Deccan" />
      </label>
      <label className="text-sm font-medium">
        Category
        <select className="field mt-1" value={form.category} onChange={set('category')}>
          {CATEGORIES.filter((c) => c !== 'all').map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium sm:col-span-2">
        Description
        <textarea className="field mt-1 min-h-20" required minLength={10} maxLength={600} value={form.description} onChange={set('description')} placeholder="What, who it's for, what to bring" />
      </label>
      {error && (
        <p role="alert" className="rounded-2xl bg-error-bg p-3 text-sm sm:col-span-2">
          {error}
        </p>
      )}
      <button className="btn btn-primary sm:col-span-2" disabled={busy}>
        {busy ? 'Checking & publishing…' : 'Publish event'}
      </button>
    </motion.form>
  );
}

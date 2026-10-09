import { Crown, Plus, Scale, ThumbsDown, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../lib/api';
import type { CompareResult, CompareScores } from '../lib/types';
import { ErrorNote, listItem, ScoreBar, SectionTitle, Spinner } from './ui';

const AXES: Array<[keyof CompareScores, string]> = [
  ['safety', 'Safety'],
  ['cleanliness', 'Cleanliness'],
  ['affordability', 'Affordability'],
  ['rating', 'Rating'],
  ['accessibility', 'Accessibility'],
];
const SERIES = ['#1a5fd0', '#b3261e', '#1b7a35', '#c88a00'];

export function ComparePanel() {
  const [names, setNames] = useState(['Shaniwar Wada', 'Aga Khan Palace']);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (i: number, v: string) => setNames((n) => n.map((x, j) => (j === i ? v : x)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const list = names.map((n) => n.trim()).filter((n) => n.length >= 2);
    if (list.length < 2) return setError('Enter at least two places.');
    setLoading(true);
    setError('');
    try {
      setResult(await api.compare(list));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const chartData = result ? AXES.map(([key, label]) => ({ axis: label, ...Object.fromEntries(result.results.map((r) => [r.place.name, r.scores[key]])) })) : [];

  return (
    <div>
      <SectionTitle kicker="Best vs worst" title="Compare places honestly">
        Rating, affordability and accessibility come straight from Google Places. Cleanliness and safety come from Gemini reading real reviews (with quotes) plus official black-spot data.
      </SectionTitle>

      <form onSubmit={submit} className="space-y-2">
        {names.map((n, i) => (
          <div key={i} className="flex gap-2">
            <label htmlFor={`cmp-${i}`} className="sr-only">
              Place {i + 1}
            </label>
            <input id={`cmp-${i}`} className="field" value={n} onChange={(e) => update(i, e.target.value)} maxLength={120} placeholder={`Place ${i + 1}`} />
            {names.length > 2 && (
              <button type="button" className="btn bg-white px-3" onClick={() => setNames((x) => x.filter((_, j) => j !== i))} aria-label={`Remove place ${i + 1}`}>
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          {names.length < 4 && (
            <button type="button" className="btn bg-white" onClick={() => setNames((x) => [...x, ''])}>
              <Plus className="size-4" aria-hidden /> Add place
            </button>
          )}
          <button className="btn flex-1 bg-gblue-ink text-white" disabled={loading}>
            <Scale className="size-4" aria-hidden /> Compare
          </button>
        </div>
      </form>

      <div className="mt-5 space-y-3" aria-live="polite">
        {loading && <Spinner label="Reading Google reviews and scoring each place…" />}
        {error && <ErrorNote message={error} />}
        {result && !loading && (
          <>
            <p className="card bg-cream p-3 text-sm font-medium">{result.summary}</p>

            <figure className="card p-2">
              <div className="h-72" aria-hidden>
                <ResponsiveContainer>
                  <RadarChart data={chartData} outerRadius="70%">
                    <PolarGrid stroke="#121212" strokeOpacity={0.25} />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fontWeight: 600, fill: '#121212' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    {result.results.map((r, i) => (
                      <Radar key={r.place.id} name={r.place.name} dataKey={r.place.name} stroke={SERIES[i]} fill={SERIES[i]} fillOpacity={0.15} strokeWidth={2.5} />
                    ))}
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <figcaption className="sr-only">Radar chart comparing places. The same scores are listed below.</figcaption>
            </figure>

            <ul className="space-y-3">
              {[...result.results]
                .sort((a, b) => b.overall - a.overall)
                .map((r, i) => {
                  const best = r.place.id === result.bestId;
                  const worst = r.place.id === result.worstId && !best;
                  return (
                    <motion.li key={r.place.id} custom={i} variants={listItem} initial="hidden" animate="show" className={`card p-4 ${best ? 'ring-2 ring-ggreen-ink' : ''}`}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {best && (
                          <span className="chip bg-ggreen-ink text-white">
                            <Crown className="size-3.5" aria-hidden /> Best
                          </span>
                        )}
                        {worst && (
                          <span className="chip bg-gred-ink text-white">
                            <ThumbsDown className="size-3.5" aria-hidden /> Worst
                          </span>
                        )}
                        <h3 className="font-bold">{r.place.name}</h3>
                        <span className="ml-auto font-mono text-lg font-bold">{r.overall}</span>
                      </div>
                      <p className="mb-3 text-sm">{r.verdict}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {AXES.map(([k, label]) => (
                          <ScoreBar key={k} label={label} value={r.scores[k]} />
                        ))}
                      </div>
                      <dl className="mt-3 space-y-1 text-xs">
                        <div>
                          <dt className="inline font-semibold">Cleanliness evidence: </dt>
                          <dd className="inline italic">{r.evidence.cleanliness || 'n/a'}</dd>
                        </div>
                        <div>
                          <dt className="inline font-semibold">Safety evidence: </dt>
                          <dd className="inline italic">
                            {r.evidence.safety || 'n/a'}
                            {r.evidence.area?.blackspots.length ? ` · near ${r.evidence.area.blackspots.join(', ')}` : ''}
                          </dd>
                        </div>
                      </dl>
                    </motion.li>
                  );
                })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

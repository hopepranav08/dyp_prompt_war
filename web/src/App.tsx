import { Compass, Megaphone, Route, Scale } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ExplorePanel } from './components/ExplorePanel';
import { MapView, type MapLayers } from './components/MapView';
import { PulseBar } from './components/PulseBar';
import { ReportPanel } from './components/ReportPanel';
import { RoutePanel } from './components/RoutePanel';
import { Spinner } from './components/ui';
import { api } from './lib/api';
import type { BlackSpot, LatLng } from './lib/types';

const TABS = [
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'route', label: 'Safe Route', Icon: Route },
  { id: 'report', label: 'Report', Icon: Megaphone },
  { id: 'compare', label: 'Compare', Icon: Scale },
] as const;
type TabId = (typeof TABS)[number]['id'];

const PUNE: LatLng = { lat: 18.5204, lng: 73.8567 };

// The radar chart library is only needed on the Compare tab, so it is code-split out of the first load.
const ComparePanel = lazy(() => import('./components/ComparePanel').then((m) => ({ default: m.ComparePanel })));

export default function App() {
  const [tab, setTab] = useState<TabId>('explore');
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [blackspots, setBlackspots] = useState<BlackSpot[]>([]);
  const [layers, setLayers] = useState<MapLayers>({ places: [], routes: [], reports: [] });
  const [picked, setPicked] = useState<LatLng>(PUNE);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    api.config().then((c) => setMapsKey(c.mapsKey)).catch(() => setMapsKey(''));
    api.blackspots().then((b) => setBlackspots(b.blackspots)).catch(() => undefined);
    api.reports().then((r) => setLayers((l) => ({ ...l, reports: r.reports }))).catch(() => undefined);
  }, []);

  // WAI-ARIA tabs pattern: arrow keys move between tabs, Home/End jump to the ends.
  const onTabKey = useCallback((e: KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    const next = e.key === 'ArrowRight' ? (index === last ? 0 : index + 1) : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]!.id);
    tabRefs.current[next]?.focus();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 btn bg-gyellow">
        Skip to content
      </a>

      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-3 md:p-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-[10px] border-2 border-ink bg-gblue shadow-brutal" aria-hidden>
              <Compass className="size-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl leading-none font-bold md:text-4xl">
                Saha<span className="text-gblue-ink">yatri</span>
              </h1>
              <p className="text-sm font-medium text-muted">Your verified co-pilot for Pune’s beautiful chaos</p>
            </div>
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {['bg-gblue', 'bg-gred', 'bg-gyellow', 'bg-ggreen'].map((c) => (
              <span key={c} className={`h-3 w-8 rounded-full border-2 border-ink ${c}`} />
            ))}
          </div>
        </header>

        <PulseBar />

        <main id="main" className="grid gap-4 lg:grid-cols-[minmax(380px,520px)_1fr]">
          <section className="card flex min-h-0 flex-col bg-paper">
            <div role="tablist" aria-label="Sahayatri features" className="grid grid-cols-4 border-b-2 border-ink">
              {TABS.map(({ id, label, Icon }, i) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="tab"
                    id={`tab-${id}`}
                    aria-selected={active}
                    aria-controls={`panel-${id}`}
                    tabIndex={active ? 0 : -1}
                    onClick={() => setTab(id)}
                    onKeyDown={(e) => onTabKey(e, i)}
                    className={`relative flex flex-col items-center gap-1 px-1 py-3 font-display text-xs font-semibold sm:text-sm ${i > 0 ? 'border-l-2 border-ink' : ''} ${active ? 'bg-gyellow' : 'bg-white hover:bg-cream'} ${i === 0 ? 'rounded-tl-[8px]' : ''} ${i === TABS.length - 1 ? 'rounded-tr-[8px]' : ''}`}
                  >
                    <Icon className="size-5" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="p-4 lg:max-h-[calc(100dvh-220px)] lg:overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  role="tabpanel"
                  id={`panel-${tab}`}
                  aria-labelledby={`tab-${tab}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {tab === 'explore' && <ExplorePanel location={picked} onResult={(r) => setLayers((l) => ({ ...l, places: r.places, routes: [] }))} />}
                  {tab === 'route' && (
                    <RoutePanel
                      selectedId={layers.selectedRouteId}
                      onResult={(r) => setLayers((l) => ({ ...l, routes: r.routes, places: [] }))}
                      onSelect={(id) => setLayers((l) => ({ ...l, selectedRouteId: id }))}
                    />
                  )}
                  {tab === 'report' && <ReportPanel location={picked} onLocate={setPicked} onCreated={(r) => setLayers((l) => ({ ...l, reports: [r, ...l.reports] }))} />}
                  {tab === 'compare' && (
                    <Suspense fallback={<Spinner label="Loading comparison tools…" />}>
                      <ComparePanel />
                    </Suspense>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </section>

          <div className="h-[55vh] lg:sticky lg:top-5 lg:h-[calc(100dvh-200px)]">
            {mapsKey === null ? (
              <div className="card h-full animate-pulse bg-cream" aria-label="Loading map" />
            ) : (
              <MapView
                apiKey={mapsKey}
                center={PUNE}
                blackspots={blackspots}
                {...layers}
                picked={tab === 'report' ? picked : undefined}
                onPick={tab === 'report' ? setPicked : undefined}
              />
            )}
          </div>
        </main>

        <footer className="pb-4 text-center text-xs text-muted">
          Built with Gemini on Vertex AI · Grounding with Google Maps & Search · Places, Routes, Weather & Air Quality APIs · Firestore · Cloud Run.
          <br />
          Black spots from Pune City Police & Traffic Police public reports (approximate locations). In an emergency, call 112.
        </footer>
      </div>
    </MotionConfig>
  );
}

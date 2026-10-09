import { ArrowLeft, Compass, Megaphone, Route, Scale } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../lib/api';
import type { BlackSpot, LatLng } from '../lib/types';
import { ExplorePanel } from './ExplorePanel';
import { MapView, type MapLayers } from './MapView';
import { PulseBar } from './PulseBar';
import { ReportPanel } from './ReportPanel';
import { RoutePanel } from './RoutePanel';
import { Spinner } from './ui';

// The radar chart library is only needed on the Compare tab, so it is code-split out of the first load.
const ComparePanel = lazy(() => import('./ComparePanel').then((m) => ({ default: m.ComparePanel })));

const TABS = [
  { id: 'explore', label: 'Explore', Icon: Compass },
  { id: 'route', label: 'Safe Route', Icon: Route },
  { id: 'report', label: 'Report', Icon: Megaphone },
  { id: 'compare', label: 'Compare', Icon: Scale },
] as const;
type TabId = (typeof TABS)[number]['id'];

const PUNE: LatLng = { lat: 18.5204, lng: 73.8567 };

export function CoPilot() {
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
    <>
      <a href="#main" className="btn sr-only bg-sun focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Skip to content
      </a>

      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-3 md:gap-5 md:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a href="/" className="btn btn-icon" aria-label="Back to home">
              <ArrowLeft className="size-4" aria-hidden />
            </a>
            <div>
              <p className="font-deva text-3xl leading-none md:text-4xl" lang="mr">
                सहयात्री
              </p>
              <h1 className="text-xs font-medium tracking-[0.2em] text-ink uppercase">Sahayatri · city co-pilot</h1>
            </div>
          </div>

          <div role="tablist" aria-label="Sahayatri features" className="grid w-full grid-cols-4 gap-1 rounded-[28px] bg-white/40 p-1.5 backdrop-blur md:flex md:w-auto md:rounded-full">
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
                  className={`relative flex flex-col items-center gap-1 rounded-full px-2 py-2.5 text-xs font-medium transition-colors md:flex-row md:gap-2 md:px-4 md:text-sm ${active ? 'text-white' : 'text-ink hover:bg-white/70'}`}
                >
                  {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-charcoal shadow-soft" transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} />}
                  <Icon className="relative size-4" aria-hidden />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>
        </header>

        <PulseBar />

        <main id="main" className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(380px,540px)_1fr]">
          <section className="panel min-h-0 p-5 md:p-7 lg:max-h-[calc(100dvh-230px)] lg:overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`tab-${tab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {tab === 'explore' && <ExplorePanel location={picked} onResult={(r) => setLayers((l) => ({ ...l, places: r.places, routes: [] }))} />}
                {tab === 'route' && (
                  <RoutePanel
                    selectedId={layers.selectedRouteId}
                    onResult={(r) => setLayers((l) => ({ ...l, routes: r.routes, places: [] }))}
                    onSelect={(id) => setLayers((l) => ({ ...l, selectedRouteId: id }))}
                  />
                )}
                {tab === 'report' && (
                  <ReportPanel
                    location={picked}
                    reports={layers.reports}
                    onLocate={setPicked}
                    onCreated={(r) => setLayers((l) => ({ ...l, reports: [r, ...l.reports] }))}
                  />
                )}
                {tab === 'compare' && (
                  <Suspense fallback={<Spinner label="Loading comparison tools…" />}>
                    <ComparePanel />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          <div className="h-[60vh] lg:sticky lg:top-6 lg:h-[calc(100dvh-230px)]">
            {mapsKey === null ? (
              <div className="panel h-full animate-pulse" aria-label="Loading map" />
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

        <footer className="pb-4 text-center text-xs text-ink">
          Gemini on Vertex AI · Grounding with Google Maps & Search · Places, Routes, Weather & Air Quality APIs · Firestore · Cloud Run
          <br />
          Black spots from Pune City Police & Traffic Police public reports (approximate locations). In an emergency, call 112.
        </footer>
      </div>
    </>
  );
}

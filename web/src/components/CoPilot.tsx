import { ArrowLeft, CalendarHeart, Compass, IndianRupee, Megaphone, Route, Scale } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { api } from '../lib/api';
import type { MessageKey } from '../lib/i18n';
import { usePrefs } from '../lib/prefs';
import type { BlackSpot, ExplorePlace, LatLng, PlanResult, ScoredRoute } from '../lib/types';
import { AuthButton, LangSwitcher, ThemeToggle } from './Controls';
import { ExplorePanel } from './ExplorePanel';
import { FarePanel } from './FarePanel';
import { MapView, type MapLayers } from './MapView';
import { PlanPanel } from './PlanPanel';
import { PulseBar } from './PulseBar';
import { ReportPanel } from './ReportPanel';
import { RoutePanel } from './RoutePanel';
import { Spinner } from './ui';

// The radar chart library is only needed on the Compare tab, so it is code-split out of the first load.
const ComparePanel = lazy(() => import('./ComparePanel').then((m) => ({ default: m.ComparePanel })));

const TABS = [
  { id: 'explore', label: 'tab.explore', Icon: Compass },
  { id: 'plan', label: 'tab.plan', Icon: CalendarHeart },
  { id: 'route', label: 'tab.route', Icon: Route },
  { id: 'fare', label: 'tab.fare', Icon: IndianRupee },
  { id: 'report', label: 'tab.report', Icon: Megaphone },
  { id: 'compare', label: 'tab.compare', Icon: Scale },
] as const satisfies ReadonlyArray<{ id: string; label: MessageKey; Icon: unknown }>;
type TabId = (typeof TABS)[number]['id'];

const PUNE: LatLng = { lat: 18.5204, lng: 73.8567 };

/** Deep links from the landing page: /app?tab=plan */
function initialTab(): TabId {
  const tab = new URLSearchParams(window.location.search).get('tab');
  return TABS.some((x) => x.id === tab) ? (tab as TabId) : 'explore';
}

/** Turns a day plan into map layers: verified stops as numbered pins, every leg as a highlighted route. */
function planLayers(r: PlanResult): Pick<MapLayers, 'places' | 'routes' | 'selectedRouteId'> {
  const places: ExplorePlace[] = r.stops.map((s) => ({ name: s.name, category: s.category, why: s.why, budget: '', bestTime: s.startTime, safetyNote: '', verified: s.verified, place: s.place, area: s.area }));
  const routes: ScoredRoute[] = r.legs.map((l) => ({ id: `leg-${l.toIndex}`, durationSec: l.minutes * 60, distanceM: l.km * 1000, path: l.path, safetyScore: l.safetyScore, riskPoints: 0, factors: [], tags: [] }));
  return { places, routes, selectedRouteId: 'all' };
}

export function CoPilot() {
  const { t } = usePrefs();
  const [tab, setTab] = useState<TabId>(initialTab);
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

  const showRoutes = (routes: ScoredRoute[], selectedRouteId?: string) => setLayers((l) => ({ ...l, places: [], routes, selectedRouteId }));

  return (
    <>
      <a href="#main" className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">
        Skip to content
      </a>

      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-3 md:gap-5 md:p-6">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <a href="/" className="btn btn-icon shrink-0" aria-label={t('nav.home')}>
                <ArrowLeft className="size-4" aria-hidden />
              </a>
              <div className="min-w-0">
                <p className="font-deva text-3xl leading-none md:text-4xl" lang="mr">
                  सहयात्री
                </p>
                <h1 className="truncate text-[11px] font-medium tracking-[0.2em] uppercase">{t('app.tagline')}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden sm:block">
                <LangSwitcher />
              </div>
              <ThemeToggle />
              <AuthButton />
            </div>
          </div>
          <div className="flex justify-center sm:hidden">
            <LangSwitcher />
          </div>

          <div role="tablist" aria-label="Sahayatri features" className="grid grid-cols-3 gap-1 rounded-[28px] bg-surface/50 p-1.5 shadow-soft backdrop-blur sm:grid-cols-6 lg:mx-auto lg:flex lg:rounded-full">
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
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-full px-2 py-2.5 text-xs font-medium transition-colors md:flex-row md:gap-2 md:px-4 md:text-sm ${active ? 'text-on-primary' : 'text-ink hover:bg-surface/70'}`}
                >
                  {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-primary shadow-soft" transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} />}
                  <Icon className="relative size-4 shrink-0" aria-hidden />
                  <span className="relative text-center leading-tight">{t(label)}</span>
                </button>
              );
            })}
          </div>
        </header>

        <PulseBar />

        <main id="main" className="grid gap-4 md:gap-5 lg:grid-cols-[minmax(400px,560px)_1fr]">
          <section className="panel scroll-soft min-h-0 p-5 md:p-7 lg:max-h-[calc(100dvh-260px)] lg:overflow-y-auto">
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
                {tab === 'plan' && <PlanPanel onResult={(r) => setLayers((l) => ({ ...l, ...planLayers(r) }))} />}
                {tab === 'route' && (
                  <RoutePanel
                    selectedId={layers.selectedRouteId}
                    onResult={(r) => showRoutes(r.routes)}
                    onSelect={(id) => setLayers((l) => ({ ...l, selectedRouteId: id }))}
                  />
                )}
                {tab === 'fare' && (
                  <FarePanel
                    onResult={(r) =>
                      showRoutes([{ id: 'fare', durationSec: r.route.durationSec, distanceM: r.route.distanceM, path: r.route.path, safetyScore: 100, riskPoints: 0, factors: [], tags: [] }], 'fare')
                    }
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
                  <Suspense fallback={<Spinner label={t('compare.loading')} />}>
                    <ComparePanel />
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          </section>

          <div className="h-[60vh] min-h-80 lg:sticky lg:top-6 lg:h-[calc(100dvh-260px)]">
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

        <footer className="pb-4 text-center text-xs leading-relaxed">
          {t('footer.credits')}
          <br />
          {t('footer.emergency')}
        </footer>
      </div>
    </>
  );
}

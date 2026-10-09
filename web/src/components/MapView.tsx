import { AdvancedMarker, APIProvider, InfoWindow, Map, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { MapPinned } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { BlackSpot, ExplorePlace, LatLng, Report, ScoredRoute } from '../lib/types';

export interface MapLayers {
  places: ExplorePlace[];
  routes: ScoredRoute[];
  selectedRouteId?: string;
  reports: Report[];
  picked?: LatLng;
}

interface Props extends MapLayers {
  apiKey: string;
  center: LatLng;
  blackspots: BlackSpot[];
  onPick?: (p: LatLng) => void;
}

const STATUS_COLOR = { verified: 'var(--color-ggreen-ink)', corroborated: 'var(--color-gyellow)', unverified: '#ffffff' } as const;

function RouteLines({ routes, selectedId }: { routes: ScoredRoute[]; selectedId?: string }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const lines = routes.flatMap((r) => {
      const selected = r.id === selectedId;
      const color = selected ? (r.tags.includes('safest') ? '#1b7a35' : '#1a5fd0') : '#8a8a8a';
      // A dark casing under each line keeps routes legible on any map background.
      return [
        new google.maps.Polyline({ map, path: r.path, strokeColor: '#121212', strokeWeight: selected ? 10 : 6, strokeOpacity: selected ? 1 : 0.35, zIndex: selected ? 9 : 1 }),
        new google.maps.Polyline({ map, path: r.path, strokeColor: color, strokeWeight: selected ? 6 : 3, strokeOpacity: 1, zIndex: selected ? 10 : 2 }),
      ];
    });
    return () => lines.forEach((l) => l.setMap(null));
  }, [map, routes, selectedId]);
  return null;
}

function FitBounds({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
  useEffect(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]!);
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export function MapView({ apiKey, center, blackspots, places, routes, selectedRouteId, reports, picked, onPick }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const focusPoints = useMemo(() => {
    const selected = routes.find((r) => r.id === selectedRouteId) ?? routes[0];
    if (selected) return selected.path.filter((_, i) => i % 5 === 0);
    return places.flatMap((p) => (p.place?.location ? [p.place.location] : []));
  }, [routes, selectedRouteId, places]);

  if (!apiKey) {
    return (
      <div className="card grid h-full min-h-72 place-items-center p-6 text-center">
        <div>
          <MapPinned className="mx-auto mb-2 size-8" aria-hidden />
          <p className="font-display font-semibold">Map unavailable</p>
          <p className="text-sm text-muted">Results still work below. The map needs a Maps JavaScript API key.</p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} region="IN" language="en">
      <div className="card relative h-full min-h-72 overflow-hidden" role="region" aria-label="Interactive map of Pune with places, routes, black spots and citizen reports">
        <Map
          defaultCenter={center}
          defaultZoom={12}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          clickableIcons={false}
          streetViewControl={false}
          mapTypeControl={false}
          onClick={(e: MapMouseEvent) => e.detail.latLng && onPick?.(e.detail.latLng)}
          className="h-full w-full"
        >
          <RouteLines routes={routes} selectedId={selectedRouteId} />
          <FitBounds points={focusPoints} />

          {blackspots.map((b) => (
            <AdvancedMarker key={b.id} position={b} title={`Accident black spot: ${b.name}`} onClick={() => setOpen(`b:${b.id}`)}>
              <span className="grid size-6 place-items-center rounded-md border-2 border-ink bg-gred font-mono text-xs font-bold text-white shadow-brutal-sm" aria-hidden>
                !
              </span>
            </AdvancedMarker>
          ))}

          {reports.map((r) => (
            <AdvancedMarker key={r.id} position={r.location} title={`${r.status} report: ${r.title}`} onClick={() => setOpen(`r:${r.id}`)}>
              <span className="block size-4 rotate-45 border-2 border-ink shadow-brutal-sm" style={{ background: STATUS_COLOR[r.status] }} aria-hidden />
            </AdvancedMarker>
          ))}

          {places.map((p, i) =>
            p.place?.location ? (
              <AdvancedMarker key={p.place.id} position={p.place.location} title={p.name} zIndex={50} onClick={() => setOpen(`p:${i}`)}>
                <span className="grid size-8 place-items-center rounded-full border-2 border-ink bg-gblue-ink font-display text-sm font-bold text-white shadow-brutal-sm" aria-hidden>
                  {i + 1}
                </span>
              </AdvancedMarker>
            ) : null,
          )}

          {picked && (
            <AdvancedMarker position={picked} title="Report location" zIndex={60}>
              <span className="grid size-8 place-items-center rounded-full border-2 border-ink bg-gyellow shadow-brutal-sm" aria-hidden>
                <MapPinned className="size-4" />
              </span>
            </AdvancedMarker>
          )}

          {open?.startsWith('b:') &&
            (() => {
              const b = blackspots.find((x) => `b:${x.id}` === open);
              return b ? (
                <InfoWindow position={b} onCloseClick={() => setOpen(null)} headerContent={<strong>{b.name}</strong>}>
                  <p className="max-w-56 text-sm">{b.note}</p>
                </InfoWindow>
              ) : null;
            })()}
          {open?.startsWith('r:') &&
            (() => {
              const r = reports.find((x) => `r:${x.id}` === open);
              return r ? (
                <InfoWindow position={r.location} onCloseClick={() => setOpen(null)} headerContent={<strong>{r.title}</strong>}>
                  <p className="max-w-56 text-sm">
                    {r.status.toUpperCase()} · trust {r.trustScore}/100
                    <br />
                    {r.summary}
                  </p>
                </InfoWindow>
              ) : null;
            })()}
          {open?.startsWith('p:') &&
            (() => {
              const p = places[Number(open.slice(2))];
              return p?.place?.location ? (
                <InfoWindow position={p.place.location} onCloseClick={() => setOpen(null)} headerContent={<strong>{p.name}</strong>}>
                  <p className="max-w-56 text-sm">{p.why}</p>
                </InfoWindow>
              ) : null;
            })()}
        </Map>

        <ul className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5 text-[11px]" aria-label="Map legend">
          <li className="chip">
            <span className="size-2.5 rounded-sm bg-gred" aria-hidden /> Black spot
          </li>
          <li className="chip">
            <span className="size-2.5 rounded-full bg-gblue-ink" aria-hidden /> Place
          </li>
          <li className="chip">
            <span className="size-2.5 rotate-45 bg-ggreen-ink" aria-hidden /> Verified report
          </li>
        </ul>
      </div>
    </APIProvider>
  );
}

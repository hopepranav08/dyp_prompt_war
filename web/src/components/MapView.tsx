import { APIProvider, InfoWindow, Map, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { MapPinned, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

/** Warm monochrome basemap so the sunflower pins and routes carry all the colour. */
const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#ecebe7' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6a6862' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f6f6f4' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#e1e0d8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#d6d5d0' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c4c3bd' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c3c8d0' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#c9c8c2' }] },
];

const STATUS_COLOR = { verified: 'var(--color-ok)', corroborated: 'var(--color-sun)', unverified: '#ffffff' } as const;

/** Accessible HTML marker: a real <button> rendered into the map's overlay pane via OverlayView. */
function HtmlMarker({ position, label, zIndex = 1, onClick, children }: { position: LatLng; label: string; zIndex?: number; onClick?: () => void; children: ReactNode }) {
  const map = useMap();
  const [container] = useState(() => document.createElement('div'));

  useEffect(() => {
    if (!map) return;
    container.style.position = 'absolute';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = String(zIndex);
    google.maps.OverlayView.preventMapHitsAndGesturesFrom(container);

    const overlay = new google.maps.OverlayView();
    overlay.onAdd = () => overlay.getPanes()?.overlayMouseTarget.appendChild(container);
    overlay.draw = () => {
      const p = overlay.getProjection()?.fromLatLngToDivPixel(position);
      if (p) {
        container.style.left = `${p.x}px`;
        container.style.top = `${p.y}px`;
      }
    };
    overlay.onRemove = () => container.remove();
    overlay.setMap(map);
    return () => overlay.setMap(null);
  }, [map, container, position.lat, position.lng, zIndex]);

  return createPortal(
    <button type="button" aria-label={label} title={label} onClick={onClick} className="block cursor-pointer transition-transform hover:scale-110 focus-visible:scale-110">
      {children}
    </button>,
    container,
  );
}

function RouteLines({ routes, selectedId }: { routes: ScoredRoute[]; selectedId?: string }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const lines = routes.flatMap((r) => {
      const selected = r.id === selectedId;
      return [
        new google.maps.Polyline({ map, path: r.path, strokeColor: '#222222', strokeWeight: selected ? 11 : 6, strokeOpacity: selected ? 1 : 0.25, zIndex: selected ? 9 : 1 }),
        new google.maps.Polyline({ map, path: r.path, strokeColor: selected ? '#f7cd4b' : '#9b9a95', strokeWeight: selected ? 5 : 3, zIndex: selected ? 10 : 2 }),
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
    map.fitBounds(bounds, 70);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function ZoomControls() {
  const map = useMap();
  const zoom = (d: number) => map?.setZoom((map.getZoom() ?? 12) + d);
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      <button type="button" className="btn btn-icon" onClick={() => zoom(1)} aria-label="Zoom in">
        <Plus className="size-4" aria-hidden />
      </button>
      <button type="button" className="btn btn-icon" onClick={() => zoom(-1)} aria-label="Zoom out">
        <Minus className="size-4" aria-hidden />
      </button>
    </div>
  );
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
      <div className="panel grid h-full min-h-72 place-items-center p-6 text-center">
        <div>
          <MapPinned className="mx-auto mb-2 size-8" aria-hidden />
          <p className="font-medium">Map unavailable</p>
          <p className="text-sm text-muted">Results still work. The map needs a Maps JavaScript API key.</p>
        </div>
      </div>
    );
  }

  const blackspot = open?.startsWith('b:') ? blackspots.find((x) => `b:${x.id}` === open) : undefined;
  const report = open?.startsWith('r:') ? reports.find((x) => `r:${x.id}` === open) : undefined;
  const place = open?.startsWith('p:') ? places[Number(open.slice(2))] : undefined;

  return (
    <APIProvider apiKey={apiKey} region="IN" language="en">
      <div className="panel relative h-full min-h-72 overflow-hidden p-2" role="region" aria-label="Map of Pune with places, routes, accident black spots and citizen reports">
        <div className="absolute top-5 left-6 z-10">
          <p className="text-2xl font-light">Map session</p>
          <p className="text-xs text-muted">{blackspots.length} black spots · {reports.length} live reports</p>
        </div>
        <Map
          defaultCenter={center}
          defaultZoom={12}
          styles={MAP_STYLE}
          gestureHandling="greedy"
          disableDefaultUI
          clickableIcons={false}
          onClick={(e: MapMouseEvent) => e.detail.latLng && onPick?.(e.detail.latLng)}
          className="h-full w-full overflow-hidden rounded-[26px]"
        >
          <RouteLines routes={routes} selectedId={selectedRouteId} />
          <FitBounds points={focusPoints} />
          <ZoomControls />

          {blackspots.map((b) => (
            <HtmlMarker key={b.id} position={b} label={`Accident black spot: ${b.name}`} onClick={() => setOpen(`b:${b.id}`)}>
              <span className="grid size-6 place-items-center rounded-full border-2 border-white bg-charcoal text-[11px] font-bold text-sun shadow-soft">!</span>
            </HtmlMarker>
          ))}

          {reports.map((r) => (
            <HtmlMarker key={r.id} position={r.location} zIndex={20} label={`${r.status} report: ${r.title}`} onClick={() => setOpen(`r:${r.id}`)}>
              <span className="block size-4 rotate-45 rounded-[4px] border-2 border-charcoal shadow-soft" style={{ background: STATUS_COLOR[r.status] }} />
            </HtmlMarker>
          ))}

          {places.map((p, i) =>
            p.place?.location ? (
              <HtmlMarker key={p.place.id} position={p.place.location} zIndex={50} label={`${i + 1}. ${p.name}`} onClick={() => setOpen(`p:${i}`)}>
                <span className="grid size-9 place-items-center rounded-full border-[3px] border-white bg-sun text-sm font-semibold text-ink shadow-lift">{i + 1}</span>
              </HtmlMarker>
            ) : null,
          )}

          {picked && (
            <HtmlMarker position={picked} zIndex={60} label="Selected report location">
              <span className="grid size-10 place-items-center rounded-full border-[3px] border-white bg-charcoal text-sun shadow-lift">
                <MapPinned className="size-4" aria-hidden />
              </span>
            </HtmlMarker>
          )}

          {blackspot && (
            <InfoWindow position={blackspot} onCloseClick={() => setOpen(null)} headerContent={<strong>{blackspot.name}</strong>}>
              <p className="max-w-56 text-sm">{blackspot.note}</p>
            </InfoWindow>
          )}
          {report && (
            <InfoWindow position={report.location} onCloseClick={() => setOpen(null)} headerContent={<strong>{report.title}</strong>}>
              <p className="max-w-56 text-sm">
                {report.status.toUpperCase()} · trust {report.trustScore}/100
                <br />
                {report.summary}
              </p>
            </InfoWindow>
          )}
          {place?.place?.location && (
            <InfoWindow position={place.place.location} onCloseClick={() => setOpen(null)} headerContent={<strong>{place.name}</strong>}>
              <p className="max-w-56 text-sm">{place.why}</p>
            </InfoWindow>
          )}
        </Map>

        <ul className="pointer-events-none absolute bottom-5 left-5 flex flex-wrap gap-1.5" aria-label="Map legend">
          <li className="chip shadow-soft">
            <span className="size-2.5 rounded-full bg-charcoal" aria-hidden /> Black spot
          </li>
          <li className="chip shadow-soft">
            <span className="size-2.5 rounded-full bg-sun" aria-hidden /> Place
          </li>
          <li className="chip shadow-soft">
            <span className="size-2.5 rotate-45 bg-ok" aria-hidden /> Verified report
          </li>
        </ul>
      </div>
    </APIProvider>
  );
}

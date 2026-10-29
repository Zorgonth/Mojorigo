import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import { t, locationLabel } from '../i18n';
import type { RouteGroup } from './collection-routes';
import { decodeRoutePolyline } from './route-polyline';

function FitRoute({ points }: {points: [number, number][]}) {
 const map = useMap();
 useEffect(() => {
  const fit = () => {
   if (!map.getContainer().clientWidth || !map.getContainer().clientHeight) return;
   map.invalidateSize({pan: false});
   map.fitBounds(L.latLngBounds(points), {padding: [12, 12], maxZoom: 17, animate: false});
  };
  const observer = new ResizeObserver(fit);
  observer.observe(map.getContainer()); fit();
  return () => observer.disconnect();
 }, [map, points]);
 return null;
}
export default function RoutePreviewMap({ group }: {group: RouteGroup}) {
 useTranslation();
 const host = useRef<HTMLDivElement>(null);
 const [visible, setVisible] = useState(false);
 const points = useMemo(() => decodeRoutePolyline(group.route.encodedPolyline ?? ''), [group.route.encodedPolyline]);
 useEffect(() => {
  if (!host.current) return;
  const observer = new IntersectionObserver(entries => {
   if (entries.some(entry => entry.isIntersecting)) {setVisible(true); observer.disconnect();}
  });
  observer.observe(host.current);
  return () => observer.disconnect();
 }, []);
 if (points.length < 2) return <p className="route-message">{t("Route map unavailable: no valid route geometry was returned.")}</p>;
 return <div className="route-preview-map" ref={host} role="img" aria-label={t("Route {{group}} map with numbered collection stops", {group: group.group})}>
  {visible && <MapContainer center={points[0]} zoom={12} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false} zoomAnimation={false} fadeAnimation={false}>
   <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' detectRetina maxZoom={19}/>
   <FitRoute points={points}/>
   <Polyline positions={points} pathOptions={{color: '#fff', weight: 8, opacity: .9}}/>
   <Polyline positions={points} pathOptions={{color: '#005a9c', weight: 4, opacity: 1}}/>
   {group.stops.map((stop,index) => typeof stop.latitude === 'number' && typeof stop.longitude === 'number' && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude) && Math.abs(stop.latitude) <= 90 && Math.abs(stop.longitude) <= 180 && <Marker key={stop.id ?? index} position={[stop.latitude,stop.longitude]} keyboard={false}
    icon={L.divIcon({className: 'route-stop-marker', html: `<span>${index + 1}</span>`, iconSize: [28,28], iconAnchor: [14,14]})}>
    <Tooltip>{index + 1}. {locationLabel(stop.name || stop.address || t('Collection location'))}</Tooltip>
   </Marker>)}
  </MapContainer>}
 </div>;
}

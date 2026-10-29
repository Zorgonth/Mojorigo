import { useTranslation } from "react-i18next";
import { locationLabel, t } from "../i18n";
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, ZoomControl, ScaleControl, Circle, CircleMarker, Marker, Tooltip, useMap } from 'react-leaflet';
import { parseMapResponse, locationTitle, locationSubtitle, type GlassColor, type GlassBin } from './bin-data';
import 'leaflet/dist/leaflet.css';
import './GlassBinsMap.css';
import SensorLevels from './SensorLevels';
import GlassFilters from './GlassFilters';
import ClusteredBins from './ClusteredBins';
import { rankByDistance } from './postcode-search';
function ResizeMap() {
  useTranslation();
 const map = useMap();
 useEffect(() => {
  const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  observer.observe(map.getContainer());
  return () => observer.disconnect();
 }, [map]);
 return null;
}
function FitMapToBins({ bins, location, animate }: { bins: GlassBin[]; location: [number, number] | null; animate: boolean }) {
  useTranslation();
 const map = useMap();
 useEffect(() => {
  if (location) {
    const nearest = rankByDistance(bins, location).slice(0, 5);
    const radius = Math.max(500, nearest.at(-1)?.distanceMetres ?? 500);
    const bounds = L.latLng(location).toBounds(radius * 2);
    const sidebar = map.getContainer().closest('.finder-page')?.querySelector('.glass-sidebar:not([inert])');
    const left = window.innerWidth > 760 && sidebar ? sidebar.getBoundingClientRect().right - map.getContainer().getBoundingClientRect().left + 24 : 35;
    map.fitBounds(bounds, {paddingTopLeft: [left, 135], paddingBottomRight: [35, 55], maxZoom: 16, animate});
    return;
  }
  if (!bins.length) return;
  map.fitBounds(L.latLngBounds(bins.map(bin => [bin.latitude, bin.longitude] as [number, number])), {padding:[40,40],maxZoom:15,animate});
 }, [bins, location, map, animate]);
 return null;
}
const searchLocationIcon = L.divIcon({
 className: "search-location-marker",
 html: `<svg width="34" height="44" viewBox="0 0 44 56" fill="none" aria-hidden="true"><path d="M22 53s19-20 19-31a19 19 0 1 0-38 0c0 11 19 31 19 31Z" fill="#005a9c" stroke="white" stroke-width="3"/><circle cx="22" cy="22" r="8" fill="white"/><circle cx="22" cy="22" r="4" fill="#005a9c"/></svg>`,
 iconSize: [34, 44], iconAnchor: [17, 42], tooltipAnchor: [0, -34],
});
function SearchArea({ bins, location }: { bins: GlassBin[]; location: [number, number] | null }) {
 useTranslation();
 if (!location) return null;
 const nearest = rankByDistance(bins, location).slice(0, 5);
 const radius = Math.max(500, nearest.at(-1)?.distanceMetres ?? 500);
 return <>
  <Circle center={location} radius={radius} interactive={false} pathOptions={{color: "#005a9c", weight: 2, opacity: .5, dashArray: "6 7", fillColor: "#3b8cc8", fillOpacity: .1}}/>
  <Marker position={location} icon={searchLocationIcon} zIndexOffset={1000} title={t("Search location · nearby containers highlighted")} alt={t("Search location · nearby containers highlighted")}>
   <Tooltip>{t("Search location · nearby containers highlighted")}</Tooltip>
  </Marker>
  {nearest.map(bin => <CircleMarker key={bin.id} center={[bin.latitude, bin.longitude]} radius={25} interactive={false} pathOptions={{stroke: false, fillColor: "#005a9c", fillOpacity: .16}}/>)}
 </>;
}
function PopupSensorLevels({ bin }: {bin: GlassBin}) {
 const [color,setColor] = useState<GlassColor>("All");
 return <><div className="location-colour-controls"><GlassFilters selected={color} onChange={setColor}/></div><SensorLevels bin={bin} color={color}/></>;
}
function ControlledMap({ bins, selected, onSelect, location, color, onReady, animate, showDetails }: { bins: GlassBin[]; selected: string | null; onSelect: (id: string | null) => void; location: [number, number] | null; color: GlassColor; onReady?: () => void; animate: boolean; showDetails: boolean }) {
  useTranslation();
 const bin = bins.find(b => b.id === selected);
 return <div className="glass-bins-map"><MapContainer center={location ?? [49.145,9.211]} zoom={14} zoomAnimation={animate} fadeAnimation={animate} markerZoomAnimation={animate} maxZoom={19} zoomControl={false} className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" tileSize={256} zoomOffset={0} maxZoom={19} maxNativeZoom={19} detectRetina eventHandlers={{load: () => onReady?.()}}/><ResizeMap/><FitMapToBins bins={bins} location={location} animate={animate}/><ZoomControl key={t("Zoom in")} position="bottomright" zoomInTitle={t("Zoom in")} zoomOutTitle={t("Zoom out")}/><ScaleControl position="bottomleft" imperial={false}/><SearchArea bins={bins} location={location}/><ClusteredBins bins={bins} color={color} selected={selected} onSelect={onSelect} popupContent={bin && <article className="selected-bin-panel"><button className="close-panel" aria-label={t("Close bin details")} onClick={()=>onSelect(null)}>×</button><div className="selected-bin-content"><div className="selected-bin-copy"><strong>{locationLabel(locationTitle(bin))}</strong><p>{locationSubtitle(bin)}</p></div></div><PopupSensorLevels key={bin.id} bin={bin}/><div className="selected-bin-actions"><a href={`https://www.google.com/maps/dir/?api=1&destination=${bin.latitude},${bin.longitude}&travelmode=walking`} target="_blank" rel="noreferrer">{t("↗ Directions")}</a>{showDetails && <button onClick={()=>document.getElementById('bin-extra')?.toggleAttribute('hidden')}>{t("ⓘ View details")}</button>}</div>{showDetails && <p id="bin-extra" hidden>{locationLabel(locationTitle(bin))} · {bin.city || "Heilbronn"}{bin.sensors.filter(sensor => color === "All" || sensor.color === color).map(sensor => <span className="sensor-detail" key={sensor.color}>{t(sensor.color)}: {sensor.sensorId || t("Not configured")} · {sensor.cm === null ? t("Distance unavailable") : `${sensor.cm} cm`}</span>)}</p>}</article>}/></MapContainer></div>;
}

// Dashboard callers can load their own map; the home screen shares its data with the sidebar.
type MapProps = {
 bins?: GlassBin[]; selected?: string | null; onSelect?: (id: string | null) => void;
 location?: [number, number] | null; color?: GlassColor;
 onReady?: () => void;
 animate?: boolean;
 showDetails?: boolean;
 glassType?: "all" | "green" | "white" | "brown"; searchTerm?: string;
};
export default function GlassBinsMap(props: MapProps) {
  useTranslation();
 const [loaded, setLoaded] = useState<GlassBin[]>([]);
 const [selected, setSelected] = useState<string | null>(null);
 const [error, setError] = useState("");
 useEffect(() => {
  if (props.bins) return;
  const controller = new AbortController();
  fetch("http://localhost:3001/api/osm-bins/map", {signal: controller.signal})
   .then(r => { if (!r.ok) throw new Error("Could not load container locations"); return r.json(); })
   .then(data => { setLoaded(parseMapResponse(data)); setError(""); })
   .catch(e => { if (!controller.signal.aborted) setError(e.message); });
  return () => controller.abort();
 }, [props.bins]);
 const color = props.color ?? ({all:"All",green:"Green",white:"White",brown:"Brown"} as const)[props.glassType ?? "all"];
 const query = props.searchTerm?.trim().toLowerCase();
 const bins = useMemo(() => props.bins ?? loaded.filter(b => (color === "All" || b.sensors.some(s => s.color === color && s.sensorId)) && (!query || `${b.name} ${b.address} ${b.city} ${b.area} ${b.postcode}`.toLowerCase().includes(query))), [props.bins, loaded, color, query]);
 return <>{error && <p role="alert">{t(error)}</p>}<ControlledMap bins={bins} selected={props.selected === undefined ? selected : props.selected} onSelect={props.onSelect ?? setSelected} location={props.location ?? null} color={color} onReady={props.onReady} animate={props.animate ?? true} showDetails={props.showDetails ?? true}/></>;
}

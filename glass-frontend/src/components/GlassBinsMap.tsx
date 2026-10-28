import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, ZoomControl, ScaleControl, useMap } from 'react-leaflet';
import { fillTone, binFill, parseMapResponse, locationTitle, locationSubtitle, type GlassColor, type GlassBin } from './bin-data';
import 'leaflet/dist/leaflet.css';
import './GlassBinsMap.css';
import SensorLevels from './SensorLevels';
function ResizeMap() {
 const map = useMap();
 useEffect(() => {
  const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  observer.observe(map.getContainer());
  return () => observer.disconnect();
 }, [map]);
 return null;
}
function FitMapToBins({ bins, location }: { bins: GlassBin[]; location: [number, number] | null }) {
 const map = useMap();
 useEffect(() => {
  if (location) { map.setView(location, 13); return; }
  if (!bins.length) return;
  map.fitBounds(L.latLngBounds(bins.map(bin => [bin.latitude, bin.longitude] as [number, number])), {padding:[40,40],maxZoom:15});
 }, [bins, location, map]);
 return null;
}
function ControlledMap({ bins, selected, onSelect, location, color }: { bins: GlassBin[]; selected: string | null; onSelect: (id: string | null) => void; location: [number, number] | null; color: GlassColor }) {
 const bin = bins.find(b => b.id === selected);
 return <div className="glass-bins-map"><MapContainer key={location?.join(',') ?? 'heilbronn'} center={location ?? [49.145,9.211]} zoom={14} zoomControl={false} className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/><ResizeMap/><FitMapToBins bins={bins} location={location}/><ZoomControl position="bottomright"/><ScaleControl position="bottomleft"/>{bins.map(b => <Marker key={b.id} position={[b.latitude,b.longitude]} icon={L.divIcon({className:'glass-bin-marker',html:`<div class="glass-bin-pin ${fillTone(binFill(b, color))} ${selected === b.id ? 'marker-selected' : ''}"><svg width="24" height="26" viewBox="0 0 24 28" fill="none"><ellipse cx="12" cy="5" rx="7" ry="3" fill="currentColor"/><path d="M5 5l1.5 18c0 3 11 3 11 0L19 5M7 11h10M8 15h8M8 19h8" stroke="currentColor" stroke-width="1.7"/></svg></div>`,iconSize:[44,50],iconAnchor:[22,45]})} eventHandlers={{click:()=>onSelect(b.id)}}/>)}</MapContainer>{bin && <article className="selected-bin-panel"><button className="close-panel" aria-label="Close bin details" onClick={()=>onSelect(null)}>×</button><div className="selected-bin-content"><div className="selected-bin-copy"><strong>{locationTitle(bin)}</strong><p>{locationSubtitle(bin)}</p></div></div><SensorLevels bin={bin}/><div className="selected-bin-actions"><a href={`https://www.google.com/maps/dir/?api=1&destination=${bin.latitude},${bin.longitude}&travelmode=walking`} target="_blank" rel="noreferrer">↗ Directions</a><button onClick={()=>document.getElementById('bin-extra')?.toggleAttribute('hidden')}>ⓘ View details</button></div><p id="bin-extra" hidden>{locationTitle(bin)} · {bin.city || "Heilbronn"}{bin.sensors.map(sensor => <span className="sensor-detail" key={sensor.color}>{sensor.color}: {sensor.sensorId || "Not configured"} · {sensor.cm === null ? "Distance unavailable" : `${sensor.cm} cm`}</span>)}</p></article>}</div>;
}

// Dashboard callers can load their own map; the home screen shares its data with the sidebar.
type MapProps = {
 bins?: GlassBin[]; selected?: string | null; onSelect?: (id: string | null) => void;
 location?: [number, number] | null; color?: GlassColor;
 glassType?: "all" | "green" | "white" | "brown"; searchTerm?: string;
};
export default function GlassBinsMap(props: MapProps) {
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
 const bins = props.bins ?? loaded.filter(b => (color === "All" || b.sensors.some(s => s.color === color && s.sensorId)) && (!query || `${b.name} ${b.address} ${b.city} ${b.area} ${b.postcode}`.toLowerCase().includes(query)));
 return <>{error && <p role="alert">{error}</p>}<ControlledMap bins={bins} selected={props.selected === undefined ? selected : props.selected} onSelect={props.onSelect ?? setSelected} location={props.location ?? null} color={color}/></>;
}

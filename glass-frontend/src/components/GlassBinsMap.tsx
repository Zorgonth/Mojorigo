import { useTranslation } from "react-i18next";
import { locationLabel, t } from "../i18n";
import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, ZoomControl, ScaleControl, useMap } from 'react-leaflet';
import { parseMapResponse, locationTitle, locationSubtitle, type GlassColor, type GlassBin } from './bin-data';
import 'leaflet/dist/leaflet.css';
import './GlassBinsMap.css';
import SensorLevels from './SensorLevels';
import ClusteredBins from './ClusteredBins';
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
function FitMapToBins({ bins, location }: { bins: GlassBin[]; location: [number, number] | null }) {
  useTranslation();
 const map = useMap();
 useEffect(() => {
  if (location) { map.setView(location, 13); return; }
  if (!bins.length) return;
  map.fitBounds(L.latLngBounds(bins.map(bin => [bin.latitude, bin.longitude] as [number, number])), {padding:[40,40],maxZoom:15});
 }, [bins, location, map]);
 return null;
}
function ControlledMap({ bins, selected, onSelect, location, color }: { bins: GlassBin[]; selected: string | null; onSelect: (id: string | null) => void; location: [number, number] | null; color: GlassColor }) {
  useTranslation();
 const bin = bins.find(b => b.id === selected);
 return <div className="glass-bins-map"><MapContainer key={location?.join(',') ?? 'heilbronn'} center={location ?? [49.145,9.211]} zoom={14} maxZoom={19} zoomControl={false} className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" tileSize={256} zoomOffset={0} maxZoom={19} maxNativeZoom={19} detectRetina/><ResizeMap/><FitMapToBins bins={bins} location={location}/><ZoomControl key={t("Zoom in")} position="bottomright" zoomInTitle={t("Zoom in")} zoomOutTitle={t("Zoom out")}/><ScaleControl position="bottomleft" imperial={false}/><ClusteredBins bins={bins} color={color} selected={selected} onSelect={onSelect}/></MapContainer>{bin && <article className="selected-bin-panel"><button className="close-panel" aria-label={t("Close bin details")} onClick={()=>onSelect(null)}>×</button><div className="selected-bin-content"><div className="selected-bin-copy"><strong>{locationLabel(locationTitle(bin))}</strong><p>{locationSubtitle(bin)}</p></div></div><SensorLevels bin={bin} color={color}/><div className="selected-bin-actions"><a href={`https://www.google.com/maps/dir/?api=1&destination=${bin.latitude},${bin.longitude}&travelmode=walking`} target="_blank" rel="noreferrer">{t("↗ Directions")}</a><button onClick={()=>document.getElementById('bin-extra')?.toggleAttribute('hidden')}>{t("ⓘ View details")}</button></div><p id="bin-extra" hidden>{locationLabel(locationTitle(bin))} · {bin.city || "Heilbronn"}{bin.sensors.filter(sensor => color === "All" || sensor.color === color).map(sensor => <span className="sensor-detail" key={sensor.color}>{t(sensor.color)}: {sensor.sensorId || t("Not configured")} · {sensor.cm === null ? t("Distance unavailable") : `${sensor.cm} cm`}</span>)}</p></article>}</div>;
}

// Dashboard callers can load their own map; the home screen shares its data with the sidebar.
type MapProps = {
 bins?: GlassBin[]; selected?: string | null; onSelect?: (id: string | null) => void;
 location?: [number, number] | null; color?: GlassColor;
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
 return <>{error && <p role="alert">{t(error)}</p>}<ControlledMap bins={bins} selected={props.selected === undefined ? selected : props.selected} onSelect={props.onSelect ?? setSelected} location={props.location ?? null} color={color}/></>;
}

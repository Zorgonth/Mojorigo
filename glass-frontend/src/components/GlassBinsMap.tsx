import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, ZoomControl, ScaleControl, useMap } from 'react-leaflet';
import { fillTone, type GlassBin } from './bin-data';
import 'leaflet/dist/leaflet.css';
import './GlassBinsMap.css';
function ResizeMap() {
 const map = useMap();
 useEffect(() => {
  const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
  observer.observe(map.getContainer());
  return () => observer.disconnect();
 }, [map]);
 return null;
}
export default function GlassBinsMap({ bins, selected, onSelect, location }: { bins: GlassBin[]; selected: string | null; onSelect: (id: string | null) => void; location: [number, number] | null }) {
 const bin = bins.find(b => b.id === selected);
 return <div className="glass-bins-map"><MapContainer key={location?.join(',') ?? 'heilbronn'} center={location ?? [49.145,9.211]} zoom={14} zoomControl={false} className="leaflet-map"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/><ResizeMap/><ZoomControl position="bottomright"/><ScaleControl position="bottomleft"/>{bins.map(b => <Marker key={b.id} position={[b.latitude,b.longitude]} icon={L.divIcon({className:'glass-bin-marker',html:`<div class="glass-bin-pin ${fillTone(b.fillPercent)} ${selected === b.id ? 'marker-selected' : ''}"><svg width="24" height="26" viewBox="0 0 24 28" fill="none"><ellipse cx="12" cy="5" rx="7" ry="3" fill="currentColor"/><path d="M5 5l1.5 18c0 3 11 3 11 0L19 5M7 11h10M8 15h8M8 19h8" stroke="currentColor" stroke-width="1.7"/></svg></div>`,iconSize:[44,50],iconAnchor:[22,45]})} eventHandlers={{click:()=>onSelect(b.id)}}/>)}</MapContainer><aside className="map-legend"><strong>Bin fill level</strong>{[['low','0 – 30%','Low'],['medium','30 – 80%','Medium'],['high','80 – 100%','High']].map(([tone,range,label])=><div key={tone}><i className={tone}/><span>{range}</span><small>{label}</small></div>)}</aside>{bin && <article className="selected-bin-panel"><button className="close-panel" aria-label="Close bin details" onClick={()=>onSelect(null)}>×</button><div className="selected-bin-content"><span className={`bin-thumbnail large ${bin.color.toLowerCase()}`}><span className="container-art"><i/><b>♻</b></span></span><div className="selected-bin-copy"><strong>{bin.name}</strong><p>{bin.distance} m · {Math.max(2,Math.round(bin.distance/75))} min walk</p><h3>{bin.fillPercent}% <span>full</span></h3><div className={`fill-track ${fillTone(bin.fillPercent)}`}><span style={{width:`${bin.fillPercent}%`}}/></div></div></div><div className="selected-bin-actions"><a href={`https://www.google.com/maps/dir/?api=1&destination=${bin.latitude},${bin.longitude}&travelmode=walking`} target="_blank" rel="noreferrer">↗ Directions</a><button onClick={()=>document.getElementById('bin-extra')?.toggleAttribute('hidden')}>ⓘ View details</button></div><p id="bin-extra" hidden>{bin.address} · {bin.color} glass collection</p></article>}</div>;
}

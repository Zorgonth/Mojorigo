import { Amphora, Layers3 } from "lucide-react";
import type { GlassColor } from "./bin-data";
export default function GlassFilters({ selected, onChange }: { selected: GlassColor; onChange: (color: GlassColor) => void }) {
 return <div className="glass-filters"><div className="glass-filter-buttons">{(["All", "Brown", "White", "Green"] as GlassColor[]).map(color => <button type="button" key={color} className={`glass-filter ${selected === color ? "glass-filter-active" : ""}`} onClick={() => onChange(color)} aria-pressed={selected === color}><span className={`filter-icon ${color.toLowerCase()}`}>{color === "All" ? <Layers3 size={25}/> : <Amphora size={25}/>}</span>{color}</button>)}</div></div>;
}

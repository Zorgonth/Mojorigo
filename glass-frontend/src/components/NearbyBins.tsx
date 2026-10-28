import { ChevronRight, Footprints } from "lucide-react";
import { fillTone, type GlassBin } from "./bin-data";
export default function NearbyBins({ bins, selected, onSelect }: { bins: GlassBin[]; selected: string | null; onSelect: (id: string) => void }) {
  return <section className="nearby-bins" aria-labelledby="nearby-bins-title">
    <div className="nearby-heading"><h2 id="nearby-bins-title">Nearby containers</h2><span>{bins.length} results</span></div>
    <div className="nearby-bins-list">{bins.map(bin => <button type="button" className={`nearby-bin-card ${selected === bin.id ? "bin-selected" : ""}`} key={bin.id} onClick={() => onSelect(bin.id)} aria-pressed={selected === bin.id}>
      <span className={`bin-thumbnail ${bin.color.toLowerCase()}`}><span className="container-art"><i/><b>♻</b></span></span>
      <span className="bin-card-copy"><strong>{bin.name}</strong><span>{bin.distance} m <Footprints size={13}/> {Math.max(2, Math.round(bin.distance / 75))} min</span></span>
      <span className={`fill-track ${fillTone(bin.fillPercent)}`}><span style={{width: `${bin.fillPercent}%`}}/></span><span className="fill-label">{bin.fillPercent}% full</span><ChevronRight size={17}/>
    </button>)}</div>
    {!bins.length && <p className="empty-message">No bins match. Try another street or glass colour.</p>}
  </section>;
}

import { ChevronRight } from "lucide-react";
import { locationTitle, locationSubtitle, type GlassBin } from "./bin-data";
import SensorLevels from "./SensorLevels";
export default function NearbyBins({ bins, selected, onSelect, total }: { total: number; bins: GlassBin[]; selected: string | null; onSelect: (id: string) => void }) {
  return <section className="nearby-bins" aria-labelledby="nearby-bins-title">
    <div className="nearby-heading"><h2 id="nearby-bins-title">Nearby containers</h2><span>{total} results</span></div>
    <div className="nearby-bins-list">{bins.map(bin => <button type="button" className={`nearby-bin-card location-bin-card ${selected === bin.id ? "bin-selected" : ""}`} key={bin.id} onClick={() => onSelect(bin.id)} aria-pressed={selected === bin.id}>
      <span className="bin-card-copy"><strong>{locationTitle(bin)}</strong><span>{locationSubtitle(bin)}</span><SensorLevels bin={bin} compact/></span><ChevronRight size={17}/>
    </button>)}</div>
    {!bins.length && <p className="empty-message">No containers match this postcode or glass colour.</p>}
  </section>;
}

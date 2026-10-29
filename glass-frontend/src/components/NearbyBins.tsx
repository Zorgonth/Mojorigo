import GlassRecyclingIcon from "./GlassRecyclingIcon";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { locationLabel, locale, t } from "../i18n";
import { ChevronRight } from "lucide-react";
import { locationTitle, locationSubtitle, type GlassColor, type GlassBin } from "./bin-data";
import SensorLevels from "./SensorLevels";
import GlassFilters from "./GlassFilters";
function LocationCard({ bin, selected, onSelect }: {bin: GlassBin; selected: boolean; onSelect: () => void}) {
 useTranslation();
 const [color,setColor] = useState<GlassColor>("All");
 return <article className={`nearby-bin-card grouped-location-card ${selected ? "bin-selected" : ""}`} onClick={event => {
   if (!(event.target as HTMLElement).closest("button, a, input")) onSelect();
 }}>
  <button type="button" className="location-card-heading" onClick={onSelect} aria-pressed={selected}>
   <span className={`glass-card-icon ${color.toLowerCase()}`} aria-hidden="true"><GlassRecyclingIcon/></span>
   <span className="bin-card-copy"><strong>{locationLabel(locationTitle(bin))}</strong><span>{locationSubtitle(bin)}</span>
   {bin.distanceMetres !== undefined && <span className="container-distance">{bin.distanceMetres < 1000 ? `${Math.round(bin.distanceMetres/10)*10} m` : `${(bin.distanceMetres/1000).toLocaleString(locale(),{maximumFractionDigits:1,minimumFractionDigits:1})} km`} {t("away")}</span>}</span><ChevronRight size={17}/>
  </button>
  <div className="location-colour-controls"><GlassFilters selected={color} onChange={setColor}/></div>
  <SensorLevels bin={bin} compact color={color}/>
 </article>;
}
export default function NearbyBins({ bins, selected, onSelect, total }: { total: number; bins: GlassBin[]; selected: string | null; onSelect: (id: string) => void }) {
 useTranslation();
 return <section className="nearby-bins" aria-labelledby="nearby-bins-title">
  <div className="nearby-heading"><h2 id="nearby-bins-title">{t("Nearby containers")}</h2><span>{t("{{count}} results",{count:total})}</span></div>
  <div className="nearby-bins-list">{bins.map(bin=><LocationCard key={bin.id} bin={bin} selected={selected===bin.id} onSelect={()=>onSelect(bin.id)}/>)}</div>
  {!bins.length && <p className="empty-message">{t("No containers match this postcode or glass colour.")}</p>}
 </section>;
}

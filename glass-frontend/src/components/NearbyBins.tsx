import { useTranslation } from "react-i18next";
import { locationLabel, locale, t } from "../i18n";
import { ChevronRight } from "lucide-react";
import { locationTitle, locationSubtitle, compartmentEntries, type GlassColor, type GlassBin } from "./bin-data";
import SensorLevels from "./SensorLevels";
export default function NearbyBins({ bins, selected, onSelect, total, color }: { color: GlassColor; total: number; bins: GlassBin[]; selected: string | null; onSelect: (id: string) => void }) {
  useTranslation();
  return <section className="nearby-bins" aria-labelledby="nearby-bins-title">
    <div className="nearby-heading"><h2 id="nearby-bins-title">{t("Nearby containers")}</h2><span>{t("{{count}} results", {count: total})}</span></div>
    <div className="nearby-bins-list">{compartmentEntries(bins, color).map(({ bin, sensor, key }) => <button type="button" className={`nearby-bin-card location-bin-card compartment-bin-card ${selected === bin.id ? "bin-selected" : ""}`} key={key} onClick={() => onSelect(bin.id)} aria-pressed={selected === bin.id}>
      <span className={`bin-thumbnail compartment-thumbnail ${sensor.color.toLowerCase()}`} aria-hidden="true"><span className="container-art"><i/><b>♻</b></span></span>
      <span className="bin-card-copy"><span className={`compartment-heading ${sensor.color.toLowerCase()}`}>{t("{{colour}} glass", {colour: t(sensor.color)})}</span><strong>{locationLabel(locationTitle(bin))}</strong><span>{locationSubtitle(bin)}</span>{bin.distanceMetres !== undefined && <span className="container-distance">{bin.distanceMetres < 1000 ? `${Math.round(bin.distanceMetres / 10) * 10} m` : `${(bin.distanceMetres / 1000).toLocaleString(locale(), {maximumFractionDigits: 1, minimumFractionDigits: 1})} km`}{" "}{t("away")}</span>}<SensorLevels bin={bin} compact color={sensor.color}/></span><ChevronRight size={17}/>
    </button>)}</div>
    {!bins.length && <p className="empty-message">{t("No containers match this postcode or glass colour.")}</p>}
  </section>;
}

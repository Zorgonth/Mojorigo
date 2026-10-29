import { t } from "../i18n";
import { useTranslation } from "react-i18next";
import type { GlassColor } from "./bin-data";
export default function GlassFilters({ selected, onChange }: { selected: GlassColor; onChange: (color: GlassColor) => void }) {
  useTranslation();
 return <div className="glass-filters"><div className="glass-filter-buttons">{(["All", "Brown", "White", "Green"] as GlassColor[]).map(color => <button type="button" key={color} className={`glass-filter glass-filter-${color.toLowerCase()} ${selected === color ? "glass-filter-active" : ""}`} onClick={() => onChange(color)} aria-pressed={selected === color}>{t(color)}</button>)}</div></div>;
}

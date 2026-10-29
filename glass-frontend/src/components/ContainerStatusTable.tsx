import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { locale, locationLabel, t } from "../i18n";
import { fillTone, locationTitle, type GlassBin, type SensorColor } from "./bin-data";

export default function ContainerStatusTable({ glassType, search, selected, onSelect, bins, error, onRetry }: {
 bins: GlassBin[] | null; error: boolean; onRetry: () => void;
 glassType: "all" | "brown" | "white" | "green"; search: string; selected: string | null; onSelect: (id: string) => void;
}) {
 useTranslation();
 const rows = useMemo(() => {
  const query = search.trim().toLowerCase();
  return (bins ?? []).filter(bin => (!query || `${bin.name} ${bin.address} ${bin.area} ${bin.city} ${bin.postcode} ${bin.id}`.toLowerCase().includes(query)) &&
   (glassType === "all" || bin.sensors.some(sensor => sensor.color.toLowerCase() === glassType && sensor.sensorId)));
 }, [bins, search, glassType]);
 const colours: SensorColor[] = (["Brown", "White", "Green"] as SensorColor[]).filter(colour => glassType === "all" || colour.toLowerCase() === glassType);
 if (error) return <div className="container-table-message" role="alert"><p>{t("Could not load container locations")}</p><button className="info-find" onClick={onRetry}>{t("Try again")}</button></div>;
 if (bins === null) return <p className="container-table-message" role="status">{t("Loading container locations…")}</p>;
 return <>
  <p className="container-table-summary" role="status">{t("{{count}} locations", {count: rows.length})}</p>
  <div className="table-wrap container-status-scroll"><table className="container-status-table">
   <caption className="sr-only">{t("Container locations and sensor fill levels")}</caption>
   <thead><tr><th scope="col">{t("Location")}</th><th scope="col">{t("Postcode")}</th>{colours.map(colour => <th scope="col" key={colour}>{t("{{colour}} glass", {colour: t(colour)})}</th>)}</tr></thead>
   <tbody>{rows.map(bin => <tr key={bin.id} className={selected === bin.id ? "container-row-selected" : ""}>
    <th scope="row"><button type="button" className="container-location-button" onClick={() => onSelect(bin.id)} aria-pressed={selected === bin.id} title={t("Show on map")}>
     <strong>{locationLabel(locationTitle(bin))}</strong><span>{bin.address && bin.address !== locationTitle(bin) ? locationLabel(bin.address) : bin.city}</span>
    </button></th><td>{bin.postcode || "—"}</td>
    {colours.map(colour => {
     const sensor = bin.sensors.find(sensor => sensor.color === colour);
     const fill = sensor?.fillPercent ?? null;
     const updated = sensor?.receivedAt && Number.isFinite(Date.parse(sensor.receivedAt)) ? t("Updated {{time}}", {time: new Date(sensor.receivedAt).toLocaleString(locale())}) : t("Awaiting sensor update");
     return <td key={colour} title={!sensor?.sensorId ? t("Sensor not configured") : updated}><div className="table-sensor-fill"><span>{fill === null ? t("No reading") : `${fill.toLocaleString(locale())}%`}</span>
      <span className={`fill-track ${fillTone(fill)}`} role={fill === null ? undefined : "progressbar"} aria-label={t("{{colour}} glass fill level", {colour:t(colour)})} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill ?? undefined}><span style={{width:`${fill ?? 0}%`}}/></span>
     </div></td>;
    })}
   </tr>)}</tbody>
  </table></div>
  {!rows.length && <p className="container-table-message">{t("No containers match this postcode or glass colour.")}</p>}
 </>;
}

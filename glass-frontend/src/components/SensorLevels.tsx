import { useTranslation } from "react-i18next";
import { locale, t } from "../i18n";
import { citizenFillTone, fillTone, type GlassBin, type GlassColor } from "./bin-data";
export default function SensorLevels({ bin, compact = false, color = "All", citizen = false }: { bin: GlassBin; compact?: boolean; color?: GlassColor; citizen?: boolean }) {
  useTranslation();
  return <div className={`sensor-levels ${compact ? "sensor-levels-compact" : ""}`}>
    {bin.sensors.filter(sensor => color === "All" || sensor.color === color).map(sensor => <div className="sensor-level" key={sensor.color}>
      <span className="sensor-label"><i className={`sensor-colour ${sensor.color.toLowerCase()}`}/>{t(sensor.color)}</span>
      <span className={`fill-track ${(citizen ? citizenFillTone : fillTone)(sensor.fillPercent)}`} role={sensor.fillPercent === null ? undefined : "progressbar"} aria-label={t("{{colour}} glass fill level", {colour: t(sensor.color)})} aria-valuemin={0} aria-valuemax={100} aria-valuenow={sensor.fillPercent ?? undefined}>
        <span style={{width: `${sensor.fillPercent ?? 0}%`}}/>
      </span>
      <span className="sensor-percentage">{sensor.fillPercent === null ? t("No reading") : `${sensor.fillPercent}%`}</span>
      {!compact && <small className="sensor-reading-info">{!sensor.sensorId ? t("Sensor not configured") : sensor.receivedAt && Number.isFinite(Date.parse(sensor.receivedAt)) ? t("Updated {{time}}", {time: new Date(sensor.receivedAt).toLocaleString(locale())}) : t("Awaiting sensor update")}</small>}
    </div>)}
  </div>;
}

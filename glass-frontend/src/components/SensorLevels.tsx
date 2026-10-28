import { fillTone, type GlassBin } from "./bin-data";
export default function SensorLevels({ bin, compact = false }: { bin: GlassBin; compact?: boolean }) {
  return <div className={`sensor-levels ${compact ? "sensor-levels-compact" : ""}`}>
    {bin.sensors.map(sensor => <div className="sensor-level" key={sensor.color}>
      <span className="sensor-label"><i className={`sensor-colour ${sensor.color.toLowerCase()}`}/>{sensor.color}</span>
      <span className={`fill-track ${fillTone(sensor.fillPercent)}`} role={sensor.fillPercent === null ? undefined : "progressbar"} aria-label={`${sensor.color} glass fill level`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={sensor.fillPercent ?? undefined}>
        <span style={{width: `${sensor.fillPercent ?? 0}%`}}/>
      </span>
      <span className="sensor-percentage">{sensor.fillPercent === null ? "No reading" : `${sensor.fillPercent}%`}</span>
      {!compact && <small className="sensor-reading-info">{!sensor.sensorId ? "Sensor not configured" : sensor.receivedAt && Number.isFinite(Date.parse(sensor.receivedAt)) ? `Updated ${new Date(sensor.receivedAt).toLocaleString()}` : "Awaiting sensor update"}</small>}
    </div>)}
  </div>;
}

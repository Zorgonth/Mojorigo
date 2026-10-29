import type { GlassBin } from "./bin-data";
export type DashboardGlassType = "all" | "brown" | "white" | "green";
export type CollectionEvent = { id: string; binId: string; name: string; address: string; collectedAt: string };
export const berlinDate = (date: Date) => new Intl.DateTimeFormat("en-CA", {timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
export function dashboardMetrics(bins: GlassBin[], glassType: DashboardGlassType, events: CollectionEvent[], now = new Date()) {
 const sensors = bins.flatMap(bin => bin.sensors.filter(sensor => (glassType === "all" || sensor.color.toLowerCase() === glassType) && sensor.sensorId));
 const readings = sensors.filter(sensor => sensor.fillPercent !== null);
 const pickups = readings.filter(sensor => sensor.fillPercent! > 70);
 const today = berlinDate(now);
 return { total: sensors.length, reported: readings.length, pickups: pickups.length,
  average: readings.length ? readings.reduce((sum,sensor)=>sum+sensor.fillPercent!,0)/readings.length : null,
  collectionsToday: events.filter(event => Number.isFinite(Date.parse(event.collectedAt)) && berlinDate(new Date(event.collectedAt)) === today) };
}
export function metricLocations(bins: GlassBin[], glassType: DashboardGlassType, metric: "all" | "pickup" | "fullness") {
 const readings = (bin: GlassBin) => bin.sensors.filter(s => (glassType === "all" || s.color.toLowerCase() === glassType) && s.sensorId && s.fillPercent !== null).map(s=>s.fillPercent!);
 const filtered = metric === "pickup" ? bins.filter(bin => readings(bin).some(fill=>fill>70)) : [...bins];
 return filtered.sort((a,b)=> Math.max(-1,...readings(b)) - Math.max(-1,...readings(a)) || a.id.localeCompare(b.id));
}

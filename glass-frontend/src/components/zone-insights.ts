import type { GlassBin } from './bin-data';
import type { DashboardGlassType } from './dashboard-metrics';

export function zoneInsights(bins: GlassBin[], colour: DashboardGlassType) {
 const zones = new Map<string, { postcode: string; locations: number; readings: number[]; pickups: number }>();
 for (const bin of bins) {
  // Postcodes provide consistent zones even where district metadata is absent.
  const key = bin.postcode || '';
  if (!key) continue;
  const zone = zones.get(key) ?? {postcode: key, locations: 0, readings: [], pickups: 0};
  zone.locations++;
  for (const sensor of bin.sensors) {
   if (!sensor.sensorId || sensor.fillPercent === null || (colour !== 'all' && sensor.color.toLowerCase() !== colour)) continue;
   zone.readings.push(sensor.fillPercent);
   if (sensor.fillPercent > 70) zone.pickups++;
  }
  zones.set(key, zone);
 }
 return [...zones.values()].map(zone => ({
  postcode: zone.postcode, locations: zone.locations, reported: zone.readings.length, pickups: zone.pickups,
  average: zone.readings.length ? zone.readings.reduce((sum, value) => sum + value, 0) / zone.readings.length : null,
 })).sort((a,b) => (b.average ?? -1) - (a.average ?? -1) || a.postcode.localeCompare(b.postcode));
}

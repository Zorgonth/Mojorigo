import { locationNames } from "./location-names";
export type GlassColor = "All" | "Brown" | "White" | "Green";
export const sensorColors = ["Green", "White", "Brown"] as const;
export type SensorColor = typeof sensorColors[number];
export type BinSensor = {
  color: SensorColor;
  sensorId: string;
  fillPercent: number | null;
  cm: number | null;
  receivedAt: string | null;
};
export type GlassBin = {
  id: string; name: string; address: string; city: string; area: string; postcode: string;
  latitude: number; longitude: number; sensors: BinSensor[];
  googleMapsUrl?: string; distanceMetres?: number;
};
const numeric = (value: unknown): number | null => {
  if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" ? value as Record<string, unknown> : {};

export function parseMapResponse(response: unknown): GlassBin[] {
  const data = record(response).data;
  if (!Array.isArray(data)) throw new Error("Invalid map response");
  const bins = new Map<string, GlassBin>();
  for (const item of data) {
    const row = record(item);
    const id = text(row.id);
    const latitude = numeric(row.latitude), longitude = numeric(row.longitude);
    if (!id || latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) continue;
    const readings = Array.isArray(row.sensors) ? row.sensors.map(record) : [];
    const sensors = sensorColors.map(color => {
      const sensor = readings.find(s => text(s.type).toLowerCase() === color.toLowerCase()) ?? {};
      const fill = numeric(sensor.fillPercent);
      return { color, sensorId: text(sensor.sensorId), fillPercent: fill !== null && fill >= 0 && fill <= 100 ? fill : null,
        cm: numeric(sensor.cm), receivedAt: text(sensor.receivedAt) || null };
    });
    bins.set(id, { id, latitude, longitude, sensors, name: text(row.name) || "Glass collection point",
      address: text(row.address), postcode: text(row.postcode), city: text(row.city), area: text(row.area), googleMapsUrl: text(row.googleMapsUrl) || undefined });
  }
  return [...bins.values()];
}

// Pins use the fullest reported compartment; a colour filter uses just that sensor.
export function binFill(bin: GlassBin, color: GlassColor = "All"): number | null {
  const values = bin.sensors.filter(s => color === "All" || s.color === color).map(s => s.fillPercent).filter((fill): fill is number => fill !== null);
  return values.length ? Math.max(...values) : null;
}
export const fillTone = (fill: number | null) => fill === null ? "unknown" : fill <= 30 ? "low" : fill <= 80 ? "medium" : "high";
export const demoBins = parseMapResponse({ data: [
  { id: "demo-1", name: "Sülmerstraße 12", address: "74072 Heilbronn", latitude: 49.1468, longitude: 9.2202, sensors: [
    {type: "green", sensorId: "demo-green", fillPercent: 23}, {type: "white", sensorId: "demo-white", fillPercent: 78}, {type: "brown", sensorId: "demo-brown", fillPercent: 91}
  ]},
  { id: "demo-2", name: "Allee 15", address: "74072 Heilbronn", latitude: 49.140, longitude: 9.223, sensors: [
    {type: "green", sensorId: "demo-green-2", fillPercent: 18}, {type: "white", sensorId: "demo-white-2", fillPercent: 63}, {type: "brown", sensorId: "demo-brown-2", fillPercent: null}
  ]}
] });

export function locationTitle(bin: GlassBin): string {
  const storedName = locationNames[`${bin.latitude.toFixed(6)},${bin.longitude.toFixed(6)}`];
  const specificName = bin.name && bin.name !== bin.city && !/^(glass collection point|glass recycling location|BIN-\d+)$/i.test(bin.name);
  return (specificName ? bin.name : storedName) || bin.address || (bin.area && bin.area !== bin.city ? bin.area : "Glass collection point");
}
export function locationSubtitle(bin: GlassBin): string {
  return [[bin.postcode, bin.city].filter(Boolean).join(" "), `${bin.latitude.toFixed(5)}, ${bin.longitude.toFixed(5)}`].filter(Boolean).join(" · ");
}

export function compartmentEntries(bins: GlassBin[], color: GlassColor = "All") {
  return bins.flatMap(bin => (["Brown", "White", "Green"] as const)
    .filter(type => color === "All" || type === color)
    .flatMap(type => bin.sensors.filter(sensor => sensor.color === type).map(sensor => ({
      key: `${bin.id}:${sensor.color}`, bin, sensor,
    }))));
}

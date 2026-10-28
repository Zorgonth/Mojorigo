export type GlassColor = "All" | "Brown" | "White" | "Green";
export type GlassBin = { id: string; name: string; address: string; latitude: number; longitude: number; fillPercent: number; color: Exclude<GlassColor, "All">; distance: number };
export const demoBins: GlassBin[] = [
  { id: "demo-1", name: "Sülmerstraße 12", address: "74072 Heilbronn", latitude: 49.1468, longitude: 9.2202, fillPercent: 23, color: "Brown", distance: 120 },
  { id: "demo-2", name: "Neckargartacher Str. 45", address: "74080 Heilbronn", latitude: 49.158, longitude: 9.206, fillPercent: 78, color: "White", distance: 350 },
  { id: "demo-3", name: "Kaiserstraße 8", address: "74072 Heilbronn", latitude: 49.1425, longitude: 9.216, fillPercent: 91, color: "Green", distance: 420 },
  { id: "demo-4", name: "Olgastraße 23", address: "74072 Heilbronn", latitude: 49.136, longitude: 9.224, fillPercent: 18, color: "Brown", distance: 650 },
  { id: "demo-5", name: "Allee 15", address: "74072 Heilbronn", latitude: 49.140, longitude: 9.223, fillPercent: 63, color: "White", distance: 800 },
  { id: "demo-6", name: "Wertwiesenpark", address: "74081 Heilbronn", latitude: 49.128, longitude: 9.204, fillPercent: 28, color: "Green", distance: 1100 },
  { id: "demo-7", name: "Böckinger Straße 30", address: "74080 Heilbronn", latitude: 49.148, longitude: 9.192, fillPercent: 84, color: "Brown", distance: 1400 },
  { id: "demo-8", name: "Neckarhalde 6", address: "74072 Heilbronn", latitude: 49.152, longitude: 9.215, fillPercent: 12, color: "Green", distance: 1600 },
];
export const fillTone = (fill: number) => fill <= 30 ? "low" : fill <= 80 ? "medium" : "high";

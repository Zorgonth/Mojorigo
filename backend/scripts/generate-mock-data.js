import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeCsvFile } from "../src/utils/csv.js";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../data");
mkdirSync(dataDir, { recursive: true });

function mulberry32(seed) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(42);

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const glassTypes = [
  {
    id: "white",
    name_en: "White / clear glass",
    name_de: "Weißglas",
    color_hex: "#F5F5F5",
    description: "Clear glass bottles and jars (Weißglas)",
  },
  {
    id: "brown",
    name_en: "Brown glass",
    name_de: "Braunglas",
    color_hex: "#8B5A2B",
    description: "Brown glass bottles (Braunglas)",
  },
  {
    id: "blue",
    name_en: "Blue glass",
    name_de: "Blauglas",
    color_hex: "#2E5AAC",
    description: "Blue / coloured glass stream used in this project",
  },
];

const areas = [
  { id: "innenstadt", name: "Innenstadt", city: "Heilbronn", lat: 49.1427, lng: 9.2109 },
  { id: "boeckingen", name: "Böckingen", city: "Heilbronn", lat: 49.1468, lng: 9.186 },
  { id: "sontheim", name: "Sontheim", city: "Heilbronn", lat: 49.1205, lng: 9.221 },
  { id: "neckargartach", name: "Neckargartach", city: "Heilbronn", lat: 49.168, lng: 9.206 },
  { id: "pfuehl", name: "Pfühl", city: "Heilbronn", lat: 49.14, lng: 9.238 },
];

const binSeeds = [
  {
    id: "BIN-001",
    sensor_id: "SEN-001",
    name: "Kiliansplatz Weißglas",
    glass_type: "white",
    area_id: "innenstadt",
    address: "Kiliansplatz 1",
    lat: 49.1404,
    lng: 9.2205,
    usage_per_hour: 1.8,
    start_fill: 22,
  },
  {
    id: "BIN-002",
    sensor_id: "SEN-002",
    name: "Wollhauszentrum Braunglas",
    glass_type: "brown",
    area_id: "innenstadt",
    address: "Allee 40",
    lat: 49.139,
    lng: 9.2225,
    usage_per_hour: 1.4,
    start_fill: 40,
  },
  {
    id: "BIN-003",
    sensor_id: "SEN-003",
    name: "Hauptbahnhof Blauglas",
    glass_type: "blue",
    area_id: "innenstadt",
    address: "Bahnhofstraße 10",
    lat: 49.1427,
    lng: 9.2098,
    usage_per_hour: 1.5,
    start_fill: 18,
  },
  {
    id: "BIN-004",
    sensor_id: "SEN-004",
    name: "Wertwiesenpark Weißglas",
    glass_type: "white",
    area_id: "innenstadt",
    address: "Wertwiesen 1",
    lat: 49.1365,
    lng: 9.203,
    usage_per_hour: 0.7,
    start_fill: 12,
  },
  {
    id: "BIN-005",
    sensor_id: "SEN-005",
    name: "Böckingen Kirchplatz Braunglas",
    glass_type: "brown",
    area_id: "boeckingen",
    address: "Kirchsteige 2",
    lat: 49.1472,
    lng: 9.1855,
    usage_per_hour: 1.1,
    start_fill: 55,
  },
  {
    id: "BIN-006",
    sensor_id: "SEN-006",
    name: "Sontheim Kelter Blauglas",
    glass_type: "blue",
    area_id: "sontheim",
    address: "Kelterplatz 3",
    lat: 49.1202,
    lng: 9.2228,
    usage_per_hour: 0.9,
    start_fill: 30,
  },
  {
    id: "BIN-007",
    sensor_id: "SEN-007",
    name: "Bildungscampus Weißglas",
    glass_type: "white",
    area_id: "innenstadt",
    address: "Bildungscampus 6",
    lat: 49.1485,
    lng: 9.2068,
    usage_per_hour: 2.0,
    start_fill: 48,
  },
  {
    id: "BIN-008",
    sensor_id: "SEN-008",
    name: "Neckargartach Rathaus Braunglas",
    glass_type: "brown",
    area_id: "neckargartach",
    address: "Sankt-Martins-Straße 4",
    lat: 49.1678,
    lng: 9.2052,
    usage_per_hour: 0.8,
    start_fill: 25,
  },
  {
    id: "BIN-009",
    sensor_id: "SEN-009",
    name: "Pfühlpark Blauglas",
    glass_type: "blue",
    area_id: "pfuehl",
    address: "Pfühlstraße 20",
    lat: 49.1398,
    lng: 9.2385,
    usage_per_hour: 1.0,
    start_fill: 35,
  },
  {
    id: "BIN-010",
    sensor_id: "SEN-010",
    name: "Theresienwiese Weißglas",
    glass_type: "white",
    area_id: "innenstadt",
    address: "Theresienwiese 1",
    lat: 49.1358,
    lng: 9.2188,
    usage_per_hour: 1.2,
    start_fill: 20,
  },
];

const areaById = Object.fromEntries(areas.map((area) => [area.id, area]));
const glassById = Object.fromEntries(glassTypes.map((type) => [type.id, type]));

const start = new Date("2026-10-13T06:00:00.000Z");
const end = new Date("2026-10-27T12:00:00.000Z");
const stepMs = 6 * 60 * 60 * 1000;

const readings = [];
const collections = [];
const latestByBin = new Map();
let readingIndex = 1;
let collectionIndex = 1;

for (const seed of binSeeds) {
  let fill = seed.start_fill;
  for (let time = start.getTime(); time <= end.getTime(); time += stepMs) {
    const recordedAt = new Date(time);
    const hour = recordedAt.getUTCHours();
    const dayFactor = hour >= 8 && hour <= 22 ? 1 : 0.25;
    fill = clamp(fill + seed.usage_per_hour * 6 * dayFactor + (random() - 0.5) * 2, 4, 99);

    if (fill >= 92) {
      collections.push({
        id: `CL-${String(collectionIndex).padStart(4, "0")}`,
        bin_id: seed.id,
        collected_at: recordedAt.toISOString(),
        fill_percent_before: round(fill, 1),
      });
      collectionIndex += 1;
      fill = 5 + random() * 8;
    }

    const seasonal = Math.sin((time / 86_400_000) * Math.PI * 2);
    const temperature = round(11 + seasonal * 3.5 + (random() - 0.5) * 1.8, 1);
    const humidity = round(clamp(74 - seasonal * 8 + (random() - 0.5) * 10, 45, 95), 1);

    const reading = {
      id: `RD-${String(readingIndex).padStart(6, "0")}`,
      bin_id: seed.id,
      sensor_id: seed.sensor_id,
      recorded_at: recordedAt.toISOString(),
      fill_percent: round(fill, 1),
      temperature_c: temperature,
      humidity_percent: humidity,
    };
    readings.push(reading);
    latestByBin.set(seed.id, reading);
    readingIndex += 1;
  }
}

// Two quieter bins last emptied in September so the 30-day / 50% rule can fire.
const staleOverrides = [
  { id: "BIN-006", collected_at: "2026-09-18T08:00:00.000Z", fill_percent: 56.2 },
  { id: "BIN-008", collected_at: "2026-09-10T09:00:00.000Z", fill_percent: 53.8 },
];

for (const stale of staleOverrides) {
  for (let i = collections.length - 1; i >= 0; i -= 1) {
    if (collections[i].bin_id === stale.id) collections.splice(i, 1);
  }
  collections.push({
    id: `CL-${String(collectionIndex).padStart(4, "0")}`,
    bin_id: stale.id,
    collected_at: stale.collected_at,
    fill_percent_before: 94,
  });
  collectionIndex += 1;
  latestByBin.get(stale.id).fill_percent = stale.fill_percent;
}

const bins = binSeeds.map((seed) => {
  const latest = latestByBin.get(seed.id);
  const area = areaById[seed.area_id];
  const glass = glassById[seed.glass_type];
  return {
    id: seed.id,
    sensor_id: seed.sensor_id,
    name: seed.name,
    glass_type: seed.glass_type,
    glass_type_name_de: glass.name_de,
    area_id: seed.area_id,
    area_name: area.name,
    city: area.city,
    address: seed.address,
    lat: seed.lat,
    lng: seed.lng,
    capacity_liters: 3000,
    fill_percent: latest.fill_percent,
    temperature_c: latest.temperature_c,
    humidity_percent: latest.humidity_percent,
    last_reading_at: latest.recorded_at,
    installed_at: "2026-03-01T00:00:00.000Z",
  };
});

writeCsvFile(path.join(dataDir, "glass_types.csv"), glassTypes, [
  "id",
  "name_en",
  "name_de",
  "color_hex",
  "description",
]);
writeCsvFile(path.join(dataDir, "areas.csv"), areas, ["id", "name", "city", "lat", "lng"]);
writeCsvFile(path.join(dataDir, "bins.csv"), bins, [
  "id",
  "sensor_id",
  "name",
  "glass_type",
  "glass_type_name_de",
  "area_id",
  "area_name",
  "city",
  "address",
  "lat",
  "lng",
  "capacity_liters",
  "fill_percent",
  "temperature_c",
  "humidity_percent",
  "last_reading_at",
  "installed_at",
]);
writeCsvFile(path.join(dataDir, "sensor_readings.csv"), readings, [
  "id",
  "bin_id",
  "sensor_id",
  "recorded_at",
  "fill_percent",
  "temperature_c",
  "humidity_percent",
]);
writeCsvFile(path.join(dataDir, "collections.csv"), collections, [
  "id",
  "bin_id",
  "collected_at",
  "fill_percent_before",
]);

console.log(`Wrote ${bins.length} bins, ${readings.length} readings, ${collections.length} collections to ${dataDir}`);

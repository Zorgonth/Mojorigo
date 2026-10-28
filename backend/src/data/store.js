import path from "node:path";
import { config } from "../config/env.js";
import { attachUrgency } from "../utils/fillStatus.js";
import { readCsvFile } from "../utils/csv.js";

function number(value) {
  return Number(value);
}

function lastCollectedAtFor(binId, collections) {
  const dates = collections
    .filter((item) => item.binId === binId)
    .map((item) => item.collectedAt);

  if (dates.length === 0) return null;

  return dates.sort()[dates.length - 1];
}

function enrichBin(bin, latestReading) {
  const fillPercent = latestReading
    ? number(latestReading.fill_percent)
    : number(bin.fill_percent);

  const temperatureC = latestReading
    ? number(latestReading.temperature_c)
    : number(bin.temperature_c);

  const humidityPercent = latestReading
    ? number(latestReading.humidity_percent)
    : number(bin.humidity_percent);

  return {
    id: bin.id,

    // Maps the CSV sensor_id column to item.sensorId.
    sensorId: bin.sensor_id,

    name: bin.name,
    glassType: bin.glass_type,
    glassTypeNameDe: bin.glass_type_name_de,
    areaId: bin.area_id,
    areaName: bin.area_name,
    city: bin.city,
    address: bin.address,
    lat: number(bin.lat),
    lng: number(bin.lng),
    capacityLiters: number(bin.capacity_liters),
    fillPercent,
    temperatureC,
    humidityPercent,
    lastReadingAt: latestReading?.recorded_at ?? bin.last_reading_at,
    installedAt: bin.installed_at,
  };
}

function refreshBin(bin, collections = store.collections) {
  const lastCollectedAt =
    lastCollectedAtFor(bin.id, collections) ?? bin.installedAt;

  return attachUrgency(bin, lastCollectedAt);
}

function load() {
  const glassTypes = readCsvFile(
    path.join(config.dataDir, "glass_types.csv")
  ).map((row) => ({
    id: row.id,
    nameEn: row.name_en,
    nameDe: row.name_de,
    colorHex: row.color_hex,
    description: row.description,
  }));

  const areas = readCsvFile(
    path.join(config.dataDir, "areas.csv")
  ).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    lat: number(row.lat),
    lng: number(row.lng),
  }));

  const readings = readCsvFile(
    path.join(config.dataDir, "sensor_readings.csv")
  ).map((row) => ({
    id: row.id,
    binId: row.bin_id,
    sensorId: row.sensor_id,
    recordedAt: row.recorded_at,
    fillPercent: number(row.fill_percent),
    temperatureC: number(row.temperature_c),
    humidityPercent: number(row.humidity_percent),
  }));

  const latestByBin = new Map();

  for (const reading of readings) {
    const current = latestByBin.get(reading.binId);

    if (
      !current ||
      reading.recordedAt > current.recorded_at
    ) {
      latestByBin.set(reading.binId, {
        recorded_at: reading.recordedAt,
        fill_percent: reading.fillPercent,
        temperature_c: reading.temperatureC,
        humidity_percent: reading.humidityPercent,
      });
    }
  }

  const collections = readCsvFile(
    path.join(config.dataDir, "collections.csv")
  ).map((row) => ({
    id: row.id,
    binId: row.bin_id,
    collectedAt: row.collected_at,
    fillPercentBefore: number(row.fill_percent_before),
  }));

  const bins = readCsvFile(
    path.join(config.dataDir, "bins.csv")
  ).map((bin) => {
    const enriched = enrichBin(
      bin,
      latestByBin.get(bin.id)
    );

    return attachUrgency(
      enriched,
      lastCollectedAtFor(enriched.id, collections) ??
        enriched.installedAt
    );
  });

  return {
    glassTypes,
    areas,
    bins,
    readings,
    collections,
    rawSensorPayloads: [],
  };
}

export const store = load();

export function addReading({
  binId,
  sensorId,
  fillPercent,
  temperatureC,
  humidityPercent,
  recordedAt,
}) {
  const bin = store.bins.find(
    (item) => item.id === binId
  );

  if (!bin) return null;

  const reading = {
    id: `RD-${String(store.readings.length + 1).padStart(6, "0")}`,
    binId,
    sensorId: sensorId || bin.sensorId,
    recordedAt: recordedAt || new Date().toISOString(),
    fillPercent: number(fillPercent),
    temperatureC: number(temperatureC),
    humidityPercent: number(humidityPercent),
  };

  store.readings.push(reading);

  Object.assign(bin, {
    fillPercent: reading.fillPercent,
    temperatureC: reading.temperatureC,
    humidityPercent: reading.humidityPercent,
    lastReadingAt: reading.recordedAt,
  });

  refreshBin(bin);

  return { bin, reading };
}

export function markCollected(
  binId,
  collectedAt = new Date().toISOString()
) {
  const bin = store.bins.find(
    (item) => item.id === binId
  );

  if (!bin) return null;

  const collection = {
    id: `CL-${String(store.collections.length + 1).padStart(4, "0")}`,
    binId,
    collectedAt,
    fillPercentBefore: bin.fillPercent,
  };

  store.collections.push(collection);

  bin.fillPercent = 5;
  bin.lastReadingAt = collectedAt;

  store.readings.push({
    id: `RD-${String(store.readings.length + 1).padStart(6, "0")}`,
    binId,
    sensorId: bin.sensorId,
    recordedAt: collectedAt,
    fillPercent: bin.fillPercent,
    temperatureC: bin.temperatureC,
    humidityPercent: bin.humidityPercent,
  });

  refreshBin(bin);

  return { bin, collection };
}

export function storeRawSensorPayload(payload) {
  const entry = {
    id: `RAW-${String(store.rawSensorPayloads.length + 1).padStart(6, "0")}`,
    receivedAt: new Date().toISOString(),
    payload,
  };

  store.rawSensorPayloads.push(entry);

  return entry;
}

import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getOsmBin } from "../services/osmBinService.js";
import { readCsvFile } from "../utils/csv.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const osmBinsRouter = Router();

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));

const binsCsvPath = path.join(backendRoot, "data", "bins.csv");
const readingsCsvPath = path.join(
  backendRoot,
  "database",
  "readings.csv",
);

const SENSOR_TYPES = [
  { type: "green", column: "green_sensor_id" },
  { type: "brown", column: "brown_sensor_id" },
  { type: "white", column: "white_sensor_id" },
];

function parseNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getLatestReadings(readings) {
  const latestBySensor = new Map();

  for (const reading of readings) {
    const sensorId = String(reading.sensorId ?? "").trim();
    if (!sensorId) continue;

    const timestamp = Date.parse(reading.receivedAt ?? "");
    const previous = latestBySensor.get(sensorId);

    if (
      !previous ||
      (Number.isFinite(timestamp) &&
        (!Number.isFinite(previous.timestamp) ||
          timestamp >= previous.timestamp))
    ) {
      latestBySensor.set(sensorId, {
        timestamp,
        receivedAt: reading.receivedAt || null,
        fillPercent: parseNumber(reading.fillPercent),
        cm: parseNumber(reading.cm),
        binId: reading.binId || null,
      });
    }
  }

  return latestBySensor;
}

osmBinsRouter.get(
  "/map",
  asyncHandler(async (req, res) => {
    const bins = readCsvFile(binsCsvPath);
    const readings = readCsvFile(readingsCsvPath);
    const latestBySensor = getLatestReadings(readings);

    const data = bins
      .filter((bin) => {
        const lat = parseNumber(bin.lat);
        const lng = parseNumber(bin.lng);

        return (
          lat !== null &&
          lng !== null &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        );
      })
      .map((bin) => {
        const sensors = SENSOR_TYPES.map(({ type, column }) => {
          const sensorId = String(bin[column] ?? "").trim();
          const reading = latestBySensor.get(sensorId);

          return {
            type,
            sensorId,
            fillPercent: reading?.fillPercent ?? null,
            cm: reading?.cm ?? null,
            receivedAt: reading?.receivedAt ?? null,
          };
        });

        const lat = Number(bin.lat);
        const lng = Number(bin.lng);

        return {
          id: bin.id,
          name: bin.arena_name || bin.name || "Glass collection point",
          area: bin.arena_name || "",
          city: bin.city || "",
          address: bin.address || "",
          latitude: lat,
          longitude: lng,
          sensors,
          googleMapsUrl: `https://www.google.com/maps?q=${lat},${lng}`,
        };
      });

    res.json({
      count: data.length,
      data,
    });
  }),
);

osmBinsRouter.get(
  "/:osmType/:osmId/maps-link",
  asyncHandler(async (req, res) => {
    const osmId = `${req.params.osmType}/${req.params.osmId}`;
    const data = getOsmBin(osmId);

    res.json({ data });
  }),
);

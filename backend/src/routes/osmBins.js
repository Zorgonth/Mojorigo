import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getOsmBin } from "../services/osmBinService.js";
import { readCsvFile } from "../utils/csv.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const osmBinsRouter = Router();

// Resolve backend/data/bins.csv
const backendRoot = fileURLToPath(new URL("../../", import.meta.url));

const binsCsvPath = path.join(
  backendRoot,
  "data",
  "bins.csv"
);

// GET /api/osm-bins/map
// Return all glass bins with coordinates.
osmBinsRouter.get(
  "/map",
  asyncHandler(async (req, res) => {
    const bins = readCsvFile(binsCsvPath);

    const data = bins
      .filter((bin) => {
        const lat = Number(bin.lat);
        const lng = Number(bin.lng);

        return (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          lat >= -90 &&
          lat <= 90 &&
          lng >= -180 &&
          lng <= 180
        );
      })
      .map((bin) => ({
        id: bin.id,
        sensorId: bin.sensor_id,
        name: bin.name,
        glassType: bin.glass_type,
        glassTypeNameDe: bin.glass_type_name_de,
        area: bin.area_name,
        city: bin.city,
        address: bin.address,
        latitude: Number(bin.lat),
        longitude: Number(bin.lng),
        fillPercent: Number(bin.fill_percent),
        googleMapsUrl:
          `https://www.google.com/maps?q=${bin.lat},${bin.lng}`,
      }));

    res.json({
      count: data.length,
      data,
    });
  })
);

// Existing endpoint for a single OpenStreetMap bin.
osmBinsRouter.get(
  "/:osmType/:osmId/maps-link",
  asyncHandler(async (req, res) => {
    const osmId = `${req.params.osmType}/${req.params.osmId}`;
    const data = getOsmBin(osmId);

    res.json({ data });
  })
);

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
    const sensorId = String(reading.sensorId ?? "").trim().toLowerCase();
    if (!sensorId) continue;

    const timestamp = Date.parse(reading.receivedAt ?? "");
    const previous = latestBySensor.get(sensorId.toLowerCase());

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
          const reading = latestBySensor.get(sensorId.toLowerCase());

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
          postcode: bin.postcode || "",
          addressSource: bin.address_source || "",
          addressMatch: bin.address_match || "",
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

// Collection events are location-wide; the CSV does not record a glass colour.
osmBinsRouter.get("/collections", asyncHandler(async (_req, res) => {
  const bins = new Map(readCsvFile(binsCsvPath).map(bin => [bin.id, bin]));
  const data = readCsvFile(path.join(backendRoot, "data", "collections.csv"))
    .filter(row => bins.has(row.bin_id) && Number.isFinite(Date.parse(row.collected_at)))
    .map(row => {
      const bin = bins.get(row.bin_id);
      return { id: row.id, binId: row.bin_id, collectedAt: row.collected_at,
        name: bin.arena_name || bin.address || "Glass collection point", address: bin.address || "" };
    });
  res.json({data});
}));

osmBinsRouter.get(
  "/:osmType/:osmId/maps-link",
  asyncHandler(async (req, res) => {
    const osmId = `${req.params.osmType}/${req.params.osmId}`;
    const data = getOsmBin(osmId);

    res.json({ data });
  }),
);


const COLLECTION_THRESHOLD = 70;

function getLatestReadingBySensor(readings) {
  const latest = new Map();

  for (const reading of readings) {
    const sensorId = String(reading.sensorId ?? "").trim().toLowerCase();
    const receivedAt = reading.receivedAt;
    const timestamp = Date.parse(receivedAt ?? "");
    const fillPercent = Number(reading.fillPercent);

    if (
      !sensorId ||
      !Number.isFinite(timestamp) ||
      !Number.isFinite(fillPercent) ||
      fillPercent < 0 ||
      fillPercent > 100
    ) {
      continue;
    }

    const previous = latest.get(sensorId);

    if (!previous || timestamp > previous.timestamp) {
      latest.set(sensorId, {
        sensorId,
        timestamp,
        receivedAt,
        fillPercent,
        cm: reading.cm === "" ? null : Number(reading.cm),
      });
    }
  }

  return latest;
}

function validCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function toWaypoint(latitude, longitude) {
  return {
    location: {
      latLng: {
        latitude,
        longitude,
      },
    },
  };
}

osmBinsRouter.post(
  "/collection-route",
  asyncHandler(async (req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    const originLat = Number(req.body?.origin?.latitude);
    const originLng = Number(req.body?.origin?.longitude);

    if (!validCoordinate(originLat, originLng)) {
      return res.status(400).json({
        error: {
          code: "INVALID_ORIGIN",
          message:
            "Provide origin.latitude and origin.longitude as valid coordinates.",
        },
      });
    }

    const returnToOrigin = req.body?.returnToOrigin !== false;

    // Google Routes API waypoint limit per group.
    const MAX_STOPS_PER_GROUP = 25;

    // Read bins and their latest sensor readings.
    const bins = readCsvFile(binsCsvPath);
    const readings = readCsvFile(readingsCsvPath);
    const latestBySensor = getLatestReadingBySensor(readings);

    // Find collection locations where at least one sensor
    // has a fill percentage above the collection threshold.
    const collectionStops = bins
      .map((bin) => {
        const latitude = Number(bin.lat);
        const longitude = Number(bin.lng);

        if (!validCoordinate(latitude, longitude)) {
          return null;
        }

        const sensors = SENSOR_TYPES.map(({ type, column }) => {
          const sensorId = String(bin[column] ?? "").trim();
          const reading = latestBySensor.get(sensorId.toLowerCase());

          return {
            type,
            sensorId,
            fillPercent: reading?.fillPercent ?? null,
            receivedAt: reading?.receivedAt ?? null,
            cm: Number.isFinite(reading?.cm)
              ? reading.cm
              : null,
          };
        });

        const sensorsToCollect = sensors.filter(
          (sensor) =>
            sensor.sensorId &&
            sensor.fillPercent !== null &&
            sensor.fillPercent > COLLECTION_THRESHOLD
        );

        if (sensorsToCollect.length === 0) {
          return null;
        }

        return {
          id: bin.id,
          name:
            bin.arena_name ||
            bin.name ||
            "Glass collection point",
          city: bin.city || "",
          address: bin.address || "",
          latitude,
          longitude,
          sensorsToCollect,
        };
      })
      .filter(Boolean);

    // No locations need collection.
    if (collectionStops.length === 0) {
      return res.json({
        thresholdPercent: COLLECTION_THRESHOLD,
        count: 0,
        groupCount: 0,
        stops: [],
        groups: [],
        route: null,
        message: "No sensors currently require collection.",
      });
    }

    if (!apiKey) {
      const error = new Error(
        "GOOGLE_MAPS_API_KEY is not configured."
      );

      error.statusCode = 500;
      throw error;
    }

    // Split all collection locations into groups of at most 25.
    const stopGroups = [];

    for (
      let i = 0;
      i < collectionStops.length;
      i += MAX_STOPS_PER_GROUP
    ) {
      stopGroups.push(
        collectionStops.slice(i, i + MAX_STOPS_PER_GROUP)
      );
    }

    // Calculate each group's route independently.
    const groups = [];

    for (let groupIndex = 0; groupIndex < stopGroups.length; groupIndex++) {
      const groupStops = stopGroups[groupIndex];

      // If returning to the origin, optimize every stop.
      // Otherwise, keep the final stop fixed as the destination.
      const intermediateStops = returnToOrigin
        ? groupStops
        : groupStops.slice(0, -1);

      const destination = returnToOrigin
        ? {
            latitude: originLat,
            longitude: originLng,
          }
        : groupStops[groupStops.length - 1];

      const requestBody = {
        origin: toWaypoint(originLat, originLng),

        destination: toWaypoint(
          destination.latitude,
          destination.longitude
        ),

        intermediates: intermediateStops.map((stop) =>
          toWaypoint(stop.latitude, stop.longitude)
        ),

        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        // Omit departureTime so Google uses request time; a local "now" can arrive in the past.
        optimizeWaypointOrder: true,
        polylineQuality: "HIGH_QUALITY",
        languageCode: req.body?.language === "de" ? "de" : "en",
        units: "METRIC",
      };

      const googleResponse = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": [
              "routes.duration",
              "routes.distanceMeters",
              "routes.polyline.encodedPolyline",
              "routes.legs.duration",
              "routes.legs.distanceMeters",
              "routes.optimizedIntermediateWaypointIndex",
            ].join(","),
          },
          body: JSON.stringify(requestBody),
        }
      );

      const googleData = await googleResponse.json();

      if (!googleResponse.ok) {
        console.error(
          `Google Routes API error for group ${groupIndex + 1}:`,
          googleData
        );

        return res.status(502).json({
          error: {
            code: "ROUTE_PROVIDER_ERROR",
            message: `Google Maps could not calculate route group ${groupIndex + 1}.`,
          },
          failedGroup: groupIndex + 1,
          groupCount: stopGroups.length,
        });
      }

      const googleRoute = googleData.routes?.[0];

      if (!googleRoute) {
        return res.status(502).json({
          error: {
            code: "NO_ROUTE_FOUND",
            message: `Google Maps returned no route for group ${groupIndex + 1}.`,
          },
          failedGroup: groupIndex + 1,
          groupCount: stopGroups.length,
        });
      }

      // Apply Google's optimized stop order.
      const optimizedIndexes =
        googleRoute.optimizedIntermediateWaypointIndex ?? [];

      const orderedIntermediateStops =
        optimizedIndexes.length === intermediateStops.length
          ? optimizedIndexes.map(
              (index) => intermediateStops[index]
            )
          : intermediateStops;

      // For routes that do not return to the origin,
      // append the fixed destination after the optimized stops.
      const orderedStops = returnToOrigin
        ? orderedIntermediateStops
        : [
            ...orderedIntermediateStops,
            groupStops[groupStops.length - 1],
          ];

      // Add sequence numbers within each group.
      const stops = orderedStops.map((stop, index) => ({
        ...stop,
        sequence: index + 1,
        group: groupIndex + 1,
      }));

      groups.push({
        group: groupIndex + 1,
        count: stops.length,
        returnToOrigin,
        stops,
        route: {
          distanceMeters: googleRoute.distanceMeters,
          duration: googleRoute.duration,
          encodedPolyline:
            googleRoute.polyline?.encodedPolyline ?? null,
          legs: googleRoute.legs ?? [],
        },
      });
    }

    // Flatten stops for clients that also need a complete stop list.
    const allStops = groups.flatMap((group) => group.stops);

    // Preserve the old single-route field when there is only one group.
    // Multiple groups have separate routes and separate polylines.
    const route =
      groups.length === 1 ? groups[0].route : null;

    return res.json({
      thresholdPercent: COLLECTION_THRESHOLD,
      count: allStops.length,
      groupCount: groups.length,
      maxStopsPerGroup: MAX_STOPS_PER_GROUP,
      generatedAt: new Date().toISOString(),
      trafficAware: true,
      optimized: true,
      returnToOrigin,

      origin: {
        latitude: originLat,
        longitude: originLng,
      },

      // All stops in one array.
      stops: allStops,

      // Each group has its own stops and optimized route.
      groups,

      // Populated for a single group; null for multiple groups.
      route,
    });
  })
);

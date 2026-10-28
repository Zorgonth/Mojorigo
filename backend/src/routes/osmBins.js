
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
    const sensorId = String(reading.sensorId ?? "").trim();
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

    // Default: start and finish at the same depot/location.
    const returnToOrigin = req.body?.returnToOrigin !== false;

    const bins = readCsvFile(binsCsvPath);
    const readings = readCsvFile(readingsCsvPath);
    const latestBySensor = getLatestReadingBySensor(readings);

    // Keep only locations where at least one sensor is OVER 70%.
    const collectionStops = bins
      .map((bin) => {
        const latitude = Number(bin.lat);
        const longitude = Number(bin.lng);

        if (!validCoordinate(latitude, longitude)) {
          return null;
        }

        const sensors = SENSOR_TYPES.map(({ type, column }) => {
          const sensorId = String(bin[column] ?? "").trim();
          const reading = latestBySensor.get(sensorId);

          return {
            type,
            sensorId,
            fillPercent: reading?.fillPercent ?? null,
            receivedAt: reading?.receivedAt ?? null,
            cm: Number.isFinite(reading?.cm) ? reading.cm : null,
          };
        });

        const sensorsToCollect = sensors.filter(
          (sensor) =>
            sensor.sensorId &&
            sensor.fillPercent !== null &&
            sensor.fillPercent > COLLECTION_THRESHOLD,
        );

        if (sensorsToCollect.length === 0) {
          return null;
        }

        return {
          id: bin.id,
          name: bin.arena_name || bin.name || "Glass collection point",
          city: bin.city || "",
          address: bin.address || "",
          latitude,
          longitude,
          sensorsToCollect,
        };
      })
      .filter(Boolean);

    if (collectionStops.length === 0) {
      return res.json({
        thresholdPercent: COLLECTION_THRESHOLD,
        count: 0,
        stops: [],
        route: null,
        message: "No sensors currently require collection.",
      });
    }

    if (collectionStops.length > 25) {
      return res.status(422).json({
        error: {
          code: "TOO_MANY_STOPS",
          message:
            "More than 25 locations need collection. Use Google's Route Optimization API to plan a larger collection route.",
        },
        thresholdPercent: COLLECTION_THRESHOLD,
        count: collectionStops.length,
        stops: collectionStops,
      });
    }

    if (!apiKey) {
      const error = new Error(
        "GOOGLE_MAPS_API_KEY is not configured.",
      );
      error.statusCode = 500;
      throw error;
    }


    // When returning to the origin, optimize every collection stop.
    // Otherwise, the final stop is the destination and stays fixed.
    const intermediateStops = returnToOrigin
      ? collectionStops
      : collectionStops.slice(0, -1);

    const destination = returnToOrigin
      ? { latitude: originLat, longitude: originLng }
      : collectionStops[collectionStops.length - 1];

    const requestBody = {
      origin: toWaypoint(originLat, originLng),
      destination: toWaypoint(
        destination.latitude,
        destination.longitude,
      ),
      intermediates: intermediateStops.map((stop) =>
        toWaypoint(stop.latitude, stop.longitude),
      ),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      departureTime: new Date().toISOString(),
      optimizeWaypointOrder: true,
      polylineQuality: "HIGH_QUALITY",
      languageCode: "en",
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
      },
    );

    const googleData = await googleResponse.json();

    if (!googleResponse.ok) {
      console.error("Google Routes API error:", googleData);

      return res.status(502).json({
        error: {
          code: "ROUTE_PROVIDER_ERROR",
          message: "Google Maps could not calculate the collection route.",
        },
      });
    }

    const googleRoute = googleData.routes?.[0];

    if (!googleRoute) {
      return res.status(502).json({
        error: {
          code: "NO_ROUTE_FOUND",
          message: "Google Maps returned no route.",
        },
      });
    }

    const optimizedIndexes =
      googleRoute.optimizedIntermediateWaypointIndex ?? [];

    const orderedIntermediateStops =
      optimizedIndexes.length === intermediateStops.length
        ? optimizedIndexes.map((index) => intermediateStops[index])
        : intermediateStops;

    const orderedStops = returnToOrigin
      ? orderedIntermediateStops
      : [
          ...orderedIntermediateStops,
          collectionStops[collectionStops.length - 1],
        ];

    const stops = orderedStops.map((stop, index) => ({
      ...stop,
      sequence: index + 1,
    }));

    return res.json({
      thresholdPercent: COLLECTION_THRESHOLD,
      count: stops.length,
      generatedAt: new Date().toISOString(),
      trafficAware: true,
      optimized: true,
      returnToOrigin,
      origin: {
        latitude: originLat,
        longitude: originLng,
      },
      stops,
      route: {
        distanceMeters: googleRoute.distanceMeters,
        duration: googleRoute.duration,
        encodedPolyline:
          googleRoute.polyline?.encodedPolyline ?? null,
        legs: googleRoute.legs ?? [],
      },
    });
  }),
);

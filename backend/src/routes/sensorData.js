import { Router } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readCsvFile } from "../utils/csv.js";
import { store } from "../data/store.js";
import { saveReadingToCsv } from "../services/csvReadingService.js";

export const sensorDataRouter = Router();

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

const readingsCsvPath = path.join(
  projectRoot,
  "database",
  "readings.csv"
);

const BIN_HEIGHT_CM = 130;

// Receive a TTN uplink and save a reading.
sensorDataRouter.post("/", async (req, res, next) => {
  console.log("Received TTN payload:", JSON.stringify(req.body, null, 2));

  try {
    const payload = req.body ?? {};
    const uplink = payload.uplink_message ?? {};
    const decodedPayload = uplink.decoded_payload ?? {};

    // Use the ID from the decoded payload to identify the sensor.
    const id = decodedPayload.id;

    // Get the decoded distance.
    const cm = decodedPayload.distance_cm;

    console.log("Received sensor ID:", id);
    console.log("Received distance in cm:", cm);

    // Validate the sensor ID.
    if (id === undefined || id === null || String(id).trim() === "") {
      return res.status(400).json({
        error: "Missing sensor ID in decoded payload",
      });
    }

    // Validate distance.
    if (
      typeof cm !== "number" ||
      !Number.isFinite(cm) ||
      cm < 0 ||
      cm > BIN_HEIGHT_CM
    ) {
      return res.status(400).json({
        error: `Distance must be a number between 0 and ${BIN_HEIGHT_CM} cm`,
      });
    }

    // Find the bin using ONLY the decoded payload ID.
    // store.bins should contain the bins loaded from bins.csv.
    const sensorId = String(id).trim();

    const bin = store.bins.find(
      (item) => String(item.sensorId ?? "").trim() === sensorId
    );

    // Stop if the ID does not match a configured bin.
    if (!bin) {
      return res.status(404).json({
        error: "No bin is configured for this sensor ID",
        sensorId,
        hint: "Check that the sensor ID matches the sensor_id column in bins.csv",
      });
    }

    // Calculate percentage filled.
    const fillPercent = Number(
      (((BIN_HEIGHT_CM - cm) / BIN_HEIGHT_CM) * 100).toFixed(2)
    );

    const latitude = bin.latitude ?? bin.lat ?? "";
    const longitude = bin.longitude ?? bin.lng ?? bin.lon ?? "";

    const binLocation =
      bin.location ??
      bin.address ??
      (
        [
          bin.street,
          bin.houseNumber,
          bin.postcode,
          bin.city,
        ]
          .filter(Boolean)
          .join(" ") ||
        (
          latitude !== "" && longitude !== ""
            ? `${latitude}, ${longitude}`
            : "Location not specified"
        )
      );

    // Prepare the reading using the decoded sensor ID.
    const reading = {
      receivedAt:
        payload.received_at ??
        uplink.received_at ??
        new Date().toISOString(),
      sensorId,
      cm,
      fillPercent,
      binId: bin.id,
      binLocation,
      latitude,
      longitude,
    };

    // Append the reading to readings.csv.
    await saveReadingToCsv(reading);

    return res.status(201).json({
      message: "TTN sensor reading received and saved",
      data: reading,
    });
  } catch (error) {
    next(error);
  }
});

// Return the newest reading for each sensor.
sensorDataRouter.get("/latest", (req, res, next) => {
  try {
    const readings = readCsvFile(readingsCsvPath);
    const latestBySensor = new Map();

    for (const row of readings) {
      const sensorId = row.sensorId;
      const receivedAt = row.receivedAt;

      if (!sensorId || !receivedAt) continue;

      const timestamp = Date.parse(receivedAt);

      if (!Number.isFinite(timestamp)) continue;

      const current = latestBySensor.get(sensorId);

      if (!current || timestamp > current.timestamp) {
        latestBySensor.set(sensorId, {
          timestamp,
          reading: {
            receivedAt,
            sensorId,
            cm: Number(row.cm),
            fillPercent: Number(row.fillPercent),
            binId: row.binId,
            binLocation: row.binLocation,
            latitude:
              row.latitude === "" ? null : Number(row.latitude),
            longitude:
              row.longitude === "" ? null : Number(row.longitude),
          },
        });
      }
    }

    const data = Array.from(latestBySensor.values()).map(
      (item) => item.reading
    );

    return res.status(200).json({
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
});
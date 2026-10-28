
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
    const device = payload.end_device_ids ?? {};
    const uplink = payload.uplink_message ?? {};

    // TTN device identifiers.
    const deviceId = device.device_id;
    const devEui = device.dev_eui;

    // Prefer TTN's decoded distance.
    let cm =
      uplink.decoded_payload?.distance_cm ??
      uplink.decoded_payload?.cm;

    // Fallback: decode the first byte of the Base64 payload.
    if (cm === undefined && uplink.frm_payload) {
      const bytes = Buffer.from(uplink.frm_payload, "base64");

      if (bytes.length > 0) {
        cm = bytes[0];
      }
    }
    console.log("THIS IS THE NUMBER OF CMS RECEIVED:", cm);
    // Validate the sensor identifier.
    if (
      typeof deviceId !== "string" ||
      deviceId.trim() === ""
    ) {
      return res.status(400).json({
        error: 'Missing end_device_ids.device_id in TTN payload',
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

    // Match the TTN device ID or its DevEUI to a configured bin.
    const identifiers = [deviceId.trim(), devEui]
      .filter(Boolean);


    const bin = store.bins.find((item) =>
      identifiers.includes(String(item.sensorId).trim())
    );

    // ----------------------------------

    if (!bin) {
      return res.status(404).json({
        error: "No bin is configured for this TTN device",
        deviceId,
        devEui: devEui ?? null,
        hint: "Check the sensor_id column in your bins.csv",
      });
    }

    // Calculate percentage filled.
    const fillPercent = Number(
      (((BIN_HEIGHT_CM - cm) / BIN_HEIGHT_CM) * 100).toFixed(2)
    );

    const latitude = bin.latitude ?? bin.lat ?? "";
    const longitude =
      bin.longitude ?? bin.lng ?? bin.lon ?? "";

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

    const reading = {
      receivedAt:
        payload.received_at ??
        uplink.received_at ??
        new Date().toISOString(),
      sensorId: deviceId.trim(),
      cm,
      fillPercent,
      binId: bin.id,
      binLocation,
      latitude,
      longitude,
    };

    // Append one new CSV row; do not replace existing rows.
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

    const data = Array.from(latestBySensor.values())
      .map((item) => item.reading);

    return res.status(200).json({
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
});

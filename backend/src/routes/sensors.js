import { Router } from "express";
import { store, storeRawSensorPayload } from "../data/store.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ingestReading } from "../services/sensorService.js";

export const sensorsRouter = Router();

sensorsRouter.post(
  "/ingest",
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: ingestReading(req.body) });
  }),
);

/**
 * POST /api/sensors/receive
 *
 * This is the hardware-facing endpoint.
 * Sensors will POST fill / temp / humidity (and whatever else the firmware sends) here.
 *
 * Parsing is intentionally NOT done yet:
 * - we do not map payload fields onto bins
 * - we do not update fill levels from this body
 * - we only keep the raw payload so the contract exists
 *
 * The `mock` object is the current CSV-backed state the frontend should use for now.
 */
sensorsRouter.post("/receive", (req, res) => {
  const raw = storeRawSensorPayload(req.body);

  res.status(202).json({
    data: {
      accepted: true,
      parsingEnabled: false,
      receivedAt: raw.receivedAt,
      rawId: raw.id,
      mock: {
        bins: store.bins,
        latestReadings: store.readings.slice(-10),
      },
    },
  });
});

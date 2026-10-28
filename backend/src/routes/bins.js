
import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  getBin,
  getBinReadings,
  listAreas,
  listBins,
  listGlassTypes,
} from "../services/binService.js";
import { collectBin } from "../services/sensorService.js";
import { googleMapsLink } from "../services/googleMapsService.js";

export const binsRouter = Router();

binsRouter.get("/glass-types", (_req, res) => {
  res.json({ data: listGlassTypes() });
});

binsRouter.get("/areas", (_req, res) => {
  res.json({ data: listAreas() });
});

binsRouter.get("/", (req, res) => {
  res.json({
    data: listBins({
      glassType: req.query.glassType,
      areaId: req.query.areaId,
      status: req.query.status,
    }),
  });
});

// GET /api/bins/:binId/maps-link
binsRouter.get(
  "/:binId/maps-link",
  asyncHandler(async (req, res) => {
    const bin = getBin(req.params.binId);
    const data = await googleMapsLink(bin);
    res.json({ data });
  }),
);

binsRouter.get(
  "/:binId/readings",
  asyncHandler(async (req, res) => {
    res.json({
      data: getBinReadings(req.params.binId, {
        from: req.query.from,
        to: req.query.to,
        limit: req.query.limit,
      }),
    });
  }),
);

binsRouter.post(
  "/:binId/collect",
  asyncHandler(async (req, res) => {
    res.status(201).json({
      data: collectBin(req.params.binId),
    });
  }),
);

binsRouter.get(
  "/:binId",
  asyncHandler(async (req, res) => {
    res.json({ data: getBin(req.params.binId) });
  }),
);


import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getOsmBin } from "../services/osmBinService.js";

export const osmBinsRouter = Router();

osmBinsRouter.get(
  "/:osmType/:osmId/maps-link",
  asyncHandler(async (req, res) => {
    const osmId = `${req.params.osmType}/${req.params.osmId}`;
    const data = getOsmBin(osmId);

    res.json({ data });
  }),
);

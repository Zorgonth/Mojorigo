import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { collectionRoute } from "../services/routeService.js";

export const routesRouter = Router();

routesRouter.get(
  "/collection",
  asyncHandler(async (req, res) => {
    res.json({ data: await collectionRoute(req.query) });
  }),
);

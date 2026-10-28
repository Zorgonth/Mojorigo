import { Router } from "express";
import { dashboard, mapPoints, usageByArea, usageByGlassType } from "../services/analyticsService.js";

export const analyticsRouter = Router();

analyticsRouter.get("/dashboard", (_req, res) => {
  res.json({ data: dashboard() });
});

analyticsRouter.get("/map", (_req, res) => {
  res.json({ data: mapPoints() });
});

analyticsRouter.get("/areas", (_req, res) => {
  res.json({ data: usageByArea() });
});

analyticsRouter.get("/glass-types", (_req, res) => {
  res.json({ data: usageByGlassType() });
});

import { Router } from "express";
import { emptyingAlertPayload } from "../services/alertService.js";

export const alertsRouter = Router();

alertsRouter.get("/", (_req, res) => {
  res.json({ data: emptyingAlertPayload() });
});

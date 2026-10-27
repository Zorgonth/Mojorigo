import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { alertsRouter } from "./routes/alerts.js";
import { analyticsRouter } from "./routes/analytics.js";
import { binsRouter } from "./routes/bins.js";
import { routesRouter } from "./routes/routes.js";
import { sensorsRouter } from "./routes/sensors.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "mojorigo-backend" });
  });

  app.use("/api/bins", binsRouter);
  app.use("/api/sensors", sensorsRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api/routes", routesRouter);
  app.use("/api/analytics", analyticsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

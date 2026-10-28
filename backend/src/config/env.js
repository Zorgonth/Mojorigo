import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(backendRoot, ".env") });
// Also support the repository-level environment file without overriding backend settings.
dotenv.config({ path: path.resolve(backendRoot, "..", ".env") });

export const config = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  fillAlertThreshold: Number(process.env.FILL_ALERT_THRESHOLD) || 70,
  fillStaleThreshold: Number(process.env.FILL_STALE_THRESHOLD) || 50,
  fillCriticalThreshold: Number(process.env.FILL_CRITICAL_THRESHOLD) || 90,
  staleCollectionDays: Number(process.env.STALE_COLLECTION_DAYS) || 30,
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "",
  depotLat: Number(process.env.DEPOT_LAT) || 49.1495,
  depotLng: Number(process.env.DEPOT_LNG) || 9.188,
  dataDir: path.join(backendRoot, "data"),
  backendRoot,
};

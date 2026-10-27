import { store } from "../data/store.js";
import { httpError } from "../middleware/errorHandler.js";

export function listGlassTypes() {
  return store.glassTypes;
}

export function listAreas() {
  return store.areas;
}

export function listBins(filters = {}) {
  return store.bins.filter((bin) => {
    if (filters.glassType && bin.glassType !== filters.glassType) return false;
    if (filters.areaId && bin.areaId !== filters.areaId) return false;
    if (filters.status && bin.status !== filters.status) return false;
    return true;
  });
}

export function getBin(binId) {
  const bin = store.bins.find((item) => item.id === binId);
  if (!bin) throw httpError(404, `Bin ${binId} not found`, "BIN_NOT_FOUND");
  return bin;
}

export function getBinReadings(binId, { from, to, limit } = {}) {
  getBin(binId);
  let readings = store.readings.filter((reading) => reading.binId === binId);

  if (from) readings = readings.filter((reading) => reading.recordedAt >= from);
  if (to) readings = readings.filter((reading) => reading.recordedAt <= to);

  readings.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  if (limit) readings = readings.slice(-Number(limit));
  return readings;
}

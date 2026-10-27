import { addReading, markCollected, store } from "../data/store.js";
import { httpError } from "../middleware/errorHandler.js";

export function ingestReading(payload) {
  const bin = payload.binId
    ? store.bins.find((item) => item.id === payload.binId)
    : store.bins.find((item) => item.sensorId === payload.sensorId);

  if (!bin) {
    throw httpError(404, "Bin or sensor not found", "SENSOR_NOT_FOUND");
  }

  const fillPercent = Number(payload.fillPercent);
  const temperatureC = Number(payload.temperatureC);
  const humidityPercent = Number(payload.humidityPercent);

  if (Number.isNaN(fillPercent) || fillPercent < 0 || fillPercent > 100) {
    throw httpError(400, "fillPercent must be between 0 and 100", "INVALID_FILL");
  }
  if (Number.isNaN(temperatureC)) {
    throw httpError(400, "temperatureC is required", "INVALID_TEMP");
  }
  if (Number.isNaN(humidityPercent) || humidityPercent < 0 || humidityPercent > 100) {
    throw httpError(400, "humidityPercent must be between 0 and 100", "INVALID_HUMIDITY");
  }

  return addReading({
    binId: bin.id,
    sensorId: payload.sensorId || bin.sensorId,
    fillPercent,
    temperatureC,
    humidityPercent,
    recordedAt: payload.recordedAt,
  });
}

export function collectBin(binId) {
  const result = markCollected(binId);
  if (!result) throw httpError(404, `Bin ${binId} not found`, "BIN_NOT_FOUND");
  return result;
}

import { store } from "../data/store.js";
import { emptyingRules } from "../utils/fillStatus.js";

export function listEmptyingAlerts() {
  return store.bins
    .filter((bin) => bin.needsEmptying)
    .sort((a, b) => {
      const rank = { critical: 3, needs_emptying: 2, overdue: 1 };
      return (rank[b.status] || 0) - (rank[a.status] || 0) || b.fillPercent - a.fillPercent;
    })
    .map((bin) => ({
      binId: bin.id,
      sensorId: bin.sensorId,
      name: bin.name,
      areaId: bin.areaId,
      areaName: bin.areaName,
      glassType: bin.glassType,
      address: bin.address,
      fillPercent: bin.fillPercent,
      temperatureC: bin.temperatureC,
      humidityPercent: bin.humidityPercent,
      status: bin.status,
      lat: bin.lat,
      lng: bin.lng,
      lastReadingAt: bin.lastReadingAt,
      lastCollectedAt: bin.lastCollectedAt,
      daysSinceLastCollection: bin.daysSinceLastCollection,
      emptyingThreshold: bin.emptyingThreshold,
      overdueForCollection: bin.overdueForCollection,
      urgencyMessage: bin.urgencyMessage,
    }));
}

export function emptyingAlertPayload() {
  const bins = listEmptyingAlerts();
  return {
    rules: emptyingRules(),
    count: bins.length,
    bins,
  };
}

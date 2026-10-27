import { store } from "../data/store.js";
import { listEmptyingAlerts } from "./alertService.js";

function average(values) {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

export function usageByArea() {
  return store.areas
    .map((area) => {
      const bins = store.bins.filter((bin) => bin.areaId === area.id);
      const collections = store.collections.filter((item) => bins.some((bin) => bin.id === item.binId));
      return {
        areaId: area.id,
        areaName: area.name,
        city: area.city,
        lat: area.lat,
        lng: area.lng,
        binCount: bins.length,
        avgFillPercent: average(bins.map((bin) => bin.fillPercent)),
        binsNeedingEmptying: bins.filter((bin) => bin.needsEmptying).length,
        collectionCount: collections.length,
      };
    })
    .sort((a, b) => b.collectionCount - a.collectionCount || b.avgFillPercent - a.avgFillPercent);
}

export function usageByGlassType() {
  return store.glassTypes
    .map((type) => {
      const bins = store.bins.filter((bin) => bin.glassType === type.id);
      const collections = store.collections.filter((item) => bins.some((bin) => bin.id === item.binId));
      return {
        glassType: type.id,
        nameEn: type.nameEn,
        nameDe: type.nameDe,
        colorHex: type.colorHex,
        binCount: bins.length,
        avgFillPercent: average(bins.map((bin) => bin.fillPercent)),
        collectionCount: collections.length,
      };
    })
    .sort((a, b) => b.collectionCount - a.collectionCount);
}

export function mapPoints() {
  return store.bins.map((bin) => ({
    binId: bin.id,
    name: bin.name,
    glassType: bin.glassType,
    areaId: bin.areaId,
    areaName: bin.areaName,
    lat: bin.lat,
    lng: bin.lng,
    fillPercent: bin.fillPercent,
    status: bin.status,
    needsEmptying: bin.needsEmptying,
    emptyingThreshold: bin.emptyingThreshold,
    overdueForCollection: bin.overdueForCollection,
    daysSinceLastCollection: bin.daysSinceLastCollection,
    lastCollectedAt: bin.lastCollectedAt,
    urgencyMessage: bin.urgencyMessage,
    temperatureC: bin.temperatureC,
    humidityPercent: bin.humidityPercent,
  }));
}

export function dashboard() {
  const bins = store.bins;
  return {
    totals: {
      bins: bins.length,
      areas: store.areas.length,
      glassTypes: store.glassTypes.length,
      readings: store.readings.length,
      collections: store.collections.length,
    },
    avgFillPercent: average(bins.map((bin) => bin.fillPercent)),
    avgTemperatureC: average(bins.map((bin) => bin.temperatureC)),
    avgHumidityPercent: average(bins.map((bin) => bin.humidityPercent)),
    emptyingAlerts: listEmptyingAlerts(),
    busiestAreas: usageByArea(),
    glassTypeUsage: usageByGlassType(),
  };
}

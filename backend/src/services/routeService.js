import { config } from "../config/env.js";
import { httpError } from "../middleware/errorHandler.js";
import { listEmptyingAlerts } from "./alertService.js";

function depotFromQuery(query = {}) {
  const lat = query.originLat != null ? Number(query.originLat) : config.depotLat;
  const lng = query.originLng != null ? Number(query.originLng) : config.depotLng;
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw httpError(400, "originLat and originLng must be numbers", "INVALID_DEPOT");
  }
  return { name: "Heilbronn depot", lat, lng };
}

function mapsDirUrl(origin, stops, backToDepot) {
  const points = [
    `${origin.lat},${origin.lng}`,
    ...stops.map((stop) => `${stop.lat},${stop.lng}`),
  ];
  if (backToDepot) points.push(`${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/${points.join("/")}`;
}

function nearestNeighborOrder(origin, bins) {
  const remaining = [...bins];
  const ordered = [];
  let current = origin;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((bin, index) => {
      const dLat = bin.lat - current.lat;
      const dLng = bin.lng - current.lng;
      const distance = dLat * dLat + dLng * dLng;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    current = next;
  }

  return ordered;
}

async function googleOptimizedOrder(origin, bins) {
  if (!config.googleMapsApiKey) {
    throw httpError(
      503,
      "GOOGLE_MAPS_API_KEY is not set. Add it to backend/.env (Directions API enabled).",
      "GOOGLE_MAPS_KEY_MISSING",
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  url.searchParams.set("destination", `${origin.lat},${origin.lng}`);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "de");
  url.searchParams.set("region", "de");
  url.searchParams.set("key", config.googleMapsApiKey);

  if (bins.length === 1) {
    url.searchParams.set("destination", `${bins[0].lat},${bins[0].lng}`);
  } else {
    url.searchParams.set("waypoints", `optimize:true|${bins.map((bin) => `${bin.lat},${bin.lng}`).join("|")}`);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw httpError(502, `Google Directions HTTP ${response.status}`, "GOOGLE_DIRECTIONS_HTTP");
  }

  const payload = await response.json();
  if (payload.status !== "OK") {
    throw httpError(
      502,
      payload.error_message || `Google Directions failed: ${payload.status}`,
      "GOOGLE_DIRECTIONS_FAILED",
    );
  }

  const route = payload.routes[0];
  const order = route.waypoint_order?.length ? route.waypoint_order : bins.map((_, index) => index);
  const stops = bins.length === 1 ? bins : order.map((index) => bins[index]);

  return {
    provider: "google_directions",
    stops,
    waypointOrder: bins.length === 1 ? [0] : order,
    distanceMeters: route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0),
    durationSeconds: route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0),
    distanceText: route.legs.map((leg) => leg.distance?.text).filter(Boolean).join(" + "),
    durationText: route.legs.map((leg) => leg.duration?.text).filter(Boolean).join(" + "),
    overviewPolyline: route.overview_polyline?.points ?? null,
    legs: route.legs.map((leg) => ({
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      distance: leg.distance,
      duration: leg.duration,
    })),
  };
}

export async function collectionRoute(query = {}) {
  const depot = depotFromQuery(query);
  const bins = listEmptyingAlerts();

  if (bins.length === 0) {
    return {
      depot,
      rulesApplied: true,
      binsToEmpty: [],
      googleMapsUrl: null,
      route: null,
      message: "No bins currently need emptying",
    };
  }

  let route;
  try {
    route = await googleOptimizedOrder(depot, bins);
  } catch (error) {
    if (query.fallback === "false") throw error;

    const stops = nearestNeighborOrder(depot, bins);
    route = {
      provider: "nearest_neighbor_fallback",
      fallbackReason: error.message,
      stops,
      waypointOrder: stops.map((stop) => bins.findIndex((bin) => bin.binId === stop.binId)),
      distanceMeters: null,
      durationSeconds: null,
      distanceText: null,
      durationText: null,
      overviewPolyline: null,
      legs: [],
    };
  }

  return {
    depot,
    binsToEmpty: bins,
    googleMapsUrl: mapsDirUrl(depot, route.stops, route.provider === "google_directions" && bins.length > 1),
    route: {
      ...route,
      stops: route.stops.map((stop, index) => ({
        sequence: index + 1,
        ...stop,
      })),
    },
  };
}

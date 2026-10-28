
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const geojsonPath = fileURLToPath(
  new URL("../data/heilbronn-glass-bins.geojson", import.meta.url),
);

const geojson = JSON.parse(
  readFileSync(geojsonPath, "utf8"),
);

export function getOsmBin(osmId) {
  const feature = geojson.features.find(
    (item) =>
      item.id === osmId ||
      item.properties?.["@id"] === osmId,
  );

  if (!feature) {
    const error = new Error(`OSM bin ${osmId} not found`);
    error.statusCode = 404;
    error.code = "OSM_BIN_NOT_FOUND";
    throw error;
  }

  const coordinates = feature.geometry?.coordinates;

  if (
    feature.geometry?.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length < 2
  ) {
    const error = new Error(
      `OSM bin ${osmId} has no valid point coordinates`,
    );
    error.statusCode = 422;
    error.code = "INVALID_OSM_COORDINATES";
    throw error;
  }

  // GeoJSON uses [longitude, latitude], not [latitude, longitude].
  const [longitude, latitude] = coordinates;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    const error = new Error(
      `OSM bin ${osmId} has invalid coordinates`,
    );
    error.statusCode = 422;
    error.code = "INVALID_OSM_COORDINATES";
    throw error;
  }

  const query = `${latitude},${longitude}`;
  const properties = feature.properties ?? {};

  return {
    osmId: feature.id ?? properties["@id"],
    name: properties.name ?? "Glass recycling location",
    latitude,
    longitude,
    googleMapsUrl:
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    directionsUrl:
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`,
  };
}

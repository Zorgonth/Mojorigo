
export async function googleMapsLink(bin) {
  if (!bin) {
    const error = new Error("Bin not found");
    error.statusCode = 404;
    throw error;
  }

  const rawLat = bin.latitude ?? bin.lat;
  const rawLng = bin.longitude ?? bin.lng ?? bin.lon;

  let coordinates = null;

  if (
    rawLat !== undefined &&
    rawLat !== null &&
    rawLng !== undefined &&
    rawLng !== null &&
    String(rawLat).trim() !== "" &&
    String(rawLng).trim() !== ""
  ) {
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    ) {
      coordinates = { lat, lng };
    }
  }

  if (!coordinates) {
    const address = [
      bin.address,
      bin.street,
      bin.houseNumber,
      bin.postcode,
      bin.city ?? "Heilbronn",
      bin.country ?? "Germany",
    ]
      .filter(Boolean)
      .join(", ");

    if (!address) {
      const error = new Error(
        "This bin has no valid coordinates or usable address",
      );
      error.statusCode = 422;
      throw error;
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      const error = new Error(
        "GOOGLE_MAPS_API_KEY is missing from the server environment",
      );
      error.statusCode = 503;
      throw error;
    }

    const params = new URLSearchParams({
      address,
      key: apiKey,
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
    );

    if (!response.ok) {
      const error = new Error(
        `Google Geocoding HTTP error: ${response.status}`,
      );
      error.statusCode = 502;
      throw error;
    }

    const result = await response.json();

    if (result.status !== "OK" || !result.results?.[0]) {
      const error = new Error(
        `Google Geocoding failed: ${result.status}`,
      );
      error.statusCode = 422;
      throw error;
    }

    coordinates = result.results[0].geometry.location;
  }

  const destination = `${coordinates.lat},${coordinates.lng}`;

  return {
    binId: bin.id ?? bin.binId ?? null,
    latitude: coordinates.lat,
    longitude: coordinates.lng,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
    directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
  };
}

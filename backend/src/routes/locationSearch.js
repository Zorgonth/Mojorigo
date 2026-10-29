import { Router } from "express";

export const locationSearchRouter = Router();
const postcodes = new Set(["74072", "74074", "74076", "74078", "74080", "74081"]);
const cache = new Map();
let nextRequest = 0;

// Submit-only lookup: cached and globally limited to one upstream request/second.
locationSearchRouter.get("/", async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (query.length < 3 || query.length > 160) return res.status(400).json({ error: "invalid_query" });
  const key = query.toLocaleLowerCase("de");
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return res.json(cached.results);
  if (Date.now() < nextRequest) return res.status(429).json({ error: "busy" });
  nextRequest = Date.now() + 1100;
  try {
    const params = new URLSearchParams({
      q: /heilbronn/i.test(query) ? query : `${query}, Heilbronn`,
      lang: "de", limit: "5",
      bbox: "9.05,49.07,9.35,49.25",
    });
    const response = await fetch(`${process.env.GEOCODING_URL || "https://photon.komoot.io/api/"}?${params}`, {
      headers: { "User-Agent": "GLASS-Heilbronn/1.0 (container-location-search)", "Accept-Language": "de" },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Geocoding unavailable");
    const { features } = await response.json();
    const results = features.filter(place => {
      const address = place.properties ?? {};
      const [lng, lat] = place.geometry?.coordinates ?? [];
      return address.city === "Heilbronn" && postcodes.has(address.postcode)
        && Number.isFinite(lat) && Number.isFinite(lng);
    }).map(place => {
      const address = place.properties;
      const street = [address.street || address.name, address.housenumber].filter(Boolean).join(" ");
      return { id: `${address.osm_type}${address.osm_id}`,
        label: [street, address.postcode, address.city].filter(Boolean).join(", "),
        coordinates: [place.geometry.coordinates[1], place.geometry.coordinates[0]] };
    });
    if (cache.size >= 300) cache.delete(cache.keys().next().value);
    cache.set(key, { results, expires: Date.now() + 86400000 });
    res.json(results);
  } catch {
    res.status(502).json({ error: "geocoding_unavailable" });
  }
});

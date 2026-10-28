import { useEffect, useState } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./GlassBinsMap.css";

interface SensorReading {
  type: "green" | "brown" | "white";
  sensorId: string;
  fillPercent: number | null;
  cm: number | null;
  receivedAt: string | null;
}

interface GlassBin {
  id: string;
  name: string;
  area: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  sensors: SensorReading[];
  googleMapsUrl: string;
}

interface GlassBinsMapProps {
  glassType?: "all" | "brown" | "white" | "green";
  searchTerm?: string;
  location?: [number, number] | null;
}

interface MapResponse {
  count: number;
  data: GlassBin[];
}

const API_URL = "http://localhost:3001/api/osm-bins/map";
const HEILBRONN_CENTER: [number, number] = [49.1427, 9.2109];

function normalizeText(value: string | undefined) {
  return (value ?? "").toLowerCase().trim();
}

function matchesGlassFilter(bin: GlassBin, activeGlassType: GlassBinsMapProps["glassType"]) {
  if (!activeGlassType || activeGlassType === "all") {
    return true;
  }

  const text = `${bin.name} ${bin.area} ${bin.address} ${bin.city} ${bin.sensors
    .map((sensor) => sensor.type)
    .join(" ")}`.toLowerCase();

  if (activeGlassType === "green") {
    return text.includes("green") || text.includes("blue");
  }

  return text.includes(activeGlassType);
}

function matchesSearchTerm(bin: GlassBin, searchTerm: string | undefined) {
  if (!searchTerm || !searchTerm.trim()) {
    return true;
  }

  const query = normalizeText(searchTerm);
  if (!query) {
    return true;
  }

  const postcodeLookup: Record<string, string[]> = {
    innenstadt: ["74072", "74080"],
    boeckingen: ["74076"],
    sontheim: ["74078"],
    neckargartach: ["74072", "74080"],
    pfuehl: ["74072", "74080"],
  };

  const haystacks = [
    bin.name,
    bin.address,
    bin.city,
    bin.area,
    ...Object.values(postcodeLookup).flat(),
  ];

  if (haystacks.some((value) => normalizeText(value).includes(query))) {
    return true;
  }

  const numericQuery = /\d{4,5}/.test(query);
  if (numericQuery) {
    return Object.values(postcodeLookup)
      .flat()
      .some((postcode) => postcode.includes(query));
  }

  return false;
}

function FitMapToBins({ bins, location }: { bins: GlassBin[]; location?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.setView(location, 13);
      return;
    }

    if (bins.length === 0) return;

    const bounds = L.latLngBounds(
      bins.map((bin) => [bin.latitude, bin.longitude] as [number, number]),
    );

    if (bins.length === 1) {
      map.setView([bins[0].latitude, bins[0].longitude], 15);
    } else {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
  }, [bins, location, map]);

  return null;
}

const glassBinIcon = L.divIcon({
  className: "glass-bin-marker",
  html: `
    <div class="glass-bin-pin">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9 3H15L14 6L16.5 9V19C16.5 20.1 15.6 21 14.5 21H9.5C8.4 21 7.5 20.1 7.5 19V9L10 6L9 3Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linejoin="round"
        />
        <path d="M9 12H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        <path d="M10 3H14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      </svg>
    </div>
  `,
  iconSize: [44, 52],
  iconAnchor: [22, 46],
  popupAnchor: [0, -44],
});

export default function GlassBinsMap({ glassType = "all", searchTerm = "", location = null }: GlassBinsMapProps) {
  const [bins, setBins] = useState<GlassBin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBins() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load glass bins (${response.status})`);
        }

        const result: MapResponse = await response.json();
        const data = (result.data ?? [])
          .map((bin) => ({
            ...bin,
            latitude: Number(bin.latitude),
            longitude: Number(bin.longitude),
          }))
          .filter(
            (bin) =>
              Number.isFinite(bin.latitude) &&
              Number.isFinite(bin.longitude) &&
              bin.latitude >= -90 &&
              bin.latitude <= 90 &&
              bin.longitude >= -180 &&
              bin.longitude <= 180,
          )
          .filter((bin) => matchesGlassFilter(bin, glassType))
          .filter((bin) => matchesSearchTerm(bin, searchTerm));

        setBins(data);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(err instanceof Error ? err.message : "Could not load the glass bins.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchBins();

    return () => controller.abort();
  }, [glassType, searchTerm]);

  return (
    <div className="glass-bins-map">
      <div className="map-status">
        <span className="map-status-dot" />
        {loading ? "Loading glass bins..." : `${bins.length} glass bins`}
      </div>

      {error && <div className="map-message">{error}</div>}

      {!loading && !error && bins.length === 0 && (
        <div className="map-message">No glass bins found.</div>
      )}

      <MapContainer
        center={location ?? HEILBRONN_CENTER}
        zoom={13}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMapToBins bins={bins} location={location} />

        {bins.map((bin) => (
          <Marker
            key={bin.id}
            position={[bin.latitude, bin.longitude]}
            icon={glassBinIcon}
          >
            <Popup>
              <div className="bin-popup">
                <strong>{bin.name}</strong>
                <p>
                  <b>Area:</b> {bin.area}
                </p>
                <p>
                  <b>City:</b> {bin.city}
                </p>
                <p>
                  <b>Address:</b> {bin.address}
                </p>
                <a href={bin.googleMapsUrl} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

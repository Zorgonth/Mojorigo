import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./GlassBinsMap.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";



interface GlassBin {
  id: string;
  sensorId: string;
  name: string;
  glassType: string;
  glassTypeNameDe: string;
  area: string;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  fillPercent: number;
  googleMapsUrl: string;
}

interface MapResponse {
  count: number;
  data: GlassBin[];
}

const API_URL = "http://localhost:3001/api/osm-bins/map";

const HEILBRONN_CENTER: [number, number] = [49.1427, 9.2109];

function FitMapToBins({ bins }: { bins: GlassBin[] }) {
  const map = useMap();

  useEffect(() => {
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
  }, [bins, map]);

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
        <path
          d="M9 12H15"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
        <path
          d="M10 3H14"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
        />
      </svg>
    </div>
  `,
  iconSize: [44, 52],
  iconAnchor: [22, 46],
  popupAnchor: [0, -44],
});

export default function GlassBinsMap() {
  const [bins, setBins] = useState<GlassBin[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

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

        const validBins = (result.data ?? [])
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
          );

        setBins(validBins);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Could not load the glass bins.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchBins();

    return () => controller.abort();
  }, []);

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
        center={HEILBRONN_CENTER}
        zoom={13}
        scrollWheelZoom
        className="leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitMapToBins bins={bins} />

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
                  <b>Bin ID:</b> {bin.id}
                </p>
                <p>
                  <b>Glass type:</b> {bin.glassTypeNameDe}
                </p>
                <p>
                  <b>Address:</b> {bin.address}
                </p>
                <p>
                  <b>Fill level:</b> {bin.fillPercent}%
                </p>
                <a
                  href={bin.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
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
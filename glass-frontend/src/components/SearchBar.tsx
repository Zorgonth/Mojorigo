import { useTranslation } from "react-i18next";
import { t } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { MapPin, Search, LocateFixed } from "lucide-react";
import { postcodeCentres } from "./postcode-search";
import { GlassButton } from "./glassyui/glass-button";

const HEILBRONN_POSTCODES = new Set(Object.keys(postcodeCentres));

export default function SearchBar({ onSearch, onLocation }: { onSearch: (query: string) => void; onLocation: (location: [number, number], label?: string) => void }) {
  useTranslation();
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: string; label: string; coordinates: [number, number] }[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  function cancelSearch() {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setResults([]);
  }
  async function handleSearch(value = postcode) {
    cancelSearch();
    const query = value.trim();
    if (/^\d+$/.test(query)) {
      if (!HEILBRONN_POSTCODES.has(query)) {
        setError("Enter a Heilbronn postcode: 74072, 74074, 74076, 74078, 74080 or 74081.");
        return;
      }
      setError("");
      onSearch(query);
      return;
    }
    if (query.length < 3) {
      setError("Enter a Heilbronn address or postcode.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`http://localhost:3001/api/location-search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Search is unavailable. Please try again shortly.");
      const matches = await response.json() as typeof results;
      if (controller.signal.aborted) return;
      if (!matches.length) setError("No address found in Heilbronn. Try a street name and house number.");
      else if (matches.length === 1) onLocation(matches[0].coordinates, matches[0].label);
      else setResults(matches);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Search is unavailable. Please try again shortly.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  function handleCurrentLocation() {
    const address = "Weipertstraße 8-10";
    setPostcode(address);
    void handleSearch(address);
  }

  return (
    <>
      <form
        className="postcode-search"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleSearch();
        }}
      >
        <MapPin className="postcode-icon" size={20} />

        <input
          type="text"
          value={postcode}
          onChange={(event) => {
            cancelSearch();
            setPostcode(event.target.value);
            setError("");
          }}
          maxLength={160}
          required
          autoComplete="street-address"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "postcode-error" : undefined}
          placeholder={t("Address or postcode in Heilbronn")}
          aria-label={t("Heilbronn address or postcode")}
        />

        <GlassButton
          disabled={loading}
          type="submit"
          variant="soft"
          size="sm"
          aria-label={t("Search")}
          className="postcode-submit"
        >
          <Search size={18} />
        </GlassButton>
      </form>
      {loading && <p role="status">{t("Searching for your address…")}</p>}
      {results.length > 0 && <ul className="address-search-results" aria-label={t("Choose an address")}>
        {results.map(result => <li key={result.id}><button type="button" onClick={() => {
          onLocation(result.coordinates, result.label); setResults([]);
        }}>{result.label}</button></li>)}
      </ul>}
      {error && <p id="postcode-error" className="postcode-error" role="alert">{t(error)}</p>}

      <button
        type="button"
        className="current-location-button"
        onClick={handleCurrentLocation}
      >
        <LocateFixed size={18} />
        <span>{t("Use my current location")}</span>
      </button>
    </>
  );
}
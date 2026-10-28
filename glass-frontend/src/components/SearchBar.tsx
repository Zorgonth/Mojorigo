import { useTranslation } from "react-i18next";
import { t } from "../i18n";
import { useState } from "react";
import { MapPin, Search, LocateFixed } from "lucide-react";
import { postcodeCentres } from "./postcode-search";
import { GlassButton } from "./glassyui/glass-button";

const HEILBRONN_POSTCODES = new Set(Object.keys(postcodeCentres));

export default function SearchBar({ onSearch, onLocation }: { onSearch: (query: string) => void; onLocation: (location: [number, number]) => void }) {
  useTranslation();
  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState("");

  function handleSearch() {
    if (!HEILBRONN_POSTCODES.has(postcode)) {
      setError("Enter a Heilbronn postcode: 74072, 74074, 74076, 74078, 74080 or 74081.");
      return;
    }
    setError("");
    onSearch(postcode);
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      setError("Your browser does not support location access. Search by postcode instead.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setError("");
        onLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        setError(error.code === 1 ? "Location access was denied. Enter a Heilbronn postcode instead." : "Could not find your location. Try a postcode instead.");
      }
    );
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
            setPostcode(event.target.value.replace(/[^0-9]/g, "").slice(0, 5));
            setError("");
          }}
          inputMode="numeric"
          pattern="[0-9]{5}"
          maxLength={5}
          required
          autoComplete="postal-code"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "postcode-error" : undefined}
          placeholder={t("Heilbronn postcode (e.g. 74072)")}
          aria-label={t("Heilbronn postcode")}
        />

        <GlassButton
          type="submit"
          variant="soft"
          size="sm"
          aria-label={t("Search")}
          className="postcode-submit"
        >
          <Search size={18} />
        </GlassButton>
      </form>
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
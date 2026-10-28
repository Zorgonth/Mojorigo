import { useState } from "react";
import { MapPin, Search, LocateFixed } from "lucide-react";
import { GlassButton } from "./glassyui/glass-button";

const HEILBRONN_POSTCODES = new Set(["74072", "74074", "74076", "74078", "74080", "74081"]);

export default function SearchBar({ onSearch, onLocation }: { onSearch: (query: string) => void; onLocation: (location: [number, number]) => void }) {
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
      console.log("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocation([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        console.log("Unable to retrieve location:", error.message);
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
          placeholder="Heilbronn postcode (e.g. 74072)"
          aria-label="Heilbronn postcode"
        />

        <GlassButton
          type="submit"
          variant="soft"
          size="sm"
          aria-label="Search"
          className="postcode-submit"
        >
          <Search size={18} />
        </GlassButton>
      </form>
      {error && <p id="postcode-error" className="postcode-error" role="alert">{error}</p>}

      <button
        type="button"
        className="current-location-button"
        onClick={handleCurrentLocation}
      >
        <LocateFixed size={18} />
        <span>Use my current location</span>
      </button>
    </>
  );
}
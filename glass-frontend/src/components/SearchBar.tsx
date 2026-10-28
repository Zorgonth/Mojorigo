import { useState } from "react";
import { MapPin, Search, LocateFixed } from "lucide-react";
import { GlassButton } from "./glassyui/glass-button";

export default function SearchBar() {
  const [postcode, setPostcode] = useState("");

  function handleSearch() {
    console.log("Searching postcode:", postcode);
  }

  function handleCurrentLocation() {
    if (!navigator.geolocation) {
      console.log("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Current location:", {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
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
        onSubmit={(event) => {
          event.preventDefault();
          handleSearch();
        }}
      >
        <MapPin className="postcode-icon" size={20} />

        <input
          type="text"
          value={postcode}
          onChange={(event) => setPostcode(event.target.value)}
          placeholder="ENTER POSTCODE (e.g. 74072)"
          aria-label="German postcode"
          inputMode="numeric"
          maxLength={5}
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
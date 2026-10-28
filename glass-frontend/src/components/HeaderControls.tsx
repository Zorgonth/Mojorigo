import { useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";

export default function HeaderControls() {
  const [language, setLanguage] = useState("EN");

  return (
    <div className="header-controls">
      <div className="language-selector">
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          aria-label="Select language"
        >
          <option value="EN">EN</option>
          <option value="DE">DE</option>
        </select>

        <ChevronDown size={18} />
      </div>

      <button
        type="button"
        className="profile-button"
        aria-label="Profile"
      >
        <UserRound size={24} />
      </button>
    </div>
  );
}
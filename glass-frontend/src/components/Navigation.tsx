import { useState } from "react";
import { MapPin, Info, Recycle } from "lucide-react";

type NavigationTab = "find" | "about" | "recycling";

export default function Navigation() {
  const [activeTab, setActiveTab] = useState<NavigationTab>("find");

  return (
    <nav className="glass-navigation" aria-label="Main navigation">
      <button
        type="button"
        className={`nav-button ${activeTab === "find" ? "nav-active" : ""}`}
        onClick={() => setActiveTab("find")}
        aria-current={activeTab === "find" ? "page" : undefined}
      >
        <MapPin size={21} strokeWidth={2.7} />
        <span>Find Bins</span>
      </button>

      <button
        type="button"
        className={`nav-button ${activeTab === "about" ? "nav-active" : ""}`}
        onClick={() => setActiveTab("about")}
        aria-current={activeTab === "about" ? "page" : undefined}
      >
        <Info size={21} strokeWidth={2.5} />
        <span>About</span>
      </button>

      <button
        type="button"
        className={`nav-button ${activeTab === "recycling" ? "nav-active" : ""}`}
        onClick={() => setActiveTab("recycling")}
        aria-current={activeTab === "recycling" ? "page" : undefined}
      >
        <Recycle size={22} strokeWidth={2.7} />
        <span>Recycling Info</span>
      </button>
    </nav>
  );
}
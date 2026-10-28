import { MapPin, Info, Recycle } from "lucide-react";

export type NavigationTab = "find" | "about" | "recycling";

export default function Navigation({ activeTab, onChange }: { activeTab: NavigationTab; onChange: (tab: NavigationTab) => void }) {

  return (
    <nav className="glass-navigation" aria-label="Main navigation">
      <button
        type="button"
        className={`nav-button ${activeTab === "find" ? "nav-active" : ""}`}
        onClick={() => onChange("find")}
        aria-current={activeTab === "find" ? "page" : undefined}
      >
        <MapPin size={21} strokeWidth={2.7} />
        <span>Find Bins</span>
      </button>

      <button
        type="button"
        className={`nav-button ${activeTab === "about" ? "nav-active" : ""}`}
        onClick={() => onChange("about")}
        aria-current={activeTab === "about" ? "page" : undefined}
      >
        <Info size={21} strokeWidth={2.5} />
        <span>About</span>
      </button>

      <button
        type="button"
        className={`nav-button ${activeTab === "recycling" ? "nav-active" : ""}`}
        onClick={() => onChange("recycling")}
        aria-current={activeTab === "recycling" ? "page" : undefined}
      >
        <Recycle size={22} strokeWidth={2.7} />
        <span>Recycling Info</span>
      </button>
    </nav>
  );
}
import { useTranslation } from "react-i18next";
import { t } from "./i18n";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "./App.css";
import "./liquid-theme.css";
import DashboardPage from "./components/DashboardPage";
import GlassFilters from "./components/GlassFilters";
import GlassBinsMap from "./components/GlassBinsMap";
import HeaderControls from "./components/HeaderControls";
import LoginPage from "./components/LoginPage";
import InfoPage from "./components/InfoPage";
import Navigation, { type NavigationTab } from "./components/Navigation";
import NearbyBins from "./components/NearbyBins";
import { postcodeCentres, rankByDistance } from "./components/postcode-search";
import SearchBar from "./components/SearchBar";
import { demoBins, parseMapResponse, compartmentEntries, type GlassBin, type GlassColor } from "./components/bin-data";

function App() {
  useTranslation();
  const [activeTab, setActiveTab] = useState<NavigationTab>("find");
  const [view, setView] = useState<"home" | "login" | "dashboard">("home");
  const [bins, setBins] = useState<GlassBin[]>(demoBins);
  const [demo, setDemo] = useState(true);
  const [color, setColor] = useState<GlassColor>("All");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [location, setLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("http://localhost:3001/api/osm-bins/map", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Map failed to load");
        return response.json();
      })
      .then((result) => {
        const valid = parseMapResponse(result);
        setBins(valid);
        setDemo(false);
        setSelected(null);
      })
      .catch(() => {
        // Keep the demo dataset if the backend is unavailable.
      });

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const matching = bins.filter(bin => color === "All" || bin.sensors.some(sensor => sensor.color === color && sensor.sensorId));
    return location ? rankByDistance(matching, location) : matching;
  }, [bins, color, location]);

  function searchPostcode(postcode: string) {
    const centre = postcodeCentres[postcode];
    if (!centre) return;
    setQuery(postcode);
    setLocation(centre);
    setExpanded(false);
    setSelected(null);
  }
  function searchLocation(coordinates: [number, number]) {
    setQuery("");
    setLocation(coordinates);
    setExpanded(false);
    setSelected(null);
  }
  const visibleSelected = filtered.some(bin => bin.id === selected) ? selected : null;

  if (view === "login") {
    return <LoginPage onBack={() => setView("home")} onLogin={() => setView("dashboard")} />;
  }

  if (view === "dashboard") {
    return <DashboardPage onBack={() => setView("home")} />;
  }

  return (
    <main className={`glass-app ${activeTab === "find" ? "finder-page" : ""}`}>
      <div className="glass-background" />

      <header className="glass-header">
        <div className="brand">
          <div className="glass-logo">
            G.<span className="logo-l">L</span>.A.S.S
          </div>
          <span className="brand-tagline">{t("GLASS RECYCLING NEAR YOU")}</span>
        </div>

        <Navigation activeTab={activeTab} onChange={setActiveTab} />
        <HeaderControls onOpenLogin={() => setView("login")} />
      </header>

      {activeTab !== "find" ? <InfoPage section={activeTab} onFind={() => setActiveTab("find")} /> : <div className={`glass-layout ${panelCollapsed ? "panel-collapsed" : ""}`}>
        <button
          type="button"
          className="panel-toggle"
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          aria-expanded={!panelCollapsed}
          aria-controls="container-search-panel"
          aria-label={panelCollapsed ? t("Show container search") : t("Collapse search to view full map")}
        >
          {panelCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          <span>{panelCollapsed ? t("Find a container") : t("Full map")}</span>
          <ChevronDown size={15} className={panelCollapsed ? "toggle-flipped" : ""} />
        </button>

        <aside id="container-search-panel" className="glass-sidebar" hidden={panelCollapsed}>
          <div className="sidebar-intro">
              <h1>
                <span>{t("Find a glass")}</span>
                <span>{t("container")}</span>
              </h1>
              <p>{t("Check the current fill level of glass recycling containers in your area.")}</p>
            </div>

          <div className="sidebar-scroll">
            <SearchBar onSearch={searchPostcode} onLocation={searchLocation} />
            {location && <p className="search-results-note" role="status">{query ? t("Closest to {{postcode}} · approximate postcode reference point", {postcode: query}) : t("Closest to your location")}{t(". Distances are straight-line estimates.")}</p>}
            <GlassFilters selected={color} onChange={setColor} />
            <NearbyBins
              color={color}
              total={compartmentEntries(filtered, color).length}
              bins={expanded ? filtered : filtered.slice(0, 5)}
              selected={visibleSelected}
              onSelect={setSelected}
            />

            {filtered.length > 5 && (
              <button className="view-more" onClick={() => setExpanded(!expanded)}>
                {expanded ? t("View fewer bins") : t("View more bins")}
                <ChevronDown
                  size={17}
                  style={{ transform: expanded ? "rotate(180deg)" : undefined }}
                />
              </button>
            )}

            <p className="preview-note">
              {demo
                ? t("Design preview · Sample bin locations and fill levels")
                : t("Glass collection points in Heilbronn")}
            </p>
          </div>
        </aside>

        <section className="glass-map" aria-label={t("Map of glass collection points")}>
          <GlassBinsMap
            bins={filtered}
            selected={visibleSelected}
            onSelect={setSelected}
            color={color}
            location={location}
          />
        </section>
      </div>}
    </main>
  );
}

export default App;

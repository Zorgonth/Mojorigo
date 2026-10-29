import LandingPage from "./components/LandingPage";
import { useTranslation } from "react-i18next";
import { t } from "./i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "./App.css";
import "./liquid-theme.css";
import DashboardPage from "./components/DashboardPage";
import GlassBinsMap from "./components/GlassBinsMap";
import HeaderControls from "./components/HeaderControls";
import LoginPage from "./components/LoginPage";
import InfoPage from "./components/InfoPage";
import Navigation, { type NavigationTab } from "./components/Navigation";
import NearbyBins from "./components/NearbyBins";
import { postcodeCentres, rankByDistance } from "./components/postcode-search";
import SearchBar from "./components/SearchBar";
import { demoBins, parseMapResponse, type GlassBin, type GlassColor } from "./components/bin-data";

function App() {
  useTranslation();
  const [activeTab, setActiveTab] = useState<NavigationTab>("find");
  const [view, setView] = useState<"landing" | "home" | "login" | "dashboard">("landing");
  const [managerOpening, setManagerOpening] = useState(false);
  const [managerUnlocking, setManagerUnlocking] = useState(false);
  const [mapOpening, setMapOpening] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("left");
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (navigationTimer.current) clearTimeout(navigationTimer.current); }, []);
  function navigate(next: typeof view, nextDirection: "left" | "right" = "right") {
    if (navigationTimer.current || mapOpening) return;
    setDirection(nextDirection);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setView(next); window.scrollTo(0, 0); return; }
    if (next === "login") {
      if (view === "landing") {
        setManagerOpening(true);
        setView("login"); setLeaving(false); window.scrollTo(0, 0);
        navigationTimer.current = setTimeout(() => { setManagerOpening(false); navigationTimer.current = null; }, 950);
        return;
      }
      setView("login"); setLeaving(false); window.scrollTo(0, 0);
      return;
    }
    if (view === "login" && next === "dashboard") {
      setManagerUnlocking(true);
      setView("dashboard");
      navigationTimer.current = setTimeout(() => { setManagerUnlocking(false); navigationTimer.current = null; }, 1000);
      return;
    }
    if (view === "landing" && next === "home") {
      setMapOpening(true);
      setActiveTab("find");
      setView("home");
      window.scrollTo(0, 0);
      navigationTimer.current = setTimeout(() => { setMapOpening(false); navigationTimer.current = null; }, 1600);
      return;
    }
    setLeaving(true);
    navigationTimer.current = setTimeout(() => {
      if (next === "landing") setActiveTab("find");
      setView(next); setLeaving(false); navigationTimer.current = null; window.scrollTo(0, 0);
    }, 320);
  }
  const motionClass = `page-stage ${mapOpening ? "page-map-opening" : ""} page-direction-${direction} ${leaving ? "page-leaving" : ""}`;
  const [bins, setBins] = useState<GlassBin[]>(demoBins);
  const [demo, setDemo] = useState(true);
  const color: GlassColor = "All";
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
  function searchLocation(coordinates: [number, number], label = "") {
    setQuery(label);
    setLocation(coordinates);
    setExpanded(false);
    setSelected(null);
  }
  const visibleSelected = filtered.some(bin => bin.id === selected) ? selected : null;

  const managerVisible = view === "login" || view === "dashboard";
  const locked = view === "login" || managerUnlocking;
  const managerScene = <div className={`manager-stage ${managerVisible ? (managerOpening ? "manager-expanding" : "") : view === "landing" ? "manager-landing-preview" : "manager-preloaded"} ${leaving && managerVisible ? "manager-leaving" : ""}`} inert={!managerVisible || leaving} aria-hidden={!managerVisible}>
    <div className="manager-dashboard" inert={locked || !managerVisible} aria-hidden={locked || !managerVisible}>
      <DashboardPage onBack={() => navigate("landing", "left")} />
    </div>
    {locked && <div className={`manager-login-overlay ${managerUnlocking ? "manager-unlocking" : ""}`} inert={managerUnlocking} aria-hidden={managerUnlocking}>
      <LoginPage onBack={() => navigate("landing", "left")} onLogin={() => navigate("dashboard", "right")} />
    </div>}
  </div>;

  return (
    <>{managerScene}<div className={`${motionClass} citizen-stage ${managerVisible && !managerOpening ? "citizen-behind-manager" : ""}`} key="citizen" inert={leaving || managerVisible} aria-hidden={managerVisible}><main inert={view === "landing"} aria-hidden={view === "landing"} className={`glass-app ${view === "landing" ? "citizen-preloaded" : ""} finder-page ${activeTab !== "find" ? "map-info-page" : ""}`}>
      <div className="glass-background" />

      <header className="glass-header">
        <button type="button" className="brand landing-home-button" onClick={() => navigate("landing", "right")} aria-label={t("Return to home")}>
          <div className="glass-logo">
            G.<span className="logo-l">L</span>.A.S.S
          </div>
          <span className="brand-tagline">{t("GLASS RECYCLING NEAR YOU")}</span>
        </button>

        <Navigation activeTab={activeTab} onChange={setActiveTab} />
        <HeaderControls onOpenLogin={() => navigate("login", "right")} />
      </header>

      {activeTab !== "find" && <InfoPage section={activeTab} onFind={() => setActiveTab("find")} />}
      <div className={`glass-layout ${panelCollapsed ? "panel-collapsed" : ""}`} inert={activeTab !== "find"} aria-hidden={activeTab !== "find"}>
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

        <aside id="container-search-panel" className="glass-sidebar" inert={panelCollapsed || activeTab !== "find"} aria-hidden={panelCollapsed || activeTab !== "find"}>
          <div className="sidebar-intro">
              <h1>
                <span>{t("Find a glass")}</span>
                <span>{t("container")}</span>
              </h1>
              <p>{t("Check the current fill level of glass recycling containers in your area.")}</p>
            </div>

          <div className="sidebar-scroll">
            <SearchBar onSearch={searchPostcode} onLocation={searchLocation} />
            {location && <p className="search-results-note" role="status">{query ? (/^\d{5}$/.test(query) ? t("Closest to {{postcode}} · approximate postcode reference point", {postcode: query}) : t("Closest to {{address}}", {address: query})) : t("Closest to your location")}{t(". Distances are straight-line estimates.")}</p>}
            <NearbyBins
              total={filtered.length}
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
            showDetails={false}
            bins={filtered}
            selected={visibleSelected}
            onSelect={setSelected}
            color={color}
            location={location}
          />
        </section>
      </div>
    </main>
    {(view === "landing" || mapOpening || managerOpening) && <div className={`landing-layer landing-live-dashboard ${mapOpening ? "landing-layer-leaving" : ""} ${managerOpening ? "landing-manager-opening" : ""}`} inert={mapOpening || managerOpening} aria-hidden={mapOpening || managerOpening}>
      <LandingPage onCitizen={() => navigate("home", "left")} onManager={() => navigate("login", "right")}/>
    </div>}
    </div></>
  );
}

export default App;

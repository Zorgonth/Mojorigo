import { useEffect, useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import "./App.css";
import "./liquid-theme.css";
import DashboardPage from "./components/DashboardPage";
import GlassFilters from "./components/GlassFilters";
import GlassBinsMap from "./components/GlassBinsMap";
import HeaderControls from "./components/HeaderControls";
import LoginPage from "./components/LoginPage";
import Navigation from "./components/Navigation";
import NearbyBins from "./components/NearbyBins";
import SearchBar from "./components/SearchBar";
import { demoBins, type GlassBin, type GlassColor } from "./components/bin-data";

function App() {
  const [view, setView] = useState<"home" | "login" | "dashboard">("home");
  const [bins, setBins] = useState<GlassBin[]>(demoBins);
  const [demo, setDemo] = useState(true);
  const [color, setColor] = useState<GlassColor>("All");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selected, setSelected] = useState<string | null>(demoBins[0]?.id ?? null);
  const [location, setLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("http://localhost:3001/api/osm-bins/map", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Map failed to load");
        return response.json();
      })
      .then((result) => {
        const valid = (result.data ?? []).filter(
          (bin: GlassBin & { glassType?: string }) =>
            Number.isFinite(Number(bin.latitude)) && Number.isFinite(Number(bin.longitude)),
        );

        if (valid.length) {
          setBins(
            valid.map((bin: GlassBin & { glassType?: string }, index: number) => ({
              ...bin,
              latitude: Number(bin.latitude),
              longitude: Number(bin.longitude),
              fillPercent: Number(bin.fillPercent) || 0,
              color: /brown|braun/i.test(bin.glassType ?? "")
                ? "Brown"
                : /white|weiß|weiss/i.test(bin.glassType ?? "")
                  ? "White"
                  : "Green",
              distance: bin.distance ?? (index + 1) * 120,
            })),
          );
          setDemo(false);
          setSelected(valid[0]?.id ?? null);
        }
      })
      .catch(() => {
        // Keep the demo dataset if the backend is unavailable.
      });

    return () => controller.abort();
  }, []);

  const filtered = bins.filter(
    (bin) =>
      (color === "All" || bin.color === color) &&
      (!query || `${bin.name} ${bin.address}`.toLowerCase().includes(query.toLowerCase())),
  );

  if (view === "login") {
    return <LoginPage onBack={() => setView("home")} onLogin={() => setView("dashboard")} />;
  }

  if (view === "dashboard") {
    return <DashboardPage onBack={() => setView("home")} />;
  }

  return (
    <main className="glass-app">
      <div className="glass-background" />

      <header className="glass-header">
        <div className="brand">
          <div className="glass-logo">
            G.<span className="logo-l">L</span>.A.S.S
          </div>
          <span className="brand-tagline">GLASS RECYCLING NEAR YOU</span>
        </div>

        <Navigation />
        <HeaderControls onOpenLogin={() => setView("login")} />
      </header>

      <div className={`glass-layout ${panelCollapsed ? "panel-collapsed" : ""}`}>
        <button
          type="button"
          className="panel-toggle"
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          aria-expanded={!panelCollapsed}
          aria-controls="container-search-panel"
          aria-label={panelCollapsed ? "Show container search" : "Collapse search to view full map"}
        >
          {panelCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          <span>{panelCollapsed ? "Find a container" : "Full map"}</span>
          <ChevronDown size={15} className={panelCollapsed ? "toggle-flipped" : ""} />
        </button>

        <aside id="container-search-panel" className="glass-sidebar" hidden={panelCollapsed}>
          <div className="sidebar-scroll">
            <div className="sidebar-intro">
              <h1>
                Find a glass
                <br />
                container
              </h1>
              <p>Check the current fill level of glass recycling containers in your area.</p>
            </div>

            <SearchBar onSearch={setQuery} onLocation={setLocation} />
            <GlassFilters selected={color} onChange={setColor} />
            <NearbyBins
              bins={expanded ? filtered : filtered.slice(0, 5)}
              selected={selected}
              onSelect={setSelected}
            />

            {filtered.length > 5 && (
              <button className="view-more" onClick={() => setExpanded(!expanded)}>
                {expanded ? "View fewer bins" : "View more bins"}
                <ChevronDown
                  size={17}
                  style={{ transform: expanded ? "rotate(180deg)" : undefined }}
                />
              </button>
            )}

            <p className="preview-note">
              {demo
                ? "Design preview · Sample bin locations and fill levels"
                : "Glass collection points in Heilbronn"}
            </p>
          </div>
        </aside>

        <section className="glass-map" aria-label="Map of glass collection points">
          <GlassBinsMap
            glassType={color === "All" ? "all" : (color.toLowerCase() as "brown" | "white" | "green")}
            searchTerm={query}
            location={location}
          />
        </section>
      </div>
    </main>
  );
}

export default App;

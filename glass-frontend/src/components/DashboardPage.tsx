import RoutePreviewMap from "./RoutePreviewMap";
import AnalyticsImpact from "./AnalyticsImpact";
import { zoneInsights } from "./zone-insights";
import { collectionGroups, routeTotals, googleRouteLinks, type CollectionRoutes } from "./collection-routes";
import { dashboardMetrics, metricLocations, type CollectionEvent } from "./dashboard-metrics";
import { parseMapResponse, locationTitle, binFill, type GlassBin } from "./bin-data";
import SensorLevels from "./SensorLevels";
import ContainerStatusTable from "./ContainerStatusTable";
import LanguageSelect from "./LanguageSelect";
import { useTranslation } from "react-i18next";
import { locale, locationLabel, t } from "../i18n";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Grid2x2,
  Map as MapIcon,
  MapPinned,
  Menu,
  Route,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";
import GlassBinsMap from "./GlassBinsMap";

interface DashboardPageProps {
  onBack: () => void;
}

type DashboardData = {
  totals: {
    bins: number;
    areas: number;
    glassTypes: number;
    readings: number;
    collections: number;
  };
  avgFillPercent: number;
  avgTemperatureC: number;
  avgHumidityPercent: number;
  emptyingAlerts: Array<{
    binId: string;
    name: string;
    areaName: string;
    address: string;
    fillPercent: number;
    temperatureC: number;
    humidityPercent: number;
    status: string;
    urgencyMessage?: string;
    lastReadingAt?: string;
  }>;
  busiestAreas: Array<{
    areaName: string;
    binsNeedingEmptying: number;
    binCount: number;
    avgFillPercent: number;
    collectionCount: number;
  }>;
  glassTypeUsage: Array<{
    nameEn: string;
    nameDe: string;
    binCount: number;
    avgFillPercent: number;
  }>;
};

const chipFilters = [
  { key: "all", label: "All" },
  { key: "brown", label: "Brown" },
  { key: "white", label: "White" },
  { key: "green", label: "Green" },
] as const;

const fallbackDashboardData: DashboardData = {
  totals: {
    bins: 95,
    areas: 5,
    glassTypes: 3,
    readings: 580,
    collections: 26,
  },
  avgFillPercent: 48,
  avgTemperatureC: 18,
  avgHumidityPercent: 41,
  emptyingAlerts: [
    {
      binId: "HB-1027",
      name: "Böckingen Bin 03",
      areaName: "Böckingen",
      address: "Leintalstraße 28, 74080 Heilbronn",
      fillPercent: 92,
      temperatureC: 18,
      humidityPercent: 38,
      status: "critical",
      urgencyMessage: "Needs pickup within 24 hours",
      lastReadingAt: "2025-04-15T10:12:00Z",
    },
    {
      binId: "HB-1184",
      name: "Kirchhausen Bin 07",
      areaName: "Kirchhausen",
      address: "Ortsmitte 12, 74080 Heilbronn",
      fillPercent: 78,
      temperatureC: 19,
      humidityPercent: 42,
      status: "needs_emptying",
      urgencyMessage: "High utilization trend",
      lastReadingAt: "2025-04-15T09:50:00Z",
    },
  ],
  busiestAreas: [
    { areaName: "Heilbronn (Kernstadt)", binsNeedingEmptying: 8, binCount: 12, avgFillPercent: 67, collectionCount: 18 },
    { areaName: "Böckingen", binsNeedingEmptying: 5, binCount: 9, avgFillPercent: 62, collectionCount: 14 },
    { areaName: "Kirchhausen", binsNeedingEmptying: 4, binCount: 7, avgFillPercent: 59, collectionCount: 11 },
  ],
  glassTypeUsage: [
    { nameEn: "Brown glass", nameDe: "Braunglas", binCount: 56, avgFillPercent: 49 },
    { nameEn: "White glass", nameDe: "Weißglas", binCount: 52, avgFillPercent: 46 },
    { nameEn: "Green glass", nameDe: "Grünglas", binCount: 48, avgFillPercent: 51 },
  ],
};

function DashboardPage({ onBack }: DashboardPageProps) {
  const { t: translate } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [locations, setLocations] = useState<GlassBin[] | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [collectionEvents, setCollectionEvents] = useState<CollectionEvent[] | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [reload, setReload] = useState(0);
  const [activeMetric, setActiveMetric] = useState<"all" | "pickup" | "fullness" | "collected" | "route">("all");
  const [loading, setLoading] = useState(true);
  const [selectedGlassType, setSelectedGlassType] = useState<(typeof chipFilters)[number]["key"]>("all");
  const [hotspotGlassType, setHotspotGlassType] = useState<(typeof chipFilters)[number]["key"]>("all");
  const [mapSearch, setMapSearch] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [routesExpanded, setRoutesExpanded] = useState(false);
  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);
  const [coldSpots, setColdSpots] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapExpandStyle, setMapExpandStyle] = useState<CSSProperties>({});
  const mapPanelRef = useRef<HTMLElement>(null);
  function openMap() {
    if (mapExpanded) return;
    setRoutesExpanded(false);
    setAnalyticsExpanded(false); setReportsOpen(false); setSettingsOpen(false);
    requestAnimationFrame(() => {
    const panel = mapPanelRef.current;
    if (!panel) return;
    const bounds = panel.getBoundingClientRect();
    const shell = panel.closest('.dashboard-shell');
    const sidebar = shell?.querySelector('.dashboard-sidebar')?.getBoundingClientRect();
    const header = shell?.querySelector('.dashboard-header')?.getBoundingClientRect();
    const left = window.innerWidth > 900 ? Math.max(20, (sidebar?.right ?? 210) + 16) : 12;
    const top = Math.max(16, (header?.bottom ?? 90) + 16);
    const width = Math.max(240, window.innerWidth - left - 20);
    const height = Math.max(220, window.innerHeight - top - 20);
    setMapExpandStyle({
      '--map-left': `${left}px`, '--map-top': `${top}px`,
      '--map-start-x': `${bounds.left - left}px`, '--map-start-y': `${bounds.top - top}px`,
      '--map-start-scale-x': bounds.width / width, '--map-start-scale-y': bounds.height / height,
    } as CSSProperties);
    setMapExpanded(true);
    });
  }
  useEffect(() => {
    if (!mapExpanded && !routesExpanded && !analyticsExpanded && !reportsOpen && !settingsOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMapExpanded(false); setRoutesExpanded(false); setAnalyticsExpanded(false); setReportsOpen(false); setSettingsOpen(false); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [mapExpanded, routesExpanded, analyticsExpanded, reportsOpen, settingsOpen]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const routeWaypointLimit = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 3 : 9;
  const [routeResult, setRouteResult] = useState<CollectionRoutes | null>(null);
  const [routeError, setRouteError] = useState("");
  const [isGeneratingRoutes, setIsGeneratingRoutes] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardData() {
      try {
        setLoading(true);
        const dashboardResponse = await fetch("/api/analytics/dashboard", { signal: controller.signal });
        if (!dashboardResponse.ok) throw new Error("Failed to load dashboard data");

        const dashboardJson = await dashboardResponse.json();

        setDashboardData(dashboardJson.data ?? fallbackDashboardData);
      } catch (error) {
        console.error("Dashboard data load failed", error);
        setDashboardData(fallbackDashboardData);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/osm-bins/map", {signal:controller.signal})
      .then(r=>{if(!r.ok)throw Error();return r.json();})
      .then(data=>{setLocations(parseMapResponse(data));setLocationError(false);})
      .catch(()=>{if(!controller.signal.aborted)setLocationError(true);});
    fetch("/api/osm-bins/collections", {signal:controller.signal})
      .then(r=>{if(!r.ok)throw Error();return r.json();})
      .then(data=>setCollectionEvents(data.data))
      .catch(()=>{if(!controller.signal.aborted)setCollectionEvents(null);});
    return ()=>controller.abort();
  }, [reload]);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const metrics = useMemo(()=>dashboardMetrics(locations ?? [], selectedGlassType, collectionEvents ?? [], clock), [locations, selectedGlassType, collectionEvents, clock]);
  const tableLocations = useMemo(()=>locations === null ? null : metricLocations(locations, selectedGlassType, activeMetric === "pickup" || activeMetric === "fullness" ? activeMetric : "all"), [locations,selectedGlassType,activeMetric]);
  const tableMetrics = useMemo(() => dashboardMetrics(tableLocations ?? [], selectedGlassType, [], clock), [tableLocations, selectedGlassType, clock]);
  function openMetric(metric: typeof activeMetric) {
    setActiveMetric(metric);
    setMapSearch("");
    requestAnimationFrame(()=>document.getElementById(metric === "route" ? "collection-route-panel" : metric === "collected" ? "collection-events-panel" : "container-status-panel")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"nearest"}));
  }

  const routeGroups = collectionGroups(routeResult);
  const routeSummary = routeTotals(routeGroups);
  function formatRouteDuration(raw?: string) {
    if (!raw || !/^\d+(?:\.\d+)?s$/.test(raw)) return t("Unavailable");
    const minutes = Math.ceil(Number(raw.slice(0,-1))/60);
    return minutes >= 60 ? t("{{hours}}h {{minutes}}m", {hours:Math.floor(minutes/60),minutes:minutes%60}) : t("{{minutes}} min",{minutes});
  }
  const ready = locations !== null && !locationError;
  const stats = [
    { key:"all" as const, label:"Total Smart Bins", value:ready ? String(metrics.total) : "—", delta:translate("{{count}} locations",{count:locations?.length ?? 0}), accent:"blue" },
    { key:"pickup" as const, label:"Needs Pickup", value:ready ? String(metrics.pickups) : "—", delta:translate("Compartments over 70% full"), accent:"red" },
    { key:"collected" as const, label:"Collected Today", value:collectionEvents ? String(metrics.collectionsToday.length) : "—", delta:translate("Location collections · Berlin time · all colours"), accent:"green" },
    { key:"route" as const, label:"Collection route", value:routeGroups.length ? translate(routeGroups.length === 1 ? "1 route generated" : "{{total}} routes generated", {total: routeGroups.length}) : translate("Not generated"), delta:routeGroups.length && routeSummary.distance !== null ? `${(routeSummary.distance / 1000).toLocaleString(locale(),{maximumFractionDigits:1})} km` : translate("View route planning"), accent:"teal" },
  ];

  const handleGenerateRoutes = async () => {
    setIsGeneratingRoutes(true);
    setRouteError("");
    setRouteResult(null);

    try {
      const response = await fetch("/api/osm-bins/collection-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: { latitude: 49.1427, longitude: 9.2109 },
          returnToOrigin: true,
          language: locale() === "de-DE" ? "de" : "en",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.failedGroup ? t("Could not calculate route group {{group}}. Check the routing service and try again.", {group:payload.failedGroup}) : payload?.error?.message ?? "Unable to generate the collection route.");
      }

      setRouteResult(payload);
    } catch (error) {
      setRouteResult(null);
      setRouteError(error instanceof Error ? error.message : "Unable to generate the route.");
    } finally {
      setIsGeneratingRoutes(false);
    }
  };

  const routeRows = routeGroups.map(group => ({
    name:t("Route {{group}}",{group:group.group}), group:group.group, stops:group.stops.length,
    est:formatRouteDuration(group.route.duration), traffic:"Traffic-aware",driver:"Unassigned",status:"Generated",
  }));

  const selectedBin = useMemo(() => {
    if (selectedLocation) return locations?.find(bin => bin.id === selectedLocation) ?? null;
    return tableLocations?.[0] ?? null;
  }, [locations, tableLocations, selectedLocation]);
  const selectedFill = selectedBin ? binFill(selectedBin, ({all: "All", brown: "Brown", white: "White", green: "Green"} as const)[selectedGlassType]) : null;

  const zones = useMemo(() => zoneInsights(locations ?? [], hotspotGlassType), [locations, hotspotGlassType]);
  const analyticsZones = useMemo(() => coldSpots
    ? [...zones].sort((a, b) => (a.average ?? Infinity) - (b.average ?? Infinity) || a.postcode.localeCompare(b.postcode))
    : zones, [zones, coldSpots]);

  if (loading || !dashboardData) {
    return (
      <main className={`glass-app dashboard-shell ${mapExpanded ? "dashboard-map-expanded" : ""} ${routesExpanded ? "dashboard-routes-expanded" : ""} ${analyticsExpanded ? "dashboard-analytics-expanded" : ""} ${reportsOpen ? "dashboard-reports-open" : ""} ${settingsOpen ? "dashboard-settings-open" : ""}`}>
        <div className="glass-background" />
        <div className="dashboard-loading">{t("Loading live dashboard data…")}</div>
      </main>
    );
  }

  return (
    <main className={`glass-app dashboard-shell ${mapExpanded ? "dashboard-map-expanded" : ""} ${routesExpanded ? "dashboard-routes-expanded" : ""} ${analyticsExpanded ? "dashboard-analytics-expanded" : ""} ${reportsOpen ? "dashboard-reports-open" : ""} ${settingsOpen ? "dashboard-settings-open" : ""}`}>
      <div className="glass-background" />

      <header className="dashboard-header">
        <div className="dashboard-brand-wrap">
          <button type="button" className="brand-button" onClick={onBack} aria-label={t("Return to home")}>
            <span className="brand-logo">G.<span className="logo-l">L</span>.A.S.S</span>
          </button>
          <div className="brand-subtitle">{t("Glass Logistics & Smart Sensing")}</div>
        </div>

        <div className="header-right">
          <LanguageSelect/>
          <div className="mini-widget">
            <span className="mini-label">Heilbronn</span>
            <span className="mini-time">{new Date().toLocaleString(locale(), {dateStyle: "medium", timeStyle: "short"})}</span>
          </div>
          <button type="button" className="header-bell" aria-label={t("Notifications")}>
            <Bell size={18} />
          </button>
          <div className="user-pill">
            <div className="user-avatar">
              <UserRound size={21} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <span>T. Maier</span>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <div className="nav-group">
            <button type="button" className={`nav-item ${!mapExpanded && !routesExpanded && !analyticsExpanded && !reportsOpen && !settingsOpen ? "active" : ""}`} onClick={() => {setMapExpanded(false); setRoutesExpanded(false); setAnalyticsExpanded(false); setReportsOpen(false); setSettingsOpen(false);}} aria-pressed={!mapExpanded && !routesExpanded && !analyticsExpanded && !reportsOpen && !settingsOpen}>
              <Grid2x2 size={18} />{t("Overview")}</button>
            <button type="button" className={`nav-item dashboard-map-nav ${mapExpanded ? "active" : ""}`} onClick={openMap} aria-pressed={mapExpanded} aria-controls="dashboard-map-panel">
              <MapIcon size={18} />{t("Map")}</button>
            <button type="button" className={`nav-item dashboard-routes-nav ${routesExpanded ? "active" : ""}`} onClick={() => {setMapExpanded(false); setRoutesExpanded(true); setAnalyticsExpanded(false); setReportsOpen(false); setSettingsOpen(false);}} aria-pressed={routesExpanded} aria-controls="collection-route-panel">
              <Route size={18} />{t("Routes")}</button>
            <button type="button" className={`nav-item ${analyticsExpanded ? "active" : ""}`} onClick={() => {setMapExpanded(false); setRoutesExpanded(false); setAnalyticsExpanded(true); setReportsOpen(false); setSettingsOpen(false);}} aria-pressed={analyticsExpanded} aria-controls="hotspots-panel">
              <Users size={18} />{t("Analytics")}</button>
            <button type="button" className={`nav-item ${reportsOpen ? "active" : ""}`} onClick={() => {setMapExpanded(false); setRoutesExpanded(false); setAnalyticsExpanded(false); setReportsOpen(true); setSettingsOpen(false);}} aria-pressed={reportsOpen} aria-controls="dashboard-reports">
              <ShieldCheck size={18} />{t("Reports")}</button>
            <button type="button" className={`nav-item ${settingsOpen ? "active" : ""}`} onClick={() => {setMapExpanded(false); setRoutesExpanded(false); setAnalyticsExpanded(false); setReportsOpen(false); setSettingsOpen(true);}} aria-pressed={settingsOpen} aria-controls="dashboard-settings">
              <Menu size={18} />{t("Settings")}</button>
          </div>
        </aside>

        <main className="dashboard-main">
          {settingsOpen && <section className="panel settings-panel" id="dashboard-settings" aria-labelledby="settings-title">
            <div className="panel-title-row"><h2 id="settings-title">{t("Settings")}</h2></div>
          </section>}
          {reportsOpen && <section className="panel reports-panel" id="dashboard-reports" aria-labelledby="reports-title">
            <div className="panel-title-row"><h2 id="reports-title">{t("Reports")}</h2></div>
            <div className="reports-empty"><ShieldCheck size={36} aria-hidden="true"/><p>{t("No reports received")}</p></div>
          </section>}
          <div className="section-header-row">
            <div>
              <h1>{t("Welcome back, here’s your quick overview.")}</h1>
              <p>{t("Glass Logistics & Smart Sensing")}</p>
            </div>
          </div>

          <div className="chip-toolbar">
            {chipFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`filter-chip dashboard-filter-${filter.key} ${selectedGlassType === filter.key ? "primary" : ""}`}
                onClick={() => setSelectedGlassType(filter.key)}
              >
                {t(filter.label)}
              </button>
            ))}
          </div>

          <div className="stats-grid">
            {stats.map((card) => (
              <button type="button" key={card.key} className={`stat-card ${card.accent} ${activeMetric === card.key ? "stat-selected" : ""}`} onClick={() => openMetric(card.key)} aria-pressed={activeMetric === card.key}>
                <div className="stat-icon">
                  {card.accent === "blue" && <Warehouse size={18} />}
                  {card.accent === "red" && <AlertTriangle size={18} />}
                  {card.accent === "green" && <Truck size={18} />}
                  {card.accent === "teal" && <Route size={18} />}
                </div>
                <div className="stat-copy">
                  <div className="stat-label">{t(card.label)}</div>
                  <div className="stat-value-row">
                    <strong>{card.value}</strong>
                    <span>{card.delta}</span>
                  </div>

                </div>
              </button>
            ))}
          </div>

          {activeMetric === "collected" && <section className="panel collection-events-panel" id="collection-events-panel" aria-label={t("Collected Today")}>
            <h2>{t("Collected Today")}</h2><p>{t("Location collections · Berlin time · all colours")}</p>
            {collectionEvents === null ? <p role="status">{t("Collection history unavailable")}</p> : !metrics.collectionsToday.length ? <p>{t("No collections recorded today")}</p> : <ul>{metrics.collectionsToday.map(event=><li key={event.id}><strong>{locationLabel(event.name)}</strong> · {new Date(event.collectedAt).toLocaleTimeString(locale(),{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"})}</li>)}</ul>}
          </section>}
          {(activeMetric === "pickup" || activeMetric === "fullness") && <p className="dashboard-metric-note" role="status">{t(activeMetric === "pickup" ? "Showing locations with compartments over 70% full" : "Locations sorted by highest reported fullness")}</p>}
          <div className="content-grid">
            <section className="panel table-panel" id="container-status-panel">
              <div className="panel-title-row">
                <h2>{t("Bin Status Overview")}</h2>
                <span className="table-average-fullness" title={t("{{count}} reported sensors", {count: tableMetrics.reported})}>
                  <span>{t("Avg. Fullness")}</span>
                  <strong>{ready && tableMetrics.average !== null ? `${tableMetrics.average.toLocaleString(locale(), {maximumFractionDigits: 1})}%` : "—"}</strong>
                </span>
              </div>
              <ContainerStatusTable bins={tableLocations} error={locationError} onRetry={() => setReload(reload + 1)} glassType={selectedGlassType} search={mapSearch} selected={selectedLocation} onSelect={setSelectedLocation}/>

            </section>

            <section className="panel selected-panel">
              <div className="panel-title-row">
                <h2>{t("Selected Bin Details")}</h2>
                <span className="mini-tag">{t("{{count}} of {{total}}", {count: selectedBin ? (locations?.findIndex(bin => bin.id === selectedBin.id) ?? -1) + 1 : 0, total: locations?.length ?? 0})}</span>
              </div>

              <div className="selected-bin-header">
                <div className="bin-id">{t("BIN ID")}{" "}<strong>{selectedBin?.id ?? t("N/A")}</strong></div>
                <span className="warning-pill"><AlertTriangle size={12} /> {t(selectedFill !== null && selectedFill > 70 ? "Needs pickup" : "Monitoring")}</span>
              </div>

              <div className="bin-meta">
                <span><span className="meta-label">{t("Location")}</span><strong>{selectedBin ? locationLabel(locationTitle(selectedBin)) : t("Unknown area")}</strong></span>
                <span><span className="meta-label">{t("Address")}</span><strong>{selectedBin ? [selectedBin.address || locationTitle(selectedBin), [selectedBin.postcode, selectedBin.city].filter(Boolean).join(" ")].filter(Boolean).join(" · ") : t("No address recorded")}</strong></span>
              </div>

              {selectedBin && <SensorLevels bin={selectedBin} color={({all: "All", brown: "Brown", white: "White", green: "Green"} as const)[selectedGlassType]}/>}

            </section>

            <section id="dashboard-map-panel" ref={mapPanelRef} className="panel map-panel" style={mapExpandStyle}>
              <div className="map-header">
                <button type="button" className="map-tab active" onClick={() => mapExpanded ? setMapExpanded(false) : openMap()}>{mapExpanded ? t("Back to overview") : t("Map")}</button>
                <label className="map-search" aria-label={t("Search bins, areas or addresses")}>
                  <Search size={15} />
                  <input
                    type="text"
                    value={mapSearch}
                    onChange={(event) => setMapSearch(event.target.value)}
                    placeholder={t("Search bins, areas or addresses...")}
                  />
                </label>
                <button type="button" className="map-button" aria-label={t("Open filters")}>
                  <MapPinned size={15} />
                </button>
              </div>

              <div className="map-canvas dashboard-map-canvas">
                <GlassBinsMap showPopup={false} animate={false} bins={tableLocations?.filter(bin => !mapSearch.trim() || `${bin.name} ${bin.address} ${bin.area} ${bin.city} ${bin.postcode} ${bin.id}`.toLowerCase().includes(mapSearch.trim().toLowerCase())) ?? []} glassType={selectedGlassType} searchTerm={mapSearch} selected={selectedLocation} onSelect={setSelectedLocation} />
              </div>
            </section>
          </div>

          <div className="bottom-grid">
            <section className="panel route-panel" id="collection-route-panel">
              <div className="panel-title-row">
                <h2>{t("Generated Routes")}</h2>
                {routesExpanded && <button type="button" className="route-overview-button" onClick={() => setRoutesExpanded(false)}>{t("Back to overview")}</button>}
                <button type="button" className="generate-route-button" onClick={() => {
                  if (routesExpanded) void handleGenerateRoutes();
                  else { setMapExpanded(false); setAnalyticsExpanded(false); setReportsOpen(false); setSettingsOpen(false); setRoutesExpanded(true); }
                }} disabled={isGeneratingRoutes}>
                  {isGeneratingRoutes ? t("Generating...") : t("Generate routes")}
                  <ArrowRight size={14} />
                </button>
              </div>

                  {routesExpanded && routeGroups.length > 0 && <div className="generated-route-metrics">
                    <span><span>{t("Total distance")}</span><strong>{routeSummary.distance === null ? "—" : `${(routeSummary.distance / 1000).toLocaleString(locale(), {maximumFractionDigits: 1})} km`}</strong></span>
                    <span><span>{t("Average distance")}</span><strong>{routeSummary.distance === null ? "—" : `${(routeSummary.distance / routeGroups.length / 1000).toLocaleString(locale(), {maximumFractionDigits: 1})} km`}</strong></span>
                    <span><span>{t("Total travel time")}</span><strong>{formatRouteDuration(routeSummary.seconds === null ? undefined : `${routeSummary.seconds}s`)}</strong></span>
                    <span><span>{t("Average travel time")}</span><strong>{formatRouteDuration(routeSummary.seconds === null ? undefined : `${routeSummary.seconds / routeGroups.length}s`)}</strong></span>
                  </div>}

              {routeError && <div className="route-message error">{t(routeError)}</div>}
              {routeGroups.length > 0 && <div className="route-message success" role="status">
                {t("{{groups}} routes · {{stops}} collection stops", {groups:routeGroups.length,stops:routeSummary.stops})}
                {" · "}{routeSummary.distance === null ? t("Distance unavailable") : `${(routeSummary.distance/1000).toLocaleString(locale(),{maximumFractionDigits:1})} km`}
                {" · "}{formatRouteDuration(routeSummary.seconds === null ? undefined : `${routeSummary.seconds}s`)}
                <p>{t("Each group is optimized separately and returns to the depot. Totals combine all routes; travel time excludes collection work.")}</p>
              </div>}

              {routeResult?.message && <p className="route-message" role="status">{t(routeResult.message)}</p>}
              {!routeResult && !routeError && !isGeneratingRoutes && <p className="route-message">{t("Generate a collection route for locations with a compartment over 70% full.")}</p>}
              {routeRows.length > 0 && <div className="route-table">
                <div className="route-row head">
                  <span>{t("Route")}</span>
                  <span>{t("Stops")}</span>
                  <span>{t("Est. Time")}</span>
                  <span>{t("Traffic")}</span>
                  <span>{t("Driver")}</span>
                  <span>{t("Status")}</span>
                </div>
                {routeRows.map((row) => (
                  <div key={row.name} className="route-row">
                    <span className="route-name"><i className="route-dot" />{t(row.name)}</span>
                    <span>{row.stops}</span>
                    <span>{row.est}</span>
                    <span>{t(row.traffic)}</span>
                    <span>{t(row.driver)}</span>
                    <span className="route-status">{t(row.status)}</span>
                  </div>
                ))}
              </div>}
              {routeGroups.map(group => <details className="route-group-details" key={group.group} open={routeGroups.length === 1}>
                <summary>{t("Route {{group}}",{group:group.group})} · {t("{{count}} stops",{count:group.stops.length})} · {formatRouteDuration(group.route.duration)}</summary>
                <div className="route-detail-layout">
                <RoutePreviewMap group={group}/>
                <div className="route-detail-copy">
                <div className="chained-route-links">
                  {googleRouteLinks(group.stops, [49.1427, 9.2109], routeWaypointLimit).map((url, index, links) => <a key={url} href={url} target="_blank" rel="noreferrer">
                    {links.length === 1 ? t("Open route in Google Maps ↗") : t("Google Maps · Part {{part}} of {{total}} ↗", {part: index + 1, total: links.length})}
                  </a>)}
                  {googleRouteLinks(group.stops, [49.1427, 9.2109], routeWaypointLimit).length > 1 && <p>{t("Follow the numbered parts in order. Each starts where the previous part ends; the final part returns to the depot.")}</p>}
                  {group.stops.length > 0 && !googleRouteLinks(group.stops, [49.1427, 9.2109], routeWaypointLimit).length && <p>{t("Route links unavailable: a stop is missing its coordinates and address.")}</p>}
                </div>
                <ol className="collection-stops" aria-label={t("Collection stop order")}>
                  {group.stops.map((stop,index)=><li key={stop.id ?? index}>
                    <strong>{locationLabel(stop.name || stop.address || "Collection location")}</strong>
                    {stop.address && stop.address!==stop.name && <span>{locationLabel(stop.address)}</span>}

                  </li>)}
                </ol>
                </div>
                </div>
              </details>)}

            </section>



            <section className="panel insight-panel" id="hotspots-panel">
              <div className="panel-title-row">
                <h2 id={analyticsExpanded ? "analytics-heading" : "hotspots-heading"}>{t(analyticsExpanded ? "Analytics" : "Hotspots & Planning Insights")}</h2>
                <button type="button" className="analytics-view-button" onClick={() => setAnalyticsExpanded(value => !value)}>{analyticsExpanded ? t("Back to overview") : t("View all zones")}</button>
              </div>

              <div className={analyticsExpanded ? "analytics-columns" : undefined}>
              {analyticsExpanded && <AnalyticsImpact/>}
              <div className="analytics-hotspots">
              {analyticsExpanded && <h3 id="hotspots-heading" className="analytics-hotspots-heading">{t("Hotspots & Planning Insights")}</h3>}
              {analyticsExpanded && <div className="zone-ranking-toggle" role="group" aria-label={t("Zone ranking")}>
                <button type="button" aria-pressed={!coldSpots} onClick={() => setColdSpots(false)}>{t("Hotspots")}</button>
                <button type="button" aria-pressed={coldSpots} onClick={() => setColdSpots(true)}>{t("Cold spots")}</button>
              </div>}
              <div className="hotspot-colour-filters" role="group" aria-labelledby="hotspots-heading">
                {chipFilters.map(filter => <button key={filter.key} type="button"
                  className={`filter-chip hotspot-filter-${filter.key} ${hotspotGlassType === filter.key ? "primary" : ""}`}
                  aria-pressed={hotspotGlassType === filter.key}
                  onClick={() => setHotspotGlassType(filter.key)}>
                  {t(filter.key === "all" ? "All" : filter.label)}
                </button>)}
              </div>
              <p className="zone-insights-note">{t("Postcode zones ranked by current average fullness. This snapshot does not measure how quickly containers fill.")}</p>
              <div className="insight-list">
                {(analyticsExpanded ? analyticsZones : zones.slice(0, 3)).map(zone => {
                  const tone = zone.average === null ? "unknown" : zone.average >= 75 ? "hot" : zone.average <= 35 ? "cold" : "moderate";
                  return <article key={zone.postcode} className={`insight-item zone-insight zone-${tone}`}>
                    <div className="insight-title-row">
                      <h3>{zone.postcode} · Heilbronn</h3>
                      <span className="insight-badge">{t(tone === "hot" ? "Hot zone" : tone === "cold" ? "Cold zone" : tone === "unknown" ? "No reading" : "Moderate fullness")}</span>
                    </div>
                    <div className="zone-average"><strong>{zone.average === null ? "—" : `${zone.average.toLocaleString(locale(), {maximumFractionDigits: 1})}%`}</strong><span>{t("Avg. Fullness")}</span></div>
                    {zone.average !== null && <div className="zone-fullness-track" aria-hidden="true"><span style={{width: `${zone.average}%`}}/></div>}
                    <p>{t("{{locations}} locations · {{reported}} sensor readings · {{pickups}} compartments need pickup", {locations: zone.locations, reported: zone.reported, pickups: zone.pickups})}</p>
                    <p>{t(tone === "hot" ? "Prioritise this zone for collection planning." : tone === "cold" ? "Lower current demand; check again before scheduling collection." : tone === "unknown" ? "Awaiting sensor update" : "Monitor this zone as containers approach capacity.")}</p>
                  </article>;
                })}
                {!zones.length && <p>{t(locationError ? "Could not load container locations" : "No zone readings available.")}</p>}
              </div>
              </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </main>
  );
}

export default DashboardPage;

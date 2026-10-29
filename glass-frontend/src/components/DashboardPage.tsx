import { collectionGroups, routeTotals, type CollectionRoutes } from "./collection-routes";
import { dashboardMetrics, metricLocations, type CollectionEvent } from "./dashboard-metrics";
import { parseMapResponse, type GlassBin } from "./bin-data";
import ContainerStatusTable from "./ContainerStatusTable";
import LanguageSelect from "./LanguageSelect";
import { useTranslation } from "react-i18next";
import { locale, locationLabel, urgencyLabel, t } from "../i18n";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Grid2x2,
  Map as MapIcon,
  MapPinned,
  Menu,
  Percent,
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

type MapPoint = {
  binId: string;
  name: string;
  areaName: string;
  areaId?: string;
  glassType?: string;
  fillPercent: number;
  needsEmptying: boolean;
  status: string;
  urgencyMessage?: string;
  temperatureC?: number;
  humidityPercent?: number;
  lastCollectedAt?: string;
  address?: string;
};

const chipFilters = [
  { key: "all", label: "All bottles" },
  { key: "brown", label: "Brown" },
  { key: "white", label: "White" },
  { key: "green", label: "Green" },
] as const;

const matchesGlassType = (glassType: string | undefined, filter: (typeof chipFilters)[number]["key"]) => {
  const normalized = (glassType ?? "").toLowerCase();

  if (filter === "all") return true;
  if (filter === "green") return normalized === "green" || normalized === "blue";

  return normalized === filter;
};

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

const fallbackMapPoints: MapPoint[] = [
  { binId: "HB-1027", name: "Böckingen Bin 03", areaName: "Böckingen", fillPercent: 92, needsEmptying: true, status: "critical", urgencyMessage: "Needs pickup within 24 hours", temperatureC: 18, humidityPercent: 38, address: "Leintalstraße 28, 74080 Heilbronn" },
  { binId: "HB-1041", name: "Heilbronn Central", areaName: "Heilbronn (Kernstadt)", fillPercent: 68, needsEmptying: true, status: "needs_emptying", urgencyMessage: "Monitor pickup timing", temperatureC: 19, humidityPercent: 41, address: "Kaiserstraße 12, 74072 Heilbronn" },
  { binId: "HB-1184", name: "Kirchhausen Bin 07", areaName: "Kirchhausen", fillPercent: 78, needsEmptying: true, status: "needs_emptying", urgencyMessage: "High utilization trend", temperatureC: 19, humidityPercent: 42, address: "Ortsmitte 12, 74080 Heilbronn" },
  { binId: "HB-2104", name: "Sontheim South", areaName: "Sontheim", fillPercent: 42, needsEmptying: false, status: "ok", urgencyMessage: "Operating normally", temperatureC: 17, humidityPercent: 39, address: "Sontheimer Straße 56, 74072 Heilbronn" },
];

function DashboardPage({ onBack }: DashboardPageProps) {
  const { t: translate } = useTranslation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [locations, setLocations] = useState<GlassBin[] | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [collectionEvents, setCollectionEvents] = useState<CollectionEvent[] | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [reload, setReload] = useState(0);
  const [activeMetric, setActiveMetric] = useState<"all" | "pickup" | "fullness" | "collected" | "route">("all");
  const [loading, setLoading] = useState(true);
  const [selectedGlassType, setSelectedGlassType] = useState<(typeof chipFilters)[number]["key"]>("all");
  const [mapSearch, setMapSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<CollectionRoutes | null>(null);
  const [routeError, setRouteError] = useState("");
  const [isGeneratingRoutes, setIsGeneratingRoutes] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardData() {
      try {
        setLoading(true);
        const [dashboardResponse, mapResponse] = await Promise.all([
          fetch("/api/analytics/dashboard", { signal: controller.signal }),
          fetch("/api/analytics/map", { signal: controller.signal }),
        ]);

        if (!dashboardResponse.ok || !mapResponse.ok) {
          throw new Error("Failed to load dashboard data");
        }

        const dashboardJson = await dashboardResponse.json();
        const mapJson = await mapResponse.json();

        setDashboardData(dashboardJson.data ?? fallbackDashboardData);
        setMapPoints(mapJson.data ?? fallbackMapPoints);
      } catch (error) {
        console.error("Dashboard data load failed", error);
        setDashboardData(fallbackDashboardData);
        setMapPoints(fallbackMapPoints);
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
  function openMetric(metric: typeof activeMetric) {
    setActiveMetric(metric);
    setMapSearch("");
    requestAnimationFrame(()=>document.getElementById(metric === "route" ? "collection-route-panel" : metric === "collected" ? "collection-events-panel" : "container-status-panel")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",block:"nearest"}));
  }

  const filteredMapPoints = useMemo(() => {
    return mapPoints.filter((point) => matchesGlassType(point.glassType, selectedGlassType));
  }, [mapPoints, selectedGlassType]);

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
    { key:"fullness" as const, label:"Avg. Fullness", value:ready && metrics.average !== null ? `${metrics.average.toLocaleString(locale(),{maximumFractionDigits:1})}%` : "—", delta:translate("{{count}} reported sensors",{count:metrics.reported}), accent:"amber" },
    { key:"collected" as const, label:"Collected Today", value:collectionEvents ? String(metrics.collectionsToday.length) : "—", delta:translate("Location collections · Berlin time · all colours"), accent:"green" },
    { key:"route" as const, label:"Collection route", value:routeGroups.length ? translate("Generated") : translate("Not generated"), delta:routeGroups.length && routeSummary.distance !== null ? `${(routeSummary.distance / 1000).toLocaleString(locale(),{maximumFractionDigits:1})} km` : translate("View route planning"), accent:"teal" },
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
    const sourceBins = filteredMapPoints.length > 0 ? filteredMapPoints : mapPoints;
    const alertBin = sourceBins.find((point) => point.needsEmptying) ?? sourceBins[0];

    if (!alertBin) {
      return null;
    }

    return {
      binId: alertBin.binId,
      name: alertBin.name,
      areaName: alertBin.areaName,
      address: alertBin.address ?? "No address recorded",
      fillPercent: alertBin.fillPercent,
      temperatureC: alertBin.temperatureC ?? 0,
      humidityPercent: alertBin.humidityPercent ?? 0,
      urgencyMessage: alertBin.urgencyMessage ?? (alertBin.needsEmptying ? "Needs pickup" : "Monitoring"),
    };
  }, [filteredMapPoints, mapPoints]);

  const insightCards = useMemo(() => {
    const sourceInsights = selectedGlassType === "all"
      ? dashboardData?.emptyingAlerts ?? []
      : dashboardData?.emptyingAlerts.filter((alert) => {
          const typeName = `${alert.name} ${alert.address}`.toLowerCase();
          if (selectedGlassType === "green") return typeName.includes("blue") || typeName.includes("green");
          return typeName.includes(selectedGlassType);
        }) ?? [];

    if (!sourceInsights.length) {
      return [
        {
          title: selectedGlassType === "all" ? translate("System healthy") : translate("{{colour}} collection steady", {colour: translate(selectedGlassType.charAt(0).toUpperCase() + selectedGlassType.slice(1))}),
          text: "No active emptying alerts. Current collection workload remains within the configured thresholds for the chosen glass stream.",
          tag: "Stable",
        },
      ];
    }

    return sourceInsights.slice(0, 3).map((alert) => ({
      title: `${alert.areaName} · ${alert.name}`,
      text: alert.urgencyMessage || translate("{{name}} is currently at {{fill}}% fullness and requires attention.", {name: alert.name, fill: alert.fillPercent}),
      tag: alert.status === "critical" ? translate("Critical") : translate("Needs pickup"),
    }));
  }, [dashboardData, selectedGlassType, translate]);

  if (loading || !dashboardData) {
    return (
      <main className="glass-app dashboard-shell">
        <div className="glass-background" />
        <div className="dashboard-loading">{t("Loading live dashboard data…")}</div>
      </main>
    );
  }

  return (
    <main className="glass-app dashboard-shell">
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
            <button type="button" className="nav-item active">
              <Grid2x2 size={18} />{t("Overview")}</button>
            <button type="button" className="nav-item">
              <MapIcon size={18} />{t("Map")}</button>
            <button type="button" className="nav-item">
              <Warehouse size={18} />{t("Bins")}</button>
            <button type="button" className="nav-item">
              <Route size={18} />{t("Routes")}</button>
            <button type="button" className="nav-item">
              <Users size={18} />{t("Analytics")}</button>
            <button type="button" className="nav-item">
              <ShieldCheck size={18} />{t("Reports")}</button>
            <button type="button" className="nav-item">
              <Menu size={18} />{t("Settings")}</button>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="section-header-row">
            <div>
              <h1>{t("Hack the Bin – Smart glass collection dashboard")}</h1>
              <p>{t("Glass Logistics & Smart Sensing")}</p>
            </div>
          </div>

          <div className="chip-toolbar">
            {chipFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={selectedGlassType === filter.key ? "filter-chip primary" : "filter-chip"}
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
                  {card.accent === "amber" && <Percent size={18} />}
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
              </div>
              <ContainerStatusTable bins={tableLocations} error={locationError} onRetry={() => setReload(reload + 1)} glassType={selectedGlassType} search={mapSearch} selected={selectedLocation} onSelect={setSelectedLocation}/>

            </section>

            <section className="panel map-panel">
              <div className="map-header">
                <button type="button" className="map-tab active">{t("Map")}</button>
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
                <GlassBinsMap animate={false} bins={tableLocations?.filter(bin => !mapSearch.trim() || `${bin.name} ${bin.address} ${bin.area} ${bin.city} ${bin.postcode} ${bin.id}`.toLowerCase().includes(mapSearch.trim().toLowerCase())) ?? []} glassType={selectedGlassType} searchTerm={mapSearch} selected={selectedLocation} onSelect={setSelectedLocation} />
              </div>
            </section>
          </div>

          <div className="bottom-grid">
            <section className="panel route-panel" id="collection-route-panel">
              <div className="panel-title-row">
                <h2>{t("Generated Routes")}</h2>
                <button type="button" className="generate-route-button" onClick={handleGenerateRoutes} disabled={isGeneratingRoutes}>
                  {isGeneratingRoutes ? t("Generating...") : t("Generate routes")}
                  <ArrowRight size={14} />
                </button>
              </div>

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
                <ol className="collection-stops" aria-label={t("Collection stop order")}>
                  {group.stops.map((stop,index)=><li key={stop.id ?? index}>
                    <strong>{locationLabel(stop.name || stop.address || "Collection location")}</strong>
                    {stop.address && stop.address!==stop.name && <span>{locationLabel(stop.address)}</span>}
                    {stop.latitude!==undefined && stop.longitude!==undefined && <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`} target="_blank" rel="noreferrer">{t("Directions ↗")}</a>}
                  </li>)}
                </ol>
              </details>)}

            </section>

            <section className="panel selected-panel">
              <div className="panel-title-row">
                <h2>{t("Selected Bin Details")}</h2>
                <span className="mini-tag">{t("{{count}} of {{total}}", {count: 1, total: dashboardData.totals.bins})}</span>
              </div>

              <div className="selected-bin-header">
                <div className="bin-id">{t("BIN ID")}{" "}<strong>{selectedBin?.binId ?? t("N/A")}</strong></div>
                <span className="warning-pill"><AlertTriangle size={12} /> {urgencyLabel(selectedBin?.urgencyMessage ?? "Monitoring")}</span>
              </div>

              <div className="bin-meta">
                <span><span className="meta-label">{t("Location")}</span><strong>{t(selectedBin?.areaName ?? "Unknown area")}</strong></span>
                <span><span className="meta-label">{t("Address")}</span><strong>{locationLabel(selectedBin?.address ?? "No address recorded")}</strong></span>
              </div>

              <div className="meter-grid">
                <div className="meter-box">
                  <span>{t("Fullness")}</span>
                  <strong>{selectedBin?.fillPercent ?? 0}%</strong>
                </div>
                <div className="meter-box">
                  <span>{t("Humidity")}</span>
                  <strong>{selectedBin?.humidityPercent ?? 0}%</strong>
                </div>
                <div className="meter-box">
                  <span>{t("Temperature")}</span>
                  <strong>{selectedBin?.temperatureC ?? 0}{t("°C")}</strong>
                </div>
                <div className="meter-box">
                  <span>{t("Traffic nearby")}</span>
                  <strong>{selectedBin?.fillPercent && selectedBin.fillPercent > 70 ? t("Heavy") : selectedBin?.fillPercent && selectedBin.fillPercent > 45 ? t("Moderate") : t("Light")}</strong>
                </div>
              </div>
            </section>

            <section className="panel insight-panel">
              <div className="panel-title-row">
                <h2>{t("Hotspots & Planning Insights")}</h2>
              </div>

              <div className="insight-list">
                {insightCards.map((item) => (
                  <article key={t(item.title)} className="insight-item">
                    <div className="insight-title-row">
                      <h3>{t(item.title)}</h3>
                      <span className="insight-badge">{t(item.tag)}</span>
                    </div>
                    <p>{urgencyLabel(item.text)}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </main>
  );
}

export default DashboardPage;

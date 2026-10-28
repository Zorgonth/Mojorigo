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
  User,
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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGlassType, setSelectedGlassType] = useState<(typeof chipFilters)[number]["key"]>("all");
  const [mapSearch, setMapSearch] = useState("");
  const [routeResult, setRouteResult] = useState<{
    count?: number;
    route?: { duration?: string; distanceMeters?: number };
    stops?: Array<{ sequence?: number; name?: string; address?: string; latitude?: number; longitude?: number; id?: string }>;
    message?: string;
  } | null>(null);
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

  const filteredMapPoints = useMemo(() => {
    return mapPoints.filter((point) => matchesGlassType(point.glassType, selectedGlassType));
  }, [mapPoints, selectedGlassType]);

  const stats = useMemo(() => {
    if (!dashboardData) {
      return [];
    }

    const dataPoints = filteredMapPoints.length > 0 ? filteredMapPoints : mapPoints;
    const needsPickup = dataPoints.filter((point) => point.needsEmptying).length;
    const avgFill = dataPoints.length > 0 ? Math.round(dataPoints.reduce((sum, point) => sum + point.fillPercent, 0) / dataPoints.length) : 0;
    const routeEfficiency = Math.max(25, Math.min(98, 100 - Math.round(avgFill * 0.6)));
    const areasCount = new Set(dataPoints.map((point) => point.areaName)).size;

    return [
      { label: "Total Smart Bins", value: String(dataPoints.length), delta: `${areasCount} areas`, accent: "blue" },
      { label: "Needs Pickup", value: String(needsPickup), delta: `${dashboardData.totals.collections} collections`, accent: "red" },
      { label: "Avg. Fullness", value: `${avgFill}%`, delta: `${Math.round(dashboardData.avgTemperatureC)}°C`, accent: "amber" },
      { label: "Collected Today", value: String(dashboardData.totals.collections), delta: `${dashboardData.totals.readings} readings`, accent: "green" },
      { label: "Route Efficiency", value: `${routeEfficiency}%`, delta: `${Math.round(dashboardData.avgHumidityPercent)}% humidity`, accent: "teal" },
    ];
  }, [dashboardData, filteredMapPoints, mapPoints, selectedGlassType]);

  const areaRows = useMemo(() => {
    const grouped = new Map<string, number[]>();

    for (const point of filteredMapPoints.length > 0 ? filteredMapPoints : mapPoints) {
      const key = point.areaName || "Unknown";
      const bucketIndex = point.fillPercent <= 25 ? 0 : point.fillPercent <= 50 ? 1 : point.fillPercent <= 75 ? 2 : point.fillPercent <= 90 ? 3 : 4;
      const values = grouped.get(key) ?? [0, 0, 0, 0, 0, 0];
      values[bucketIndex] += 1;
      values[5] += 1;
      grouped.set(key, values);
    }

    return Array.from(grouped.entries()).map(([area, values]) => ({
      area,
      values,
    }));
  }, [filteredMapPoints, mapPoints]);

  const handleGenerateRoutes = async () => {
    setIsGeneratingRoutes(true);
    setRouteError("");

    try {
      const response = await fetch("/api/osm-bins/collection-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          origin: { latitude: 49.1427, longitude: 9.2109 },
          returnToOrigin: true,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message ?? "Unable to generate the collection route.");
      }

      setRouteResult(payload);
    } catch (error) {
      setRouteResult(null);
      setRouteError(error instanceof Error ? error.message : "Unable to generate the route.");
    } finally {
      setIsGeneratingRoutes(false);
    }
  };

  const routeRows = useMemo(() => {
    if (routeResult?.stops?.length) {
      return routeResult.stops.slice(0, 3).map((stop, index) => ({
        name: `Route ${String.fromCharCode(65 + index)}`,
        stops: stop.sequence ?? index + 1,
        est: routeResult.route?.duration ?? "Optimising",
        traffic: routeResult.route?.distanceMeters && routeResult.route.distanceMeters > 6000 ? "Heavy" : "Moderate",
        driver: index === 0 ? "MK" : index === 1 ? "SB" : "CL",
        status: routeResult.message ? "Waiting" : "Optimized",
      }));
    }

    const sourceAreas = selectedGlassType === "all"
      ? (dashboardData?.busiestAreas ?? [])
      : (dashboardData?.busiestAreas ?? []).filter((area) => {
          const matchingPoints = (filteredMapPoints.length > 0 ? filteredMapPoints : mapPoints).filter((point) => point.areaName === area.areaName);
          return matchingPoints.length > 0;
        });

    return sourceAreas.slice(0, 3).map((area, index) => ({
      name: index === 0 ? "Route West" : index === 1 ? "Route North" : "Route South",
      stops: area.binCount,
      est: `${Math.max(1, Math.round(area.collectionCount / 2))}h ${Math.round((area.collectionCount % 2) * 30)}m`,
      traffic: area.avgFillPercent > 70 ? "Heavy" : area.avgFillPercent > 45 ? "Moderate" : "Light",
      driver: index === 0 ? "MK" : index === 1 ? "SB" : "CL",
      status: area.binsNeedingEmptying > 0 ? "In Progress" : "Not Started",
    }));
  }, [dashboardData, filteredMapPoints, mapPoints, routeResult, selectedGlassType]);

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
          title: selectedGlassType === "all" ? "System healthy" : `${selectedGlassType.charAt(0).toUpperCase()}${selectedGlassType.slice(1)} collection steady`,
          text: "No active emptying alerts. Current collection workload remains within the configured thresholds for the chosen glass stream.",
          tag: "Stable",
        },
      ];
    }

    return sourceInsights.slice(0, 3).map((alert) => ({
      title: `${alert.areaName} · ${alert.name}`,
      text: alert.urgencyMessage || `${alert.name} is currently at ${alert.fillPercent}% fullness and requires attention.`,
      tag: alert.status === "critical" ? "Critical" : "Needs pickup",
    }));
  }, [dashboardData, selectedGlassType]);

  if (loading || !dashboardData) {
    return (
      <main className="glass-app dashboard-shell">
        <div className="glass-background" />
        <div className="dashboard-loading">Loading live dashboard data…</div>
      </main>
    );
  }

  return (
    <main className="glass-app dashboard-shell">
      <div className="glass-background" />

      <header className="dashboard-header">
        <div className="dashboard-brand-wrap">
          <button type="button" className="brand-button" onClick={onBack} aria-label="Return to home">
            <span className="brand-logo">G.L.A.S.S</span>
          </button>
          <div className="brand-subtitle">Glass Logistics &amp; Smart Sensing</div>
        </div>

        <div className="header-right">
          <div className="mini-widget">
            <span className="mini-label">Heilbronn</span>
            <span className="mini-time">Tue, 15 Apr 2025 10:24</span>
          </div>
          <button type="button" className="header-bell" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <div className="user-pill">
            <div className="user-avatar">
              <User size={14} />
            </div>
            <span>T. Maier</span>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="dashboard-sidebar">
          <div className="nav-group">
            <button type="button" className="nav-item active">
              <Grid2x2 size={18} />
              Overview
            </button>
            <button type="button" className="nav-item">
              <MapIcon size={18} />
              Map
            </button>
            <button type="button" className="nav-item">
              <Warehouse size={18} />
              Bins
            </button>
            <button type="button" className="nav-item">
              <Route size={18} />
              Routes
            </button>
            <button type="button" className="nav-item">
              <Users size={18} />
              Analytics
            </button>
            <button type="button" className="nav-item">
              <ShieldCheck size={18} />
              Reports
            </button>
            <button type="button" className="nav-item">
              <Menu size={18} />
              Settings
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <div className="section-header-row">
            <div>
              <h1>Hack the Bin – Smart glass collection dashboard</h1>
              <p>Glass Logistics &amp; Smart Sensing</p>
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
                {filter.label}
              </button>
            ))}
          </div>

          <div className="stats-grid">
            {stats.map((card) => (
              <div key={card.label} className={`stat-card ${card.accent}`}>
                <div className="stat-icon">
                  {card.accent === "blue" && <Warehouse size={18} />}
                  {card.accent === "red" && <AlertTriangle size={18} />}
                  {card.accent === "amber" && <Percent size={18} />}
                  {card.accent === "green" && <Truck size={18} />}
                  {card.accent === "teal" && <Route size={18} />}
                </div>
                <div className="stat-copy">
                  <div className="stat-label">{card.label}</div>
                  <div className="stat-value-row">
                    <strong>{card.value}</strong>
                    <span>{card.delta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="content-grid">
            <section className="panel table-panel">
              <div className="panel-title-row">
                <h2>Bin Status Overview</h2>
              </div>
              <div className="legend-row">
                <span>0 – 25%</span>
                <span>26 – 50%</span>
                <span>51 – 75%</span>
                <span>76 – 90%</span>
                <span>91 – 100%</span>
                <span>Total</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Area / District</th>
                      <th>0 – 25%</th>
                      <th>26 – 50%</th>
                      <th>51 – 75%</th>
                      <th>76 – 90%</th>
                      <th>91 – 100%</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaRows.map((row) => (
                      <tr key={row.area}>
                        <td>{row.area}</td>
                        {row.values.map((value, index) => (
                          <td key={`${row.area}-${index}`}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel map-panel">
              <div className="map-header">
                <button type="button" className="map-tab active">Map</button>
                <button type="button" className="map-tab">Satellite</button>
                <label className="map-search" aria-label="Search bins, areas or addresses">
                  <Search size={15} />
                  <input
                    type="text"
                    value={mapSearch}
                    onChange={(event) => setMapSearch(event.target.value)}
                    placeholder="Search bins, areas or addresses..."
                  />
                </label>
                <button type="button" className="map-button" aria-label="Open filters">
                  <MapPinned size={15} />
                </button>
              </div>

              <div className="map-canvas dashboard-map-canvas">
                <GlassBinsMap glassType={selectedGlassType} searchTerm={mapSearch} />
              </div>
            </section>
          </div>

          <div className="bottom-grid">
            <section className="panel route-panel">
              <div className="panel-title-row">
                <h2>Generated Routes</h2>
                <button type="button" className="text-link" onClick={handleGenerateRoutes} disabled={isGeneratingRoutes}>
                  {isGeneratingRoutes ? "Generating..." : "Generate routes"}
                  <ArrowRight size={14} />
                </button>
              </div>

              {routeError && <div className="route-message error">{routeError}</div>}
              {routeResult?.route && (
                <div className="route-message success">
                  Fastest route: {routeResult.route.distanceMeters ? `${Math.round(routeResult.route.distanceMeters / 1000)} km` : "best available"} · {routeResult.route.duration ?? "ETA pending"}
                </div>
              )}

              <div className="route-table">
                <div className="route-row head">
                  <span>Route</span>
                  <span>Stops</span>
                  <span>Est. Time</span>
                  <span>Traffic</span>
                  <span>Driver</span>
                  <span>Status</span>
                </div>
                {routeRows.map((row) => (
                  <div key={row.name} className="route-row">
                    <span className="route-name"><i className="route-dot" />{row.name}</span>
                    <span>{row.stops}</span>
                    <span>{row.est}</span>
                    <span>{row.traffic}</span>
                    <span>{row.driver}</span>
                    <span className="route-status">{row.status}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel selected-panel">
              <div className="panel-title-row">
                <h2>Selected Bin Details</h2>
                <span className="mini-tag">1 of {dashboardData.totals.bins}</span>
              </div>

              <div className="selected-bin-header">
                <div className="bin-id">BIN ID <strong>{selectedBin?.binId ?? "N/A"}</strong></div>
                <span className="warning-pill"><AlertTriangle size={12} /> {selectedBin?.urgencyMessage ?? "Monitoring"}</span>
              </div>

              <div className="bin-meta">
                <span><span className="meta-label">Location</span><strong>{selectedBin?.areaName ?? "Unknown area"}</strong></span>
                <span><span className="meta-label">Address</span><strong>{selectedBin?.address ?? "No address recorded"}</strong></span>
              </div>

              <div className="meter-grid">
                <div className="meter-box">
                  <span>Fullness</span>
                  <strong>{selectedBin?.fillPercent ?? 0}%</strong>
                </div>
                <div className="meter-box">
                  <span>Humidity</span>
                  <strong>{selectedBin?.humidityPercent ?? 0}%</strong>
                </div>
                <div className="meter-box">
                  <span>Temperature</span>
                  <strong>{selectedBin?.temperatureC ?? 0}°C</strong>
                </div>
                <div className="meter-box">
                  <span>Traffic nearby</span>
                  <strong>{selectedBin?.fillPercent && selectedBin.fillPercent > 70 ? "Heavy" : selectedBin?.fillPercent && selectedBin.fillPercent > 45 ? "Moderate" : "Light"}</strong>
                </div>
              </div>
            </section>

            <section className="panel insight-panel">
              <div className="panel-title-row">
                <h2>Hotspots &amp; Planning Insights</h2>
              </div>

              <div className="insight-list">
                {insightCards.map((item) => (
                  <article key={item.title} className="insight-item">
                    <div className="insight-title-row">
                      <h3>{item.title}</h3>
                      <span className="insight-badge">{item.tag}</span>
                    </div>
                    <p>{item.text}</p>
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

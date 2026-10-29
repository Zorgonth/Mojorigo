import { useTranslation } from "react-i18next";
import { Leaf, Truck, Gauge } from "lucide-react";
import { locale, t } from "../i18n";

const sampleRoutes = [
 {name: "North Heilbronn", saved: 18.4, needed: 8, visited: 9, fullness: 82},
 {name: "Central Heilbronn", saved: 15.2, needed: 7, visited: 8, fullness: 78},
 {name: "South Heilbronn", saved: 22.8, needed: 9, visited: 10, fullness: 86},
];
export default function AnalyticsImpact() {
 useTranslation();
 return <section className="analytics-impact" aria-labelledby="analytics-impact-title">
  <div className="analytics-impact-heading"><h3 id="analytics-impact-title">{t("Recent collection impact")}</h3><span className="mock-data-badge">{t("Mock data · illustrative only")}</span></div>
  <p className="zone-insights-note">{t("Sample figures for three recent routes. These are not measured savings or live collection records.")}</p>
  <div className="analytics-impact-grid">
   <article className="analytics-impact-card"><Leaf size={22} aria-hidden="true"/><span>{t("CO₂ saved")}</span><strong>{(56.4).toLocaleString(locale(), {maximumFractionDigits: 1})} kg</strong><p>{t("Compared with a sample fixed collection schedule")}</p></article>
   <article className="analytics-impact-card"><Truck size={22} aria-hidden="true"/><span>{t("Collection efficiency")}</span><strong>89%</strong><p>{t("24 of 27 visited locations needed collection")}</p></article>
   <article className="analytics-impact-card"><Gauge size={22} aria-hidden="true"/><span>{t("Fullness at collection")}</span><strong>82%</strong><p>{t("Sample average before emptying")}</p></article>
  </div>
  <h3 className="analytics-recent-title">{t("Recent routes · sample records")}</h3>
  <div className="analytics-recent-routes">{sampleRoutes.map((route,index) => <article className="analytics-sample-route" key={route.name}>
   <span className="mini-tag">{t("Route {{group}}", {group: index + 1})}</span><h4>{t(route.name)}</h4>
   <strong>{t("{{saved}} kg CO₂ saved", {saved: route.saved.toLocaleString(locale(), {maximumFractionDigits: 1})})}</strong>
   <p>{t("{{needed}} of {{visited}} stops needed pickup", {needed: route.needed, visited: route.visited})}</p>
   <p>{t("{{count}}% full before collection", {count: route.fullness})}</p>
  </article>)}</div>
 </section>;
}

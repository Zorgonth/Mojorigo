import { useTranslation } from "react-i18next";
import { locationLabel, t } from "../i18n";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { binFill, fillTone, locationTitle, type GlassBin, type GlassColor } from "./bin-data";

function containerIcon(bin: GlassBin, color: GlassColor, selected: boolean) {
  return L.divIcon({
    className: "glass-bin-marker",
    html: `<div class="glass-bin-pin ${fillTone(binFill(bin, color))} ${selected ? "marker-selected" : ""}"><svg width="24" height="26" viewBox="0 0 24 28" fill="none" aria-hidden="true"><ellipse cx="12" cy="5" rx="7" ry="3" fill="currentColor"/><path d="M5 5l1.5 18c0 3 11 3 11 0L19 5M7 11h10M8 15h8M8 19h8" stroke="currentColor" stroke-width="1.7"/></svg></div>`,
    iconSize: [44, 50], iconAnchor: [22, 45],
  });
}

export default function ClusteredBins({ bins, color, selected, onSelect }: {
  bins: GlassBin[]; color: GlassColor; selected: string | null; onSelect: (id: string | null) => void;
}) {
  const { i18n } = useTranslation();
  const map = useMap();
  const markers = useRef(new Map<string, L.Marker>());
  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.4,
      animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      spiderLegPolylineOptions: { color: "#005a9c", weight: 1.5, opacity: .55 },
      iconCreateFunction: cluster => {
        const count = cluster.getChildCount();
        return L.divIcon({ className: "bin-cluster", html: `<span>${count}</span>`, iconSize: [48, 48], iconAnchor: [24, 24] });
      },
    });
    const current = new Map<string, L.Marker>();
    for (const bin of bins) {
      const marker = L.marker([bin.latitude, bin.longitude], {
        icon: containerIcon(bin, color, false), title: locationLabel(locationTitle(bin)), alt: locationLabel(locationTitle(bin)),
      });
      marker.on("click", () => onSelect(bin.id));
      current.set(bin.id, marker);
    }
    markers.current = current;
    group.addLayers([...current.values()]);
    map.addLayer(group);
    const labelClusters = () => {
      for (const layer of group.getLayers()) {
        const visible = group.getVisibleParent(layer as L.Marker);
        if (visible instanceof L.MarkerCluster) {
          const element = visible.getElement();
          element?.setAttribute("aria-label", t("{{count}} container locations. Zoom in to expand.", {count: visible.getChildCount()}));
          element?.setAttribute("title", t("{{count}} locations — click to expand", {count: visible.getChildCount()}));
        }
      }
    };
    map.on("zoomend moveend", labelClusters);
    group.on("animationend", labelClusters);
    labelClusters();
    return () => {
      map.off("zoomend moveend", labelClusters);
      group.off("animationend", labelClusters);
      map.removeLayer(group);
      group.clearLayers();
      markers.current.clear();
    };
  }, [map, bins, color, onSelect, i18n.resolvedLanguage]);

  useEffect(() => {
    for (const bin of bins) markers.current.get(bin.id)?.setIcon(containerIcon(bin, color, selected === bin.id));
  }, [bins, color, selected, onSelect, i18n.resolvedLanguage]);
  return null;
}

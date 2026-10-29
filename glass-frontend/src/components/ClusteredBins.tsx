import { useTranslation } from "react-i18next";
import { locationLabel, t } from "../i18n";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import L from "leaflet";
import { createPortal } from "react-dom";
import { useMap } from "react-leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { locationTitle, type GlassBin, type GlassColor } from "./bin-data";

function containerIcon(selected: boolean) {
  return L.divIcon({
    className: "glass-bin-marker",
    html: `<div class="glass-bin-pin location-pin ${selected ? "marker-selected" : ""}"><svg width="25" height="26" viewBox="0 0 26 28" fill="none" aria-hidden="true"><path d="M10 2h6v7l4 5v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V14l4-5V2Z" fill="currentColor" fill-opacity=".1" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 2h6M10 5h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><g stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="m11 16 2-3 2.5 4h-2l2-0.1.4-2M16.5 18.5 18 22h-4l1.3-1.3M12 22H8.5l2-3.5.5 1.8M8.5 18.5l2 .1"/></g></svg></div>`,
    iconSize: [44, 50], iconAnchor: [22, 45], popupAnchor: [0, -40],
  });
}

export default function ClusteredBins({ bins, color, selected, onSelect, popupContent }: {
  bins: GlassBin[]; color: GlassColor; selected: string | null; onSelect: (id: string | null) => void; popupContent: ReactNode;
}) {
  const { i18n } = useTranslation();
  const map = useMap();
  const popupHost = useMemo(() => document.createElement("div"), []);
  const clusterGroup = useRef<L.MarkerClusterGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 55,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.4,
      // Keep cluster membership synchronous while the map animates to a selected pin.
      animate: false,
      spiderLegPolylineOptions: { color: "#005a9c", weight: 1.5, opacity: .55 },
      iconCreateFunction: cluster => {
        const count = cluster.getChildCount();
        return L.divIcon({ className: "bin-cluster", html: `<span>${count}</span>`, iconSize: [48, 48], iconAnchor: [24, 24] });
      },
    });
    const current = new Map<string, L.Marker>();
    for (const bin of bins) {
      const marker = L.marker([bin.latitude, bin.longitude], {
        icon: containerIcon(false), title: locationLabel(locationTitle(bin)), alt: locationLabel(locationTitle(bin)),
      });
      marker.on("click", () => onSelect(bin.id));
      current.set(bin.id, marker);
    }
    clusterGroup.current = group;
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
    // Animate the inner artwork so Leaflet keeps control of marker positioning.
    const revealFrame = requestAnimationFrame(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const visible = new Set<HTMLElement>();
      for (const marker of current.values()) {
        const element = group.getVisibleParent(marker)?.getElement();
        const artwork = element?.querySelector<HTMLElement>(".glass-bin-pin, :scope > span");
        if (artwork) visible.add(artwork);
      }
      [...visible].forEach((element, index) => {
        element.style.setProperty("--pin-delay", `${Math.min(index * 55, 650)}ms`);
      });
    });
    return () => {
      cancelAnimationFrame(revealFrame);
      map.off("zoomend moveend", labelClusters);
      group.off("animationend", labelClusters);
      clusterGroup.current = null;
      map.removeLayer(group);
      group.clearLayers();
      markers.current.clear();
      clusterGroup.current = null;
    };
  }, [map, bins, color, onSelect, i18n.resolvedLanguage]);

  useEffect(() => {
    for (const bin of bins) markers.current.get(bin.id)?.setIcon(containerIcon(selected === bin.id));
  }, [bins, color, selected, onSelect, i18n.resolvedLanguage]);
  useEffect(() => {
    const marker = selected ? markers.current.get(selected) : undefined;
    const group = clusterGroup.current;
    if (!marker || !group) return;
    let cancelled = false;
    const popup = L.popup({
      className: "container-pin-popup", closeButton: false, maxWidth: 350,
      autoPanPaddingTopLeft: L.point(map.getContainer().closest(".finder-page") && window.innerWidth > 760 ? 590 : 20, 120),
      autoPanPaddingBottomRight: L.point(24, 40),
    }).setContent(popupHost);
    const close = () => {
      if (!cancelled && clusterGroup.current === group) onSelect(null);
    };
    let revealFrame = 0;
    const reveal = () => {
      if (cancelled) return;
      // Defer until every moveend listener has updated visible cluster membership.
      revealFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        group.zoomToShowLayer(marker, () => {
          if (cancelled) return;
          marker.bindPopup(popup).openPopup();
          popup.update();
          popup.on("remove", close);
        });
      });
    };
    map.stop();
    const zoom = Math.max(map.getZoom(), 17);
    if (map.getZoom() === zoom && map.getCenter().equals(marker.getLatLng(), 0.00001)) reveal();
    else {
      map.once("moveend", reveal);
      map.setView(marker.getLatLng(), zoom, {
        // Keep cluster membership synchronous while the map animates to a selected pin.
      animate: false,
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(revealFrame);
      map.off("moveend", reveal);
      popup.off("remove", close);
      popup.remove();
      marker.unbindPopup();
    };
  }, [map, bins, color, selected, onSelect, i18n.resolvedLanguage, popupHost]);
  return createPortal(popupContent, popupHost);
}

import { ArrowLeft, ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import LanguageSelect from "./LanguageSelect";
import { t } from "../i18n";
import "leaflet/dist/leaflet.css";
import "./LandingPage.css";

function ResizeLandingMap() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    map.invalidateSize({ pan: false });
    return () => observer.disconnect();
  }, [map]);
  return null;
}

export default function LandingPage({ onCitizen, onManager }: { onCitizen: () => void; onManager: () => void }) {
  useTranslation();
  return <main className="glass-app landing-page">
    <div className="glass-background"/>
    <header className="landing-header">
      <div className="landing-language"><LanguageSelect/></div>
      <div className="landing-brand" aria-label="G.L.A.S.S">
        <div className="glass-logo landing-logo">G.<span className="logo-l">L</span>.A.S.S</div>
        <span className="brand-tagline">{t("GLASS RECYCLING NEAR YOU")}</span>
      </div>
      <h1>{t("Where would you like to go?")}</h1>
    </header>
    <div className="landing-choices">
      <section className="landing-choice landing-citizen">
        <div className="landing-map" aria-hidden="true" inert>
          <MapContainer center={[49.1427, 9.2109]} zoom={13} zoomControl={false} attributionControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false} boxZoom={false} className="landing-leaflet">
            <ResizeLandingMap/>
            <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          </MapContainer>
        </div>
        <button type="button" className="landing-choice-button" onClick={onCitizen}>
          <span className="landing-choice-content">
            <span className="landing-role"><MapPin size={18}/>{t("For citizens")}</span>
            <span className="landing-choice-title">{t("Find a container")}</span>
            <span className="landing-choice-description">{t("Your neighbourhood. Your next glass collection point.")}</span>
            <span className="landing-choice-action"><ArrowLeft size={19}/>{t("Explore the map")}</span>
          </span>
        </button>
        <a className="landing-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
      </section>
      <section className="landing-choice landing-manager">
        <div className="landing-dashboard-preview" aria-hidden="true">
          <img className="landing-dashboard-image" src="/images/dashboard-landing-preview.png" alt="" decoding="async"/>
        </div>
        <button type="button" className="landing-choice-button" onClick={onManager}>
          <span className="landing-choice-content">
            <span className="landing-role"><ShieldCheck size={18}/>{t("For managers")}</span>
            <span className="landing-choice-title">{t("Manage collections")}</span>
            <span className="landing-choice-description">{t("A clearer view of containers, fill levels and collection routes.")}</span>
            <span className="landing-choice-action">{t("Manager sign in")}<ArrowRight size={19}/></span>
          </span>
        </button>
      </section>
    </div>
    <p className="landing-footer">{t("A little less waste. A little more clarity.")}</p>
  </main>;
}

import { useTranslation } from "react-i18next";
export default function LanguageSelect() {
  const { t, i18n } = useTranslation();
  const german = i18n.resolvedLanguage === "de";
  return <button type="button" className="language-selector language-toggle"
    onClick={() => void i18n.changeLanguage(german ? "en" : "de")}
    aria-label={t(german ? "Switch to English" : "Switch to German")}
    title={t(german ? "Switch to English" : "Switch to German")}>
    {german ? "DE" : "EN"}
  </button>;
}

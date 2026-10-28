import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
export default function LanguageSelect() {
  const { t, i18n } = useTranslation();
  return <div className="language-selector">
    <select value={i18n.resolvedLanguage === "de" ? "de" : "en"} onChange={event => void i18n.changeLanguage(event.target.value)} aria-label={t("Select language")} title={t("Select language")}>
      <option value="en" lang="en">EN</option>
      <option value="de" lang="de">DE</option>
    </select>
    <ChevronDown size={18} aria-hidden="true"/>
  </div>;
}

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import type { TOptions } from "i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";
let language = "en";
try { language = localStorage.getItem("glass-language") === "de" ? "de" : "en"; } catch { /* Storage may be unavailable. */ }
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, de: { translation: de } },
  lng: language, fallbackLng: "en", supportedLngs: ["en", "de"], load: "languageOnly",
  keySeparator: false, nsSeparator: false, initAsync: false,
  interpolation: { escapeValue: false },
});
function syncLanguage(language: string) {
  const supported = language === "de" ? "de" : "en";
  document.documentElement.lang = supported;
  try { localStorage.setItem("glass-language", supported); } catch { /* Keep switching functional without storage. */ }
}
i18n.on("languageChanged", syncLanguage);
syncLanguage(i18n.language);
export const t = (key: string, options?: TOptions): string => String(i18n.t(key, options));
export const locale = () => i18n.resolvedLanguage === "de" ? "de-DE" : "en-GB";
export default i18n;

export function locationLabel(label: string): string {
  return label.startsWith("Near ") ? t("Near {{street}}", {street: label.slice(5)}) : t(label);
}
export function urgencyLabel(message: string): string {
  let match = /^Critical: ([\d.]+)% full — empty as soon as possible$/.exec(message);
  if (match) return t("Critical: {{fill}}% full — empty as soon as possible", {fill: match[1]});
  match = /^Urgent: ([\d.]+)% full — empty soon \(threshold ([\d.]+)%\)$/.exec(message);
  if (match) return t("Urgent: {{fill}}% full — empty soon (threshold {{threshold}}%)", {fill: match[1],threshold: match[2]});
  match = /^Overdue: not emptied in ([\d+]+) days, so threshold dropped to ([\d.]+)% \(now ([\d.]+)% full\)$/.exec(message);
  if (match) return t("Overdue: not emptied in {{days}} days, threshold {{threshold}}% (now {{fill}}% full)", {days: match[1],threshold: match[2],fill: match[3]});
  return t(message);
}

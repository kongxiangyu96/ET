import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "./zh.json";
import en from "./en.json";
import de from "./de.json";

const savedLang = localStorage.getItem("lang") ?? "zh";

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
    de: { translation: de },
  },
  lng: savedLang,
  fallbackLng: "zh",
  interpolation: { escapeValue: false },
});

export function setLanguage(lang: string) {
  i18n.changeLanguage(lang);
  localStorage.setItem("lang", lang);
}

export { i18n };
export default i18n;

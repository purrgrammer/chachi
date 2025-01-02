import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "../public/locales/en/common.json";
import esTranslations from "../public/locales/es/common.json";
import hansTranslations from "../public/locales/hans/common.json";
import hantTranslations from "../public/locales/hant/common.json";

type Language = "en" | "es" | "hans" | "hant";

export function getLanguage(): Language {
  const lang = localStorage.getItem("language");
  if (lang && ["en", "es", "hans", "hant"].includes(lang)) {
    return lang as Language;
  }
  return "en";
}

export function changeLanguage(lang: Language) {
  localStorage.setItem("language", lang);
  i18n.changeLanguage(lang);
}

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  lng: getLanguage(),
  resources: {
    en: {
      translations: enTranslations,
    },
    es: {
      translations: esTranslations,
    },
    hans: {
      translations: hansTranslations,
    },
    hant: {
      translations: hantTranslations,
    },
  },
  ns: ["translations"],
  defaultNS: "translations",
});

i18n.languages = ["en", "es", "hans", "hant"];

export default i18n;

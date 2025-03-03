import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "../public/locales/en/common.json";
import esTranslations from "../public/locales/es-ES/common.json";
import zhCNTranslations from "../public/locales/zh-CN/common.json";
import zhTWTranslations from "../public/locales/zh-TW/common.json";
import svTranslations from "../public/locales/sv-SE/common.json";
import deTranslations from "../public/locales/de-DE/common.json";
import arTranslations from "../public/locales/ar-SA/common.json";
import nlTranslations from "../public/locales/nl-NL/common.json";

export type Language =
  | "en"
  | "es"
  | "zh-CN"
  | "zh-TW"
  | "sv-SE"
  | "de-DE"
  | "ar-SA"
  | "nl-NL";

export const languages = [
  "en",
  "es",
  "zh-CN",
  "zh-TW",
  "sv-SE",
  "de-DE",
  "ar-SA",
  "nl-NL",
] as const;

export function getLanguage(): Language {
  const lang = localStorage.getItem("language");
  if (lang && languages.includes(lang as Language)) {
    return lang as Language;
  }
  return "en";
}

export function changeLanguage(lang: Language) {
  localStorage.setItem("language", lang);
  i18n.changeLanguage(lang);
}

// todo: lazily load languages
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
    "es-ES": {
      translations: esTranslations,
    },
    "zh-CN": {
      translations: zhCNTranslations,
    },
    "zh-TW": {
      translations: zhTWTranslations,
    },
    "sv-SE": {
      translations: svTranslations,
    },
    "de-DE": {
      translations: deTranslations,
    },
    "ar-SA": {
      translations: arTranslations,
    },
    "nl-NL": {
      translations: nlTranslations,
    },
  },
  ns: ["translations"],
  defaultNS: "translations",
});

i18n.languages = languages;

export default i18n;

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "../public/locales/en/common.json";
import esTranslations from "../public/locales/es/common.json";
import zhCNTranslations from "../public/locales/zh-CN/common.json";
import zhTWTranslations from "../public/locales/zh-TW/common.json";

export type Language = "en" | "es" | "zh-CN" | "zh-TW";

export const languages = ["en", "es", "zh-CN", "zh-TW"] as const;

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
    "zh-CN": {
      translations: zhCNTranslations,
    },
    "zh-TW": {
      translations: zhTWTranslations,
    },
  },
  ns: ["translations"],
  defaultNS: "translations",
});

i18n.languages = languages;

export default i18n;

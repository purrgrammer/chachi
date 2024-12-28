import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "../public/locales/en/common.json";
import esTranslations from "../public/locales/es/common.json";
import hansTranslations from "../public/locales/hans/common.json";
import hantTranslations from "../public/locales/hant/common.json";

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  lng: "es",
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

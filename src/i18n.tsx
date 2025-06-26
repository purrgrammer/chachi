import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enTranslations from "../public/locales/en/common.json";

export type Language =
  | "en"
  | "es"
  | "zh-CN"
  | "zh-TW"
  | "sv-SE"
  | "de-DE"
  | "ar-SA"
  | "nl-NL"
  | "cs-CZ"
  | "pl-PL";

export const languages = [
  "en",
  "es",
  "zh-CN",
  "zh-TW",
  "sv-SE",
  "de-DE",
  "ar-SA",
  "nl-NL",
  "cs-CZ",
  "pl-PL",
] as const;

export function getLanguage(): Language {
  const lang = localStorage.getItem("language");
  if (lang && languages.includes(lang as Language)) {
    return lang as Language;
  }
  return "en";
}

export async function changeLanguage(lang: Language) {
  localStorage.setItem("language", lang);

  // Load translation if not already loaded
  if (!i18n.hasResourceBundle(lang, "translations")) {
    const translations = await loadTranslation(lang === "es" ? "es-ES" : lang);
    i18n.addResourceBundle(lang, "translations", translations);
  }

  i18n.changeLanguage(lang);
}

// Lazy load translations to reduce initial bundle size
const loadTranslation = async (lang: string) => {
  try {
    const module = await import(`../public/locales/${lang}/common.json`);
    return module.default;
  } catch (error) {
    console.warn(
      `Failed to load translation for ${lang}, falling back to English`,
    );
    return enTranslations;
  }
};

i18n.use(initReactI18next).init({
  fallbackLng: "en",
  lng: getLanguage(),
  resources: {
    en: {
      translations: enTranslations,
    },
  },
  ns: ["translations"],
  defaultNS: "translations",
});

i18n.languages = languages;

export default i18n;

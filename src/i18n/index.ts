import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales';

const LAZY_LOCALES: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  zh: () => import('./locales/zh'),
  es: () => import('./locales/es'),
  ko: () => import('./locales/ko'),
  vi: () => import('./locales/vi'),
  ja: () => import('./locales/ja'),
  tl: () => import('./locales/tl'),
  hi: () => import('./locales/hi'),
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

async function loadLocale(lng: string) {
  if (lng === 'en' || !LAZY_LOCALES[lng]) return;
  if (i18n.hasResourceBundle(lng, 'translation')) return;

  const mod = await LAZY_LOCALES[lng]();
  i18n.addResourceBundle(lng, 'translation', mod.default, true, true);
}

const detectedLang = i18n.language?.split('-')[0];
if (detectedLang && detectedLang !== 'en') {
  loadLocale(detectedLang);
}

i18n.on('languageChanged', (lng) => {
  loadLocale(lng.split('-')[0]);
});

export default i18n;

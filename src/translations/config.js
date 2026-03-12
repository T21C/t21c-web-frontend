import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { loadTranslations } from './utils/loadTranslations';

const DEFAULT_LANGUAGE = 'en';
const NAMESPACES = ['common', 'pages', 'components'];

export const normalizeLanguage = (lang) => lang === 'us' ? DEFAULT_LANGUAGE : (lang || DEFAULT_LANGUAGE);

export const ensureLanguageLoaded = async (lang) => {
  const normalizedLanguage = normalizeLanguage(lang);

  try {
    const missingNamespaces = NAMESPACES.filter(namespace => !i18next.hasResourceBundle(normalizedLanguage, namespace));

    if (missingNamespaces.length === 0) {
      return normalizedLanguage;
    }

    const translationsByNamespace = await loadTranslations(normalizedLanguage);

    missingNamespaces.forEach(namespace => {
      i18next.addResourceBundle(
        normalizedLanguage,
        namespace,
        translationsByNamespace[namespace] || {},
        true,
        true
      );
    });
  } catch (error) {
    console.error(`Error loading translations for ${normalizedLanguage}:`, error);

    if (normalizedLanguage !== DEFAULT_LANGUAGE) {
      await ensureLanguageLoaded(DEFAULT_LANGUAGE);
      return DEFAULT_LANGUAGE;
    }
  }

  return normalizedLanguage;
};

export const changeAppLanguage = async (lang) => {
  const normalizedLanguage = await ensureLanguageLoaded(lang);

  await i18next.changeLanguage(normalizedLanguage);
  localStorage.setItem('appLanguage', normalizedLanguage);

  return normalizedLanguage;
};

const initializeTranslations = async () => {
  const currentLang = normalizeLanguage(localStorage.getItem('appLanguage'));

  await i18next
    .use(initReactI18next)
    .init({
      lng: currentLang,
      fallbackLng: DEFAULT_LANGUAGE,
      interpolation: {
        escapeValue: false,
        nestingSeparator: '$',
        formatSeparator: ',',
        format: function(value, format) {
          if (format === 'uppercase') return value.toUpperCase();
          if (format === 'lowercase') return value.toLowerCase();
          return value;
        },
      },
      ns: NAMESPACES,
      defaultNS: 'common',
      debug: true,
      resources: {},
    });

  await ensureLanguageLoaded(DEFAULT_LANGUAGE);

  if (currentLang !== DEFAULT_LANGUAGE) {
    await ensureLanguageLoaded(currentLang);
  }

  await i18next.changeLanguage(currentLang);
};

initializeTranslations().catch(console.error);

export default i18next;
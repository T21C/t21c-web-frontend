import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { loadTranslations } from './utils/loadTranslations';


// Initialize resources object
const resources = {};

// Function to load a specific language
const loadLanguage = async (lang) => {
  if (resources[lang]) {
    return resources[lang];
  }

  try {

    // Initialize language resources
    resources[lang] = {
      pages: {},
      components: {},
      common: {},
    };

    // Load pages and components translations
    const [pagesTranslations, componentsTranslations, commonTranslations] = await Promise.all([
      loadTranslations(lang, 'pages'),
      loadTranslations(lang, 'components'),
      loadTranslations(lang, 'common')

    ]);

    resources[lang].pages = pagesTranslations;
    resources[lang].components = componentsTranslations;
    resources[lang].common = commonTranslations;
    return resources[lang];
  } catch (error) {
    console.error(`Error loading translations for ${lang}:`, error);
    // Fallback to English if loading fails
    return lang === 'en' ? {} : loadLanguage('en');
  }
};

// Function to initialize translations
const initializeTranslations = async () => {
  const currentLang = localStorage.getItem('appLanguage') || 'en';
  
  // Load current language and English (if not already current)
  await Promise.all([
    loadLanguage(currentLang),
    currentLang !== 'en' ? loadLanguage('en') : Promise.resolve(),
  ]);

  // Initialize i18next
  await i18next
    .use(initReactI18next)
    .init({
      resources,
      lng: currentLang,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
        nestingSeparator: '$',
        formatSeparator: ',',
        format: function(value, format, lng) {
          if (format === 'uppercase') return value.toUpperCase();
          if (format === 'lowercase') return value.toLowerCase();
          return value;
        },
      },
      ns: ['common', 'pages', 'components'],
      defaultNS: 'common',
      debug: true,
    });

  // Set up language change handler
  i18next.on('languageChanged', async (newLang) => {
    if (!resources[newLang]) {
      await loadLanguage(newLang);
      // Add loaded resources to i18next (don't use reloadResources - that requires a backend)

    }
  });
};

// Initialize translations
initializeTranslations().catch(console.error);

export default i18next; 
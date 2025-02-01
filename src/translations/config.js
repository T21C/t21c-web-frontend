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
    // Get all common translation files
    const commonFiles = import.meta.glob('./languages/*/common.json', { eager: true });
    
    // Initialize language resources
    resources[lang] = {
      common: {},
      pages: {},
      components: {}
    };

    // Load common translations
    const commonPath = Object.keys(commonFiles).find(path => path.includes(`/languages/${lang}/common.json`));
    if (commonPath) {
      resources[lang].common = commonFiles[commonPath].default;
    }

    // Load pages and components translations
    const [pagesTranslations, componentsTranslations] = await Promise.all([
      loadTranslations(lang, 'pages'),
      loadTranslations(lang, 'components')
    ]);

    resources[lang].pages = pagesTranslations;
    resources[lang].components = componentsTranslations;

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
      i18next.reloadResources(newLang);
    }
  });
};

// Initialize translations
initializeTranslations().catch(console.error);

export default i18next; 
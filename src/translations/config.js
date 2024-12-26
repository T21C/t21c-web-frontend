import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
import enCommon from './languages/en/common.json';
import enPages from './languages/en/pages/loadTranslations';
import enComponents from './languages/en/components/loadTranslations';

const resources = {
  en: {
    common: enCommon,
    pages: enPages,
    components: enComponents,
  },
};

i18next
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('appLanguage') || 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
      nestingSeparator: '$',  // Change nesting separator to avoid conflicts
      formatSeparator: ',',
      format: function(value, format, lng) {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        return value;
      },
    },
    // Namespaces configuration
    ns: ['common', 'pages', 'components'],
    defaultNS: 'common',
    debug: true, // Enable debug mode to see what's happening with translations
  });

export default i18next; 
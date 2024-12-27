import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
import enCommon from './languages/en/common.json';
import enPages from './languages/en/pages/loadTranslations';
import enComponents from './languages/en/components/loadTranslations';

// Korean translations
import krCommon from './languages/kr/common.json';
import krPages from './languages/kr/pages/loadTranslations';
import krComponents from './languages/kr/components/loadTranslations';

// Chinese translations
import cnCommon from './languages/cn/common.json';
import cnPages from './languages/cn/pages/loadTranslations';
import cnComponents from './languages/cn/components/loadTranslations';

// Indonesian translations
import idCommon from './languages/id/common.json';
import idPages from './languages/id/pages/loadTranslations';
import idComponents from './languages/id/components/loadTranslations';

// Russian translations
import ruCommon from './languages/ru/common.json';
import ruPages from './languages/ru/pages/loadTranslations';
import ruComponents from './languages/ru/components/loadTranslations';

// German translations
import deCommon from './languages/de/common.json';
import dePages from './languages/de/pages/loadTranslations';
import deComponents from './languages/de/components/loadTranslations';

// French translations
import frCommon from './languages/fr/common.json';
import frPages from './languages/fr/pages/loadTranslations';
import frComponents from './languages/fr/components/loadTranslations';

// Spanish translations
import esCommon from './languages/es/common.json';
import esPages from './languages/es/pages/loadTranslations';
import esComponents from './languages/es/components/loadTranslations';

const resources = {
  en: {
    common: enCommon,
    pages: enPages,
    components: enComponents,
  },
  kr: {
    common: krCommon,
    pages: krPages,
    components: krComponents,
  },
  cn: {
    common: cnCommon,
    pages: cnPages,
    components: cnComponents,
  },
  id: {
    common: idCommon,
    pages: idPages,
    components: idComponents,
  },
  ru: {
    common: ruCommon,
    pages: ruPages,
    components: ruComponents,
  },
  de: {
    common: deCommon,
    pages: dePages,
    components: deComponents,
  },
  fr: {
    common: frCommon,
    pages: frPages,
    components: frComponents,
  },
  es: {
    common: esCommon,
    pages: esPages,
    components: esComponents,
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
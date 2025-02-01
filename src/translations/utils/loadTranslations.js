/**
 * Dynamically loads all translation files from a specific directory
 * @param {string} language - The language code (e.g., 'en', 'es')
 * @param {string} category - The category of translations ('pages' or 'components')
 * @returns {Object} - Object containing all translations for the specified language and category
 */
export const loadTranslations = async (language, category) => {
  const translations = {};
  
  try {
    // Get all JSON files in all language directories with eager loading
    const allFiles = import.meta.glob('../languages/*/pages/*.json', { eager: true });
    const componentFiles = import.meta.glob('../languages/*/components/*.json', { eager: true });
    
    // Filter files for the specific language and category
    const pattern = new RegExp(`/languages/${language}/${category}/([^/]+)\\.json$`);
    const relevantFiles = category === 'pages' ? allFiles : componentFiles;

    // Process each translation file for the specified language and category
    Object.keys(relevantFiles).forEach(path => {
      if (pattern.test(path)) {
        const match = path.match(pattern);
        if (match && match[1]) {
          const key = match[1];
          translations[key] = relevantFiles[path].default;
        }
      }
    });
    
    return translations;
  } catch (error) {
    console.warn(`Note: Some translations for ${category} in ${language} might be missing:`, error);
    return translations; // Return any translations we managed to load
  }
}; 
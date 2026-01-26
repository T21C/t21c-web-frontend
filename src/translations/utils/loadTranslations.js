/**
 * Dynamically loads all translation files from a specific directory
 * @param {string} language - The language code (e.g., 'en', 'es')
 * @param {string} category - The category of translations ('pages', 'components', or 'common')
 * @param {string} basePath - Optional base path for translation files (default: '../languages')
 * @returns {Object} - Object containing all translations for the specified language and category
 */
export const loadTranslations = async (language, category, basePath = '../languages') => {
  const translations = {};
  
  try {
    // Vite's import.meta.glob requires a literal string pattern, not a dynamic variable
    // Use a broad literal pattern that matches all translation files, then filter at runtime
    // This pattern matches: ../languages/*/pages/**/*.json, ../languages/*/components/**/*.json, ../languages/*/common/**/*.json
    const allFiles = import.meta.glob('../languages/*/pages/**/*.json', { eager: true });
    const componentFiles = import.meta.glob('../languages/*/components/**/*.json', { eager: true });
    const commonFiles = import.meta.glob('../languages/*/**/*.json', { eager: true });
    
    // Combine all files based on category
    const relevantFiles = category === 'pages' ? allFiles 
      : category === 'components' ? componentFiles 
      : category === 'common' ? commonFiles 
      : {};
    
    // Pattern to match files for the specific language and category
    // Matches paths containing: .../languages/{language}/{category}/.../{filename}.json
    const languageCategoryPattern = new RegExp(`/languages/${language}/${category}/`);
    
    // Process each translation file for the specified language and category
    Object.keys(relevantFiles).forEach(path => {
      if (languageCategoryPattern.test(path)) {
        const fileContent = relevantFiles[path].default;
        
        if (!fileContent || typeof fileContent !== 'object') {
          return; // Skip invalid files
        }
        
        // Extract relative path from category directory
        // Match: .../languages/{language}/{category}/(...)/{filename}.json
        const relativePathMatch = path.match(new RegExp(`/languages/${language}/${category}/(.+)\\.json$`));
        
        if (category === 'common') {
          // For common, merge all files into a single namespace
          // All JSON files in common directory (and subdirectories) are merged together
          Object.assign(translations, fileContent);
        } else {
          // For pages and components, use filename (without extension) as key
          // Handle both direct files (e.g., pages/home.json) and nested files (e.g., pages/subdir/file.json)
          if (relativePathMatch) {
            const relativePath = relativePathMatch[1];
            // Use the relative path as key, replacing slashes with underscores for nested files
            // Or just use the filename if it's a direct file
            const key = relativePath.includes('/') 
              ? relativePath.replace(/\//g, '_')
              : relativePath;
            
            translations[key] = fileContent;
          }
        }
      }
    });
    
    return translations;
  } catch (error) {
    console.warn(`Note: Some translations for ${category} in ${language} might be missing:`, error);
    return translations; // Return any translations we managed to load
  }
}; 
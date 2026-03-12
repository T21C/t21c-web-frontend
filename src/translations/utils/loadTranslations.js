const KNOWN_NAMESPACES = ['common', 'pages', 'components'];

const createNamespaceBuckets = () => ({
  common: {},
  pages: {},
  components: {},
});

const toTranslationKey = (relativePath) => relativePath.replace(/\//g, '_');

/**
 * Loads all translation files for a language and groups them by namespace folder.
 * Example: `languages/en/common/main.json` is assigned to the `common` namespace,
 * while `languages/en/pages/foo/bar.json` becomes `pages.foo_bar`.
 *
 * @param {string} language - The language code (e.g. 'en', 'es')
 * @param {string | null} namespace - Optional namespace filter ('pages', 'components', 'common')
 * @returns {Object} Namespace map, or a single namespace object when `namespace` is provided
 */
export const loadTranslations = async (language, namespace = null) => {
  const translationsByNamespace = createNamespaceBuckets();

  try {
    const allFiles = import.meta.glob('../languages/*/**/*.json', { eager: true });
    const namespaceFilter = namespace && KNOWN_NAMESPACES.includes(namespace) ? namespace : null;

    Object.entries(allFiles).forEach(([path, module]) => {
      const match = path.match(/\/languages\/([^/]+)\/([^/]+)\/(.+)\.json$/);

      if (!match) {
        return;
      }

      const [, fileLanguage, fileNamespace, relativePath] = match;

      if (fileLanguage !== language || !KNOWN_NAMESPACES.includes(fileNamespace)) {
        return;
      }

      if (namespaceFilter && fileNamespace !== namespaceFilter) {
        return;
      }

      const fileContent = module?.default;

      if (!fileContent || typeof fileContent !== 'object') {
        return;
      }

      if (fileNamespace === 'common') {
        Object.assign(translationsByNamespace.common, fileContent);
        return;
      }

      translationsByNamespace[fileNamespace][toTranslationKey(relativePath)] = fileContent;
    });

    return namespaceFilter ? translationsByNamespace[namespaceFilter] : translationsByNamespace;
  } catch (error) {
    const target = namespace || 'all namespaces';
    console.warn(`Note: Some translations for ${target} in ${language} might be missing:`, error);
    return namespace ? translationsByNamespace[namespace] : translationsByNamespace;
  }
};
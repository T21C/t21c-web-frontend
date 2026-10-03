// tuf-search: #siteLanguageOptions #languages
export const DEFAULT_SITE_LANGUAGE_OPTIONS = {
  en: { display: 'English', countryCode: 'us', status: 100 },
  pl: { display: 'Polski', countryCode: 'pl', status: 0 },
  kr: { display: '한국어', countryCode: 'kr', status: 0 },
  cn: { display: '中文', countryCode: 'cn', status: 0 },
  id: { display: 'Bahasa Indonesia', countryCode: 'id', status: 0 },
  jp: { display: '日本語', countryCode: 'jp', status: 0 },
  ru: { display: 'Русский', countryCode: 'ru', status: 0 },
  de: { display: 'Deutsch', countryCode: 'de', status: 0 },
  fr: { display: 'Français', countryCode: 'fr', status: 0 },
  es: { display: 'Español', countryCode: 'es', status: 0 },
};

export function normalizeSiteLanguageOptions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return DEFAULT_SITE_LANGUAGE_OPTIONS;
  }

  return Object.entries(DEFAULT_SITE_LANGUAGE_OPTIONS).reduce((options, [code, fallback]) => {
    const next = value[code];
    options[code] =
      next && typeof next === 'object'
        ? {
            display:
              typeof next.display === 'string' && next.display.trim()
                ? next.display
                : fallback.display,
            countryCode:
              typeof next.countryCode === 'string' && next.countryCode.trim()
                ? next.countryCode
                : fallback.countryCode,
            status: Number.isFinite(Number(next.status))
              ? Number(next.status)
              : fallback.status,
          }
        : fallback;
    return options;
  }, {});
}

export function languageCompletionLabel(status, t) {
  if (status === 0) return t('navigation.languages.comingSoon', { ns: 'components' });
  if (status < 100) return `${status.toFixed(1)}%`;
  return '100%';
}

export function sortSiteLanguageEntries(languages) {
  return Object.entries(languages).sort(([, a], [, b]) => {
    if (a.status !== b.status) return b.status - a.status;
    return a.display.localeCompare(b.display || '');
  });
}

import { isoToEmoji } from '@/utils';
import { normalizeLanguage } from '@/translations/config';

export const DEFAULT_LINK_LANGUAGE = 'en';

export function resolveLinkLocale(locales, requested) {
  const list = Array.isArray(locales) ? locales : [];
  if (!list.length) return null;
  const wanted = normalizeLanguage(requested);
  return (
    list.find((row) => row.languageCode === wanted) ||
    list.find((row) => row.languageCode === DEFAULT_LINK_LANGUAGE) ||
    list[0] ||
    null
  );
}

export function linkHasLocale(locales, languageCode) {
  const wanted = normalizeLanguage(languageCode);
  return (locales || []).some((row) => row.languageCode === wanted);
}

export function displayFieldsForLocale(link, languageCode) {
  if (!link) return null;
  const resolved = resolveLinkLocale(link.locales, languageCode);
  return {
    title: resolved?.title || link.title,
    url: resolved?.url || link.url,
    description: resolved?.description ?? link.description ?? null,
    languageCode: resolved?.languageCode || DEFAULT_LINK_LANGUAGE,
  };
}

export function localesOnLink(link) {
  return (link?.locales || []).map((row) => row.languageCode);
}

export function availableSliceCodes(entries, getLocales) {
  const codes = new Set([DEFAULT_LINK_LANGUAGE]);
  for (const entry of entries || []) {
    for (const code of getLocales(entry) || []) {
      if (code) codes.add(code);
    }
  }
  return [...codes];
}

export function pickInitialSliceLanguage(availableCodes, siteLanguage) {
  const wanted = normalizeLanguage(siteLanguage);
  if (wanted !== DEFAULT_LINK_LANGUAGE && availableCodes.includes(wanted)) {
    return wanted;
  }
  return DEFAULT_LINK_LANGUAGE;
}

export function sliceEntriesByLocale(entries, languageCode, getLocales) {
  const wanted = normalizeLanguage(languageCode);
  return (entries || []).filter((entry) => (getLocales(entry) || []).includes(wanted));
}

export function languageFlagSrc(code, languageMap) {
  const country =
    languageMap?.[code]?.countryCode || (code === DEFAULT_LINK_LANGUAGE ? 'us' : code);
  return isoToEmoji(country);
}

export function languageLabel(code, languageMap) {
  return languageMap?.[code]?.display || String(code || '').toUpperCase();
}

export function hostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch {
    return url || '';
  }
}

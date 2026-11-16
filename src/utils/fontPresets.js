// tuf-search: #fontPresets #preferences
/**
 * Site font presets. Append an entry to add a face:
 * `{ id, name, stack, google? }`. `google` is the CSS2 `family=` value
 * (omit for faces already loaded, or for system fonts).
 * Keep ids in sync with APP_FONT_PRESET_IDS in
 * server/src/server/services/auth/clientPreferencePayload.ts.
 */
export const DEFAULT_FONT_PRESET_ID = 'roboto';

const UI_GOOGLE_WEIGHTS = 'ital,wght@0,400;0,500;0,600;0,700;1,400';

export const FONT_PRESETS = [
  {
    id: 'roboto',
    name: 'Roboto',
    stack: '"Roboto", sans-serif',
  },
  {
    id: 'inter',
    name: 'Inter',
    stack: '"Inter", sans-serif',
    google: `Inter:${UI_GOOGLE_WEIGHTS}`,
  },
  {
    id: 'nunito',
    name: 'Nunito',
    stack: '"Nunito", sans-serif',
    google: `Nunito:${UI_GOOGLE_WEIGHTS}`,
  },
  {
    id: 'atkinson',
    name: 'Atkinson Hyperlegible',
    stack: '"Atkinson Hyperlegible", sans-serif',
    google: 'Atkinson+Hyperlegible:wght@400;700',
  },
  {
    id: 'plex',
    name: 'IBM Plex Sans',
    stack: '"IBM Plex Sans", sans-serif',
    google: `IBM+Plex+Sans:${UI_GOOGLE_WEIGHTS}`,
  },
  {
    id: 'sourceSerif',
    name: 'Source Serif 4',
    stack: '"Source Serif 4", serif',
    google: `Source+Serif+4:${UI_GOOGLE_WEIGHTS}`,
  },
  {
    id: 'system',
    name: 'System',
    stack: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
];

export const FONT_PRESET_IDS = FONT_PRESETS.map((preset) => preset.id);

const PRESET_BY_ID = new Map(FONT_PRESETS.map((preset) => [preset.id, preset]));

const STYLESHEET_ID = 'tuf-font-presets';

export function isFontPresetId(id) {
  return PRESET_BY_ID.has(id);
}

export function getFontPreset(id) {
  return PRESET_BY_ID.get(id) || null;
}

export function getFontPresetStack(id) {
  return (PRESET_BY_ID.get(id) || PRESET_BY_ID.get(DEFAULT_FONT_PRESET_ID)).stack;
}

/** One Google Fonts stylesheet for every preset that declares a `google` spec. */
export function installFontPresetStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLESHEET_ID)) return;
  const families = FONT_PRESETS
    .map((preset) => preset.google)
    .filter(Boolean)
    .map((spec) => `family=${spec}`);
  if (!families.length) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
  document.head.appendChild(link);
}

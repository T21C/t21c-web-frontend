// tuf-search: #clientPreferences #preferences
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { readCachedUser } from '@/utils/authUserCache';

export const CLIENT_PREF_KEYS = {
  HOME_RESOURCES_CTA_DISMISSED: 'home.resourcesCta.dismissed',
  MODS_START_GUIDE_CTA_DISMISSED: 'mods.startGuideCta.dismissed',
  TUFHELPERLITE_NEVER_SHOW: 'tufhelperlite.neverShow',
  INBOX_PUSH_NUDGE_DISMISSED: 'inbox.pushNudge.dismissed',
  SUBMISSIONS_CDN_TOS_AGREED: 'submissions.cdnTos.agreed',
  SUBMISSIONS_PASS_RULES_READ: 'submissions.passRules.read',
  APP_LANGUAGE: 'appLanguage',
  NAV_DROPDOWN_CLICK_MODE: 'navigation.dropdownClickMode',
  SUBMISSION_MINIMAL_MOTION: 'submission.minimalMotion',
  SUBMISSION_DISABLE_MASCOTS: 'submission.disableMascots',
  DISPLAY_HIDDEN_LEVEL_CARD_TAG_IDS: 'display.hiddenLevelCardTagIds',
};

export const GUEST_COOKIE_KEYS = [
  CLIENT_PREF_KEYS.HOME_RESOURCES_CTA_DISMISSED,
  CLIENT_PREF_KEYS.MODS_START_GUIDE_CTA_DISMISSED,
  CLIENT_PREF_KEYS.TUFHELPERLITE_NEVER_SHOW,
  CLIENT_PREF_KEYS.APP_LANGUAGE,
];

export const STICKY_TRUE_KEYS = new Set([
  CLIENT_PREF_KEYS.HOME_RESOURCES_CTA_DISMISSED,
  CLIENT_PREF_KEYS.MODS_START_GUIDE_CTA_DISMISSED,
  CLIENT_PREF_KEYS.INBOX_PUSH_NUDGE_DISMISSED,
  CLIENT_PREF_KEYS.SUBMISSIONS_CDN_TOS_AGREED,
  CLIENT_PREF_KEYS.SUBMISSIONS_PASS_RULES_READ,
]);

export const CLIENT_PREFERENCES_CHANGE_EVENT = 'tuf:client-preferences-change';

const COOKIE_NAME = 'tuf.clientPrefs';
const LEGACY_MIGRATED_KEY = 'tuf.clientPrefs.legacyMigrated';
const EMPTY_TAGS = [];
const ALLOWED_KEYS = new Set(Object.values(CLIENT_PREF_KEYS));

const NAV_CLICK_MODES = new Set(['cycle', 'pin']);

let memory = {};
let hiddenTagsCache = EMPTY_TAGS;
let loggedIn = false;
let mergedUserId = null;
let accountSyncListener = null;
let tufHelperLiteNeverShowListener = null;
let patchChain = Promise.resolve();

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function localGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key, value) {
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

function parseCookieObject() {
  if (typeof document === 'undefined') return {};
  const prefix = `${COOKIE_NAME}=`;
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  if (!match) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(match.slice(prefix.length)));
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function writeGuestCookie(source) {
  if (typeof document === 'undefined') return;
  const guest = {};
  for (const key of GUEST_COOKIE_KEYS) {
    if (source[key] !== undefined) guest[key] = source[key];
  }
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(guest))}`,
    'Path=/',
    'Max-Age=31536000',
    'SameSite=Lax',
  ];
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    parts.push('Secure');
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host === 'tuforums.com' || host.endsWith('.tuforums.com')) {
    parts.push('Domain=.tuforums.com');
  }
  document.cookie = parts.join('; ');
}

function trimGuestCookieAfterUpload(source) {
  if (typeof document === 'undefined') return;
  const guest = {};
  if (typeof source[CLIENT_PREF_KEYS.APP_LANGUAGE] === 'string') {
    guest[CLIENT_PREF_KEYS.APP_LANGUAGE] = source[CLIENT_PREF_KEYS.APP_LANGUAGE];
  }
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(guest))}`,
    'Path=/',
    'Max-Age=31536000',
    'SameSite=Lax',
  ];
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    parts.push('Secure');
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host === 'tuforums.com' || host.endsWith('.tuforums.com')) {
    parts.push('Domain=.tuforums.com');
  }
  document.cookie = parts.join('; ');
}

function readLegacyLocalStorage() {
  const out = {};
  if (localGet('home.resourcesCta.dismissed') === '1') {
    out[CLIENT_PREF_KEYS.HOME_RESOURCES_CTA_DISMISSED] = true;
  }
  if (localGet('tufhelperlite-integration') === 'hidden') {
    out[CLIENT_PREF_KEYS.TUFHELPERLITE_NEVER_SHOW] = true;
  }
  if (localGet('tuf.inboxPushNudge.dismissed') === '1') {
    out[CLIENT_PREF_KEYS.INBOX_PUSH_NUDGE_DISMISSED] = true;
  }
  if (localGet('cdn_tos_agreed') === 'true') {
    out[CLIENT_PREF_KEYS.SUBMISSIONS_CDN_TOS_AGREED] = true;
  }
  if (localGet('hasReadPassRules') === 'true') {
    out[CLIENT_PREF_KEYS.SUBMISSIONS_PASS_RULES_READ] = true;
  }
  const lang = localGet('appLanguage');
  if (lang && lang !== 'us') {
    out[CLIENT_PREF_KEYS.APP_LANGUAGE] = lang;
  } else if (lang === 'us') {
    out[CLIENT_PREF_KEYS.APP_LANGUAGE] = 'en';
  }
  const clickMode = localGet('settings.preferences.navigation.dropdownClickMode');
  if (NAV_CLICK_MODES.has(clickMode)) {
    out[CLIENT_PREF_KEYS.NAV_DROPDOWN_CLICK_MODE] = clickMode;
  }
  const motion = localGet('settings.preferences.submission.minimalMotion');
  const motionLegacy = localGet('settings.accessibility.minimalMotion');
  if (motion === '1' || motion === 'true' || motionLegacy === '1' || motionLegacy === 'true') {
    out[CLIENT_PREF_KEYS.SUBMISSION_MINIMAL_MOTION] = true;
  } else if (motion === '0' || motion === 'false') {
    out[CLIENT_PREF_KEYS.SUBMISSION_MINIMAL_MOTION] = false;
  }
  const mascots = localGet('settings.preferences.submission.disableMascots');
  if (mascots === '1' || mascots === 'true') {
    out[CLIENT_PREF_KEYS.SUBMISSION_DISABLE_MASCOTS] = true;
  } else if (mascots === '0' || mascots === 'false') {
    out[CLIENT_PREF_KEYS.SUBMISSION_DISABLE_MASCOTS] = false;
  }
  const tagsRaw = localGet('settings.preferences.display.hiddenLevelCardTagIds');
  if (tagsRaw) {
    try {
      const parsed = JSON.parse(tagsRaw);
      if (Array.isArray(parsed)) {
        const ids = [...new Set(parsed.map((id) => Number(id)).filter((id) => Number.isFinite(id)))];
        out[CLIENT_PREF_KEYS.DISPLAY_HIDDEN_LEVEL_CARD_TAG_IDS] = ids;
      }
    } catch {
      /* ignore */
    }
  }
  return out;
}

function pickKnownPrefs(obj) {
  const out = {};
  if (!isPlainObject(obj)) return out;
  for (const [key, value] of Object.entries(obj)) {
    if (ALLOWED_KEYS.has(key)) out[key] = value;
  }
  return out;
}

function mergePrefs(existing, patch) {
  const next = { ...existing };
  for (const [key, value] of Object.entries(patch || {})) {
    if (STICKY_TRUE_KEYS.has(key)) {
      if (value === true) next[key] = true;
      continue;
    }
    next[key] = value;
  }
  for (const key of STICKY_TRUE_KEYS) {
    if (existing[key] === true) next[key] = true;
  }
  return next;
}

function cacheHiddenTags(ids) {
  const next = Array.isArray(ids) ? ids : EMPTY_TAGS;
  if (
    next.length === hiddenTagsCache.length
    && next.every((id, i) => id === hiddenTagsCache[i])
  ) {
    return hiddenTagsCache;
  }
  hiddenTagsCache = next.length ? next : EMPTY_TAGS;
  return hiddenTagsCache;
}

function notify() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CLIENT_PREFERENCES_CHANGE_EVENT));
  const neverShow = memory[CLIENT_PREF_KEYS.TUFHELPERLITE_NEVER_SHOW] === true;
  tufHelperLiteNeverShowListener?.(neverShow);
}

function mirrorLanguageCache(lang) {
  if (typeof lang === 'string' && lang) localSet('appLanguage', lang);
}

function applyMemory(next, { writeCookie = true } = {}) {
  memory = next;
  cacheHiddenTags(memory[CLIENT_PREF_KEYS.DISPLAY_HIDDEN_LEVEL_CARD_TAG_IDS]);
  if (writeCookie) writeGuestCookie(memory);
  mirrorLanguageCache(memory[CLIENT_PREF_KEYS.APP_LANGUAGE]);
  notify();
}

function enqueuePatch(partial) {
  if (!loggedIn) return;
  const body = pickKnownPrefs(partial);
  if (!Object.keys(body).length) return;
  patchChain = patchChain
    .then(async () => {
      const { data } = await api.patch(routes.preferencesV3.me(), body);
      const serverPrefs = data?.clientPreferences;
      if (isPlainObject(serverPrefs)) {
        applyMemory(mergePrefs(memory, serverPrefs), { writeCookie: true });
        accountSyncListener?.(memory);
      }
    })
    .catch(() => {
      /* keep optimistic memory */
    });
}

export function getClientPreferencesSnapshot() {
  return memory;
}

export function getClientPreference(key, fallback) {
  if (key === CLIENT_PREF_KEYS.DISPLAY_HIDDEN_LEVEL_CARD_TAG_IDS) {
    return cacheHiddenTags(memory[key]);
  }
  if (Object.prototype.hasOwnProperty.call(memory, key)) return memory[key];
  return fallback;
}

export function subscribeClientPreferences(onStoreChange) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CLIENT_PREFERENCES_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(CLIENT_PREFERENCES_CHANGE_EVENT, onStoreChange);
}

export function setClientPreferences(partial) {
  if (!isPlainObject(partial) || !Object.keys(partial).length) return;
  applyMemory(mergePrefs(memory, partial));
  enqueuePatch(partial);
}

export function setAccountPreferencesListener(listener) {
  accountSyncListener = listener;
}

export function setTufHelperLiteNeverShowListener(listener) {
  tufHelperLiteNeverShowListener = listener;
}

/** Cookie (then localStorage) language for i18n boot. Missing key is not `en`. */
export function readBootLanguage() {
  const cookie = parseCookieObject();
  if (typeof cookie[CLIENT_PREF_KEYS.APP_LANGUAGE] === 'string') {
    return cookie[CLIENT_PREF_KEYS.APP_LANGUAGE];
  }
  return localGet('appLanguage');
}

export function persistAppLanguage(lang) {
  setClientPreferences({ [CLIENT_PREF_KEYS.APP_LANGUAGE]: lang });
}

export function readBootTufHelperLiteNeverShow() {
  const cookie = parseCookieObject();
  if (cookie[CLIENT_PREF_KEYS.TUFHELPERLITE_NEVER_SHOW] === true) return true;
  return localGet('tufhelperlite-integration') === 'hidden';
}

/**
 * Called when auth user appears/disappears. Uploads cookie + legacy prefs once per user.
 */
export async function syncClientPreferencesWithUser(user) {
  if (!user?.id) {
    loggedIn = false;
    mergedUserId = null;
    return;
  }

  loggedIn = true;
  if (mergedUserId === user.id) return;
  mergedUserId = user.id;

  const accountPrefs = isPlainObject(user.clientPreferences) ? user.clientPreferences : {};
  applyMemory(mergePrefs(memory, accountPrefs), { writeCookie: true });

  const cookie = parseCookieObject();
  const legacyFlag = localGet(LEGACY_MIGRATED_KEY);
  let toUpload = pickKnownPrefs(cookie);
  if (legacyFlag !== 'uploaded') {
    toUpload = pickKnownPrefs(mergePrefs(readLegacyLocalStorage(), toUpload));
  }
  if (Object.keys(toUpload).length) {
    try {
      const { data } = await api.patch(routes.preferencesV3.me(), toUpload);
      const serverPrefs = data?.clientPreferences;
      if (isPlainObject(serverPrefs)) {
        applyMemory(mergePrefs(memory, serverPrefs), { writeCookie: false });
        trimGuestCookieAfterUpload(memory);
        localSet(LEGACY_MIGRATED_KEY, 'uploaded');
        accountSyncListener?.(memory);
        return;
      }
    } catch {
      /* keep local merge */
    }
  }
  trimGuestCookieAfterUpload(memory);
  accountSyncListener?.(memory);
}

function initMemory() {
  if (typeof window === 'undefined') return;
  let next = {};
  next = mergePrefs(next, parseCookieObject());
  const legacyFlag = localGet(LEGACY_MIGRATED_KEY);
  if (legacyFlag !== '1' && legacyFlag !== 'uploaded') {
    next = mergePrefs(next, readLegacyLocalStorage());
    localSet(LEGACY_MIGRATED_KEY, '1');
  }
  const cached = readCachedUser();
  if (cached?.id) loggedIn = true;
  if (isPlainObject(cached?.clientPreferences)) {
    next = mergePrefs(next, cached.clientPreferences);
  }
  applyMemory(next);
}

initMemory();

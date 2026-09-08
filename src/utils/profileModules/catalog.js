export const PROFILE_MODULE_VERSION = 1;

/** Last-resort fallbacks if the auth profile has not loaded caps yet. Prefer `profileModulesCapsFromUser`. */
export const PROFILE_MODULES_FREE_CAP = 10;
export const PROFILE_MODULES_STELLAR_CAP = 20;
export const MAX_FAVORITE_ITEMS = 20;
export const MAX_PROFILE_MODULE_ID_LENGTH = 64;

export const FAVORITE_ITEM_KINDS = ["pass", "level", "pack", "player"];

export const PLAYER_STOCK_MODULE_TYPES = [
  "bio",
  "tournaments",
  "scoreBreakdown",
  "difficulty",
  "rankHistory",
  "scores",
];

export const CREATOR_STOCK_MODULE_TYPES = [
  "bio",
  "tournaments",
  "difficulty",
  "charts",
];

export const EXTRA_PROFILE_MODULE_TYPES = ["favorite"];

export const PLAYER_MODULE_TYPES = [...PLAYER_STOCK_MODULE_TYPES, ...EXTRA_PROFILE_MODULE_TYPES];
export const CREATOR_MODULE_TYPES = [...CREATOR_STOCK_MODULE_TYPES, ...EXTRA_PROFILE_MODULE_TYPES];

const PLAYER_TYPE_SET = new Set(PLAYER_MODULE_TYPES);
const CREATOR_TYPE_SET = new Set(CREATOR_MODULE_TYPES);

export function moduleTypesForKind(kind) {
  return kind === "player" ? PLAYER_MODULE_TYPES : CREATOR_MODULE_TYPES;
}

export function stockModuleTypesForKind(kind) {
  return kind === "player" ? PLAYER_STOCK_MODULE_TYPES : CREATOR_STOCK_MODULE_TYPES;
}

export const PLAYER_REQUIRED_MODULE_TYPES = ["scores"];
export const CREATOR_REQUIRED_MODULE_TYPES = ["charts"];

export function requiredModuleTypesForKind(kind) {
  return kind === "player" ? PLAYER_REQUIRED_MODULE_TYPES : CREATOR_REQUIRED_MODULE_TYPES;
}

export function isRequiredModuleType(kind, type) {
  return requiredModuleTypesForKind(kind).includes(type);
}

/** i18n keys: kind-specific label first, then the shared type name. */
export function profileModuleTypeLabelKeys(kind, type) {
  return [`profile.modules.types.${kind}.${type}`, `profile.modules.types.${type}`];
}

export function isModuleTypeForKind(kind, type) {
  return kind === "player" ? PLAYER_TYPE_SET.has(type) : CREATOR_TYPE_SET.has(type);
}

/**
 * @param {unknown} raw
 * @param {number} fallback
 */
function readPositiveInt(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/**
 * Mirrors server `profileModulesFreeCap` / `profileModulesStellarCap` /
 * `profileModulesMaxFavoriteItems` on the auth user (same pattern as `tufStellarEnabled`).
 * @param {{
 *   profileModulesFreeCap?: unknown,
 *   profileModulesStellarCap?: unknown,
 *   profileModulesMaxFavoriteItems?: unknown,
 * } | null | undefined} user
 */
export function profileModulesCapsFromUser(user) {
  return {
    freeCap: readPositiveInt(user?.profileModulesFreeCap, PROFILE_MODULES_FREE_CAP),
    stellarCap: readPositiveInt(user?.profileModulesStellarCap, PROFILE_MODULES_STELLAR_CAP),
    maxFavoriteItems: readPositiveInt(user?.profileModulesMaxFavoriteItems, MAX_FAVORITE_ITEMS),
  };
}

/**
 * @param {boolean} stellarActive
 * @param {{ profileModulesFreeCap?: unknown, profileModulesStellarCap?: unknown } | null | undefined} [user]
 */
export function profileModulesCap(stellarActive, user) {
  const caps = profileModulesCapsFromUser(user);
  return stellarActive ? caps.stellarCap : caps.freeCap;
}

export function stockModuleId(type) {
  return `stock-${type}`;
}

export function createProfileModuleId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mod-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

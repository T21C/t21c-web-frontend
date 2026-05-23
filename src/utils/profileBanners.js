// tuf-search: #profileBanners
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { DEFAULT_PROFILE_BANNER_PRESET_PATH } from "@/config/constants/bannerPresets";
import {
  parseProfileHeaderSurfaceImageAssets,
  parseProfileHeaderSurfaceStyle,
} from "@/utils/profileHeaderSurfaceStyle";

function isHttpLikeUrl(value) {
  if (typeof value !== "string") return false;
  const t = value.trim();
  return /^https?:\/\//i.test(t);
}

function envBool(value, fallback) {
  if (typeof value !== "string") return fallback;
  const s = value.trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes" || s === "on") return true;
  if (s === "0" || s === "false" || s === "no" || s === "off") return false;
  return fallback;
}

export function customProfileBannersEnabled() {
  return envBool(import.meta.env.VITE_CUSTOM_PROFILE_BANNERS_ENABLED, true);
}

/**
 * Absolute URL for a file under `public/` (respects Vite `import.meta.env.BASE_URL`).
 * @param {string} pathFromPublicRoot e.g. `banners/abstract/1.jpg`
 */
export function publicAssetUrl(pathFromPublicRoot) {
  const seg = String(pathFromPublicRoot || "").replace(/^\/+/, "");
  const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  if (!base || base === "/") {
    return `/${seg}`.replace(/([^:]\/)\/+/g, "$1");
  }
  return `${base}/${seg}`.replace(/([^:]\/)\/+/g, "$1");
}

/**
 * Turn stored preset path into a public URL.
 * @param {string | null | undefined} preset
 */
export function presetPathToUrl(preset) {
  const raw = typeof preset === "string" && preset.trim() ? preset.trim() : DEFAULT_PROFILE_BANNER_PRESET_PATH;
  const noLead = raw.replace(/^\/+/, "");
  return publicAssetUrl(noLead);
}

/**
 * Auth session user merged with profile payload user so Stellar expiry is available in settings
 * even when `/v2/auth/profile/me` has not been refreshed after purchase.
 * @param {object | null | undefined} authUser
 * @param {object | null | undefined} profileUser
 */
export function resolveStellarEntitlementSubject(authUser, profileUser) {
  if (!authUser && !profileUser) return null;
  return {
    ...(profileUser && typeof profileUser === "object" ? profileUser : {}),
    ...(authUser && typeof authUser === "object" ? authUser : {}),
    tufStellarSubscriptionExpiresAt:
      authUser?.tufStellarSubscriptionExpiresAt ??
      profileUser?.tufStellarSubscriptionExpiresAt ??
      null,
    permissionFlags: authUser?.permissionFlags ?? profileUser?.permissionFlags ?? 0,
  };
}

/**
 * Active TUFStellar access (purchase-funded expiry on user / ES docs as `tufStellarSubscriptionExpiresAt`).
 * @param {{ tufStellarSubscriptionExpiresAt?: string | null } | null | undefined} subjectUser
 */
export function isTufStellarAccessActive(subjectUser) {
  const raw = subjectUser?.tufStellarSubscriptionExpiresAt;
  if (raw == null || raw === "") return false;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/** @param {unknown} raw @returns {"1" | "2" | "3"} */
export function normalizeTufStellarIconVariant(raw) {
  const s = raw == null ? "" : String(raw).trim();
  if (s === "2" || s === "3") return s;
  return "1";
}

/**
 * Profile subject may render custom CDN banner when entitled.
 * @param {{ permissionFlags?: string | number | bigint; tufStellarSubscriptionExpiresAt?: string | null } | null | undefined} subjectUser
 */
export function subjectHasCustomBannerEntitlement(subjectUser) {
  if (!subjectUser) return false;
  return (
    isTufStellarAccessActive(subjectUser)
  );
}

/**
 * Resolve the image URL shown in ProfileHeader.
 * @param {{
 *   bannerPreset?: string | null,
 *   customBannerUrl?: string | null,
 *   subjectUser?: { permissionFlags?: string | number | bigint } | null,
 * }} args
 */
export function getEffectiveProfileBannerUrl({ bannerPreset, customBannerUrl, subjectUser }) {
  const custom = typeof customBannerUrl === "string" && customBannerUrl.trim() ? customBannerUrl.trim() : null;
  if (
    customProfileBannersEnabled() &&
    custom &&
    isHttpLikeUrl(custom) &&
    subjectHasCustomBannerEntitlement(subjectUser)
  ) {
    return custom;
  }
  return presetPathToUrl(bannerPreset);
}

export function getDefaultProfileBannerUrl() {
  return presetPathToUrl(DEFAULT_PROFILE_BANNER_PRESET_PATH);
}

/**
 * Whether the viewer may see custom header surface (gradients + CDN image).
 * @param {{ permissionFlags?: string | number | bigint; tufStellarSubscriptionExpiresAt?: string | null } | null | undefined} subjectUser
 */
export function subjectHasHeaderSurfaceEntitlement(subjectUser) {
  return subjectHasCustomBannerEntitlement(subjectUser);
}

/**
 * Resolve header surface style + per-layer image assets for ProfileHeader card shell.
 * @param {{
 *   profileHeaderSurfaceStyle?: object | null,
 *   profileHeaderSurfaceImageAssets?: object | null,
 *   subjectUser?: { permissionFlags?: string | number | bigint; tufStellarSubscriptionExpiresAt?: string | null } | null,
 * }} args
 */
export function getEffectiveProfileHeaderSurface({
  profileHeaderSurfaceStyle,
  profileHeaderSurfaceImageAssets,
  subjectUser,
}) {
  if (!subjectHasHeaderSurfaceEntitlement(subjectUser)) {
    return { style: null, imageAssets: {} };
  }
  const rawStyle =
    profileHeaderSurfaceStyle &&
    typeof profileHeaderSurfaceStyle === "object" &&
    !Array.isArray(profileHeaderSurfaceStyle)
      ? profileHeaderSurfaceStyle
      : null;

  const style = rawStyle ? parseProfileHeaderSurfaceStyle(rawStyle) : null;
  const parsedAssets = parseProfileHeaderSurfaceImageAssets(profileHeaderSurfaceImageAssets);

  const imageAssets = {};
  for (const [layerId, row] of Object.entries(parsedAssets)) {
    if (row?.url && isHttpLikeUrl(row.url)) {
      imageAssets[layerId] = row;
    }
  }

  return { style, imageAssets };
}

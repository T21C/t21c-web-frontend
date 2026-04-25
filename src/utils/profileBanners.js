import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { DEFAULT_PROFILE_BANNER_PRESET_PATH } from "@/constants/bannerPresets";

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
 * Profile subject may render custom CDN banner when entitled.
 * @param {{ permissionFlags?: string | number | bigint } | null | undefined} subjectUser
 */
export function subjectHasCustomBannerEntitlement(subjectUser) {
  if (!subjectUser) return false;
  return (
    hasFlag(subjectUser, permissionFlags.CUSTOM_PROFILE_BANNER) ||
    hasFlag(subjectUser, permissionFlags.SUPER_ADMIN)
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

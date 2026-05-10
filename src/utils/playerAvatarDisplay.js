// tuf-search: #playerAvatarDisplay #TUFStellar #avatar
/**
 * Profile CDN avatars (players/creators/auth users — not artist entities).
 * Use {@link userAvatarDisplayUrl} for a single `src` string, or {@link userAvatarUrls} with `<UserAvatar {...userAvatarUrls(subject)} />`.
 */
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { isTufStellarAccessActive } from "@/utils/profileBanners";

/**
 * Whether the subject may show animated GIF avatar URLs (CDN `*_animated` segments).
 * @param {{ permissionFlags?: string | number | bigint; tufStellarSubscriptionExpiresAt?: string | null } | null | undefined} subjectUser
 */
export function tufStellarAccessAllowsAnimatedProfileAvatar(subjectUser) {
  if (!subjectUser) return false;
  if (hasFlag(subjectUser, permissionFlags.SUPER_ADMIN)) return true;
  return isTufStellarAccessActive(subjectUser);
}

/**
 * Swap CDN profile path `…_animated` ➔ `…_static` (JPEG) when the subject cannot use animation.
 * @param {string | null | undefined} url
 */
export function swapProfileAvatarAnimatedToStatic(url) {
  if (typeof url !== "string" || !url.trim()) return url ?? null;
  if (url.includes("_animated")) return url.replace(/_animated/g, "_static");
  return url.replace(/\/original(?=$|[?#])/, "/original_static");
}

function resolveCdnAvatarForIdentity(subjectUser, avatarUrl) {
  const u = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
  if (!u) return null;
  if (!subjectUser?.avatarIsGif) return u;
  if (tufStellarAccessAllowsAnimatedProfileAvatar(subjectUser)) return u;
  return swapProfileAvatarAnimatedToStatic(u);
}

function trimStr(v) {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function pickCdnAvatarUrl(subject) {
  return trimStr(subject?.avatarUrl) || trimStr(subject?.user?.avatarUrl);
}

function pickPfpUrl(subject) {
  return (
    trimStr(subject?.pfp) ||
    trimStr(subject?.user?.pfp) ||
    trimStr(subject?.player?.pfp)
  );
}

function profileIdentity(subject) {
  if (subject?.user != null && typeof subject.user === "object") return subject.user;
  return subject;
}

/**
 * Resolved URLs for {@link UserAvatar}: CDN (with GIF / access swap) as primary, Discord `pfp` as load fallback when CDN exists.
 * @param {object | null | undefined} subject — auth `user`, ES player/creator doc, `pass.player`, `pack.packOwner`, etc.
 * @returns {{ primaryUrl: string | null, fallbackUrl: string | null }}
 */
export function userAvatarUrls(subject) {
  if (!subject || typeof subject !== "object") {
    return { primaryUrl: null, fallbackUrl: null };
  }
  const identity = profileIdentity(subject);
  const cdn = pickCdnAvatarUrl(subject);
  const pfp = pickPfpUrl(subject);
  if (cdn) {
    const swapped = resolveCdnAvatarForIdentity(identity, cdn) || cdn;
    return { primaryUrl: swapped, fallbackUrl: pfp };
  }
  return { primaryUrl: pfp, fallbackUrl: null };
}

/**
 * Single string for `src` / meta image: same resolution as {@link userAvatarUrls}, preferring CDN then `pfp`.
 * @param {object | null | undefined} subject
 * @returns {string | null}
 */
export function userAvatarDisplayUrl(subject) {
  const { primaryUrl, fallbackUrl } = userAvatarUrls(subject);
  return primaryUrl || fallbackUrl || null;
}

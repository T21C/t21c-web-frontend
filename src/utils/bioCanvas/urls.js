import { z } from "zod";

export const MAX_URL_LENGTH = 2048;

const DANGEROUS_URL =
  /^(javascript|data|vbscript):|[\x00-\x1f]|url\s*\(|expression\s*\(|@import|<\/|<>/i;

/** Parse and normalize http/https URLs; reject dangerous schemes. */
export function parseSafeUrl(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.length || trimmed.length > MAX_URL_LENGTH) return null;
  if (DANGEROUS_URL.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

export const zSafeUrl = z
  .string()
  .max(MAX_URL_LENGTH)
  .transform((value, ctx) => {
    const parsed = parseSafeUrl(value);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: "Invalid URL" });
      return z.NEVER;
    }
    return parsed;
  });

/** Full decoded URL for confirm-follow UI. */
export function formatUrlForDisplay(url) {
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
}

/** Hostname emphasized in confirm modal. */
export function getUrlHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

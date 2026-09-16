// tuf-search: #oauthScopes
/**
 * OAuth AS scope bit flags — mirror server `oauthScopes.ts` / Discord-style permissions.
 * Compare with `(bits & flag) === flag`. Wire as decimal strings.
 */

export const oauthScopeFlags = {
  USER_READ_PUBLIC: 1n << 0n,
  /** Reserved — not grantable in v1 */
  USER_READ_EMAIL: 1n << 1n,
  USER_SUBMISSION_CREATE: 1n << 16n,
};

/** Self-service app registration remains limited to public profile. */
export const V1_GRANTABLE_MASK = oauthScopeFlags.USER_READ_PUBLIC;

export const V1_GRANTABLE_MASK_STRING = V1_GRANTABLE_MASK.toString();

/** Scopes that consent can display after server authorization. */
export const CONSENT_SCOPE_MASK = V1_GRANTABLE_MASK | oauthScopeFlags.USER_SUBMISSION_CREATE;

export const OAUTH_SCOPE_EXPAND_DISCORD_URL = 'https://discord.gg/AjyAVbqaxf';

/**
 * @param {string | number | bigint | null | undefined} raw
 * @returns {bigint}
 */
export function parseScopeBits(raw) {
  if (raw == null || raw === '') return 0n;
  if (typeof raw === 'bigint') return raw;
  try {
    return BigInt(String(raw));
  } catch {
    return 0n;
  }
}

/**
 * @param {bigint} bits
 * @param {bigint} flag
 */
export function hasOAuthScope(bits, flag) {
  return (bits & flag) === flag;
}

/**
 * Known flags present in `bits` (includes reserved — filter with grantable mask for UI lists).
 * @param {bigint} bits
 * @returns {{ flag: bigint, key: string }[]}
 */
export function listOAuthScopeFlags(bits) {
  return Object.entries(oauthScopeFlags)
    .filter(([, flag]) => hasOAuthScope(bits, flag))
    .map(([key, flag]) => ({ key, flag }));
}

/**
 * Displayable authorized flags, including official auto-submission access.
 * @param {bigint} bits
 */
export function listGrantableOAuthScopeFlags(bits) {
  return listOAuthScopeFlags(bits & CONSENT_SCOPE_MASK);
}

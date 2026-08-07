/** Human-readable OAuth scope copy for developer portal + consent (keyed by bit flag). */
import { oauthScopeFlags, listGrantableOAuthScopeFlags, parseScopeBits } from '@/utils/oauthScopes';

export const OAUTH_SCOPE_CATALOG = {
  [oauthScopeFlags.USER_READ_PUBLIC.toString()]: {
    key: 'USER_READ_PUBLIC',
    label: 'Public profile',
    description: 'Username, player id, nickname, and avatar.',
  },
  [oauthScopeFlags.USER_READ_EMAIL.toString()]: {
    key: 'USER_READ_EMAIL',
    label: 'Email address',
    description: 'Verified email on the account (only if granted).',
  },
  [oauthScopeFlags.USER_SUBMISSION_CREATE.toString()]: {
    key: 'USER_SUBMISSION_CREATE',
    label: 'Create submissions',
    description: 'Reserved — not available yet.',
  },
};

/**
 * @param {bigint | string | number} flagOrBitsEntry
 */
export function describeScopeFlag(flagOrBitsEntry) {
  const flag = typeof flagOrBitsEntry === 'bigint' ? flagOrBitsEntry : parseScopeBits(flagOrBitsEntry);
  const meta = OAUTH_SCOPE_CATALOG[flag.toString()];
  if (meta) return meta;
  return {
    key: flag.toString(),
    label: flag.toString(),
    description: flag.toString(),
  };
}

/**
 * Consent / hub: human rows for grantable bits in a bitfield.
 * @param {string | number | bigint | null | undefined} scopeBits
 */
export function describeGrantableScopes(scopeBits) {
  return listGrantableOAuthScopeFlags(parseScopeBits(scopeBits)).map(({ flag }) =>
    describeScopeFlag(flag),
  );
}

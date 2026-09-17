// tuf-search: #verificationStates
// Keep in lockstep with server/src/models/verificationStates.ts
// (Song and Artist models re-export these as the source of truth).

export const SONG_VERIFICATION_STATES = [
  'declined',
  'pending',
  'conditional',
  'ysmod_only',
  'allowed',
  'tuf_verified',
];

export const ARTIST_VERIFICATION_STATES = [
  'unverified',
  'pending',
  'declined',
  'mostly_declined',
  'mostly_allowed',
  'allowed',
  'ysmod_only',
  'tuf_verified',
];

export function verificationStateSelectOptions(t, states) {
  return states.map((value) => ({
    value,
    label: t(`verification.${value}`, { ns: 'common' }),
  }));
}

export function songVerificationSelectOptions(t, extraLeading = []) {
  return [...extraLeading, ...verificationStateSelectOptions(t, SONG_VERIFICATION_STATES)];
}

export function artistVerificationSelectOptions(t, extraLeading = []) {
  return [...extraLeading, ...verificationStateSelectOptions(t, ARTIST_VERIFICATION_STATES)];
}

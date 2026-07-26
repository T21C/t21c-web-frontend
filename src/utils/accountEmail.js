/** True when the account has a non-empty verified email on file. */
export const hasAccountEmail = (user) => Boolean(user?.email?.trim());

/** Pending (unverified) email claim, if any. */
export const getPendingEmail = (user) => user?.pendingEmail?.trim() || '';

/** True when the account has a non-empty email on file. */
export const hasAccountEmail = (user) => Boolean(user?.email?.trim());

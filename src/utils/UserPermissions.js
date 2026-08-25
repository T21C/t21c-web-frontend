// tuf-search: #UserPermissions #userPermissions
export const permissionFlags = {
  SUPER_ADMIN: 1n << 62n,        
  RATER: 1n << 61n,              
  BANNED: 1n << 60n,             
  SUBMISSIONS_PAUSED: 1n << 59n, 
  RATING_BANNED: 1n << 58n,
  TAG_VOTE_BANNED: 1n << 57n, 
  HEAD_CURATOR: 1n << 32n,       
  CURATOR: 1n << 31n,
  EMAIL_VERIFIED: 1n << 0n,
};

const toPermissionFlags = (userOrFlags) => {
  if (userOrFlags == null) return 0n;

  // Raw flag value (string | number | bigint)
  if (typeof userOrFlags !== 'object') {
    return BigInt(userOrFlags || 0);
  }

  // permissionFlags is the sole source of truth when present on a user-like object.
  // Partial API payloads (e.g. assign-creator) may omit it — treat as 0, not throw.
  if ('permissionFlags' in userOrFlags) {
    return BigInt(userOrFlags.permissionFlags ?? 0);
  }

  return 0n;
};

export const hasFlag = (user, permission) => {
  if (!user || permission == null) return false;
  return (toPermissionFlags(user) & BigInt(permission)) === BigInt(permission);
};

export const hasAnyFlag = (user, permissions) => {
  if (!user) return false;
  return permissions.some(permission => hasFlag(user, permission));
};

export const setUserPermission = (user, permission, value) => {
  if (!user) return user;
  const current = toPermissionFlags(user);
  const perm = BigInt(permission);
  const newFlags = value ? current | perm : current & ~perm;
  return {
    ...user,
    permissionFlags: newFlags.toString(),
  };
};

export const isBanExpired = (bannedUntil) => {
  if (!bannedUntil) return false;
  const ms = new Date(bannedUntil).getTime();
  return !Number.isNaN(ms) && ms <= Date.now();
};

/** True while the BANNED permission is set and any timed expiry has not passed. */
export const isUserBanned = (user) => {
  if (!hasFlag(user, permissionFlags.BANNED)) return false;
  return !isBanExpired(user?.player?.bannedUntil);
};
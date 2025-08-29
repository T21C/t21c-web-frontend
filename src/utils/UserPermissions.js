export const permissionFlags = {
  SUPER_ADMIN: 1n << 62n,        
  RATER: 1n << 61n,              
  BANNED: 1n << 60n,             
  SUBMISSIONS_PAUSED: 1n << 59n, 
  RATING_BANNED: 1n << 58n,      
  HEAD_CURATOR: 1n << 32n,       
  CURATOR: 1n << 31n,            
  EMAIL_VERIFIED: 1n << 0n,      
};

export const hasFlag = (user, permission) => {
  if (!user) return false;
  return (BigInt(user.permissionFlags) & BigInt(permission)) === BigInt(permission);
};

export const hasAnyFlag = (user, permissions) => {
  if (!user) return false;
  return permissions.some(permission => hasFlag(user, permission));
};
// tuf-search: #superAdminProofActor
let actor = null;

/**
 * @param {{ id: string, username?: string } | null} next
 */
export function setSuperAdminProofActor(next) {
  if (next && typeof next.id === 'string' && next.id.length > 0) {
    actor = {
      id: next.id,
      username: typeof next.username === 'string' ? next.username : '',
    };
    return;
  }
  actor = null;
}

export function getSuperAdminProofActor() {
  return actor;
}

export function clearSuperAdminProofActor() {
  actor = null;
}

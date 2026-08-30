// tuf-search: #modPeople

export function dumpCreatorLabel(mod) {
  const username = mod?.creatorUsername || '';
  const snowflake = mod?.creatorDiscordId || '';
  if (username && snowflake) return `${username} @${snowflake}`;
  return username || snowflake;
}

export function hasAssignees(mod) {
  return (mod?.assignees || []).length > 0;
}

export function isAssignedToMod(mod, userId) {
  if (!userId) return false;
  return (mod?.assignees || []).some((person) => person?.userId === userId);
}

export function assignedPeople(mod) {
  const assignees = (mod?.assignees || []).filter((person) => person?.userId);
  const posted = mod?.postedBy;
  if (!posted?.userId) return assignees;
  return [posted, ...assignees.filter((person) => person.userId !== posted.userId)];
}

export function otherAssignees(mod) {
  const postedUserId = mod?.postedBy?.userId;
  return (mod?.assignees || []).filter((person) => person?.userId && person.userId !== postedUserId);
}

export function listCreatorText(mod) {
  if (!hasAssignees(mod)) return dumpCreatorLabel(mod);
  return assignedPeople(mod)
    .map((person) => person?.name)
    .filter(Boolean)
    .join(', ');
}

export function creatorSortKey(mod) {
  if (hasAssignees(mod)) {
    return assignedPeople(mod)[0]?.name || '';
  }
  return mod?.creatorUsername || '';
}

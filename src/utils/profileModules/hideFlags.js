const PACK_VIEW_LINKONLY = 2;
const PACK_VIEW_PRIVATE = 3;
const PACK_VIEW_FORCED_PRIVATE = 4;

export function isFavoritePassHidden(pass) {
  if (!pass) return true;
  if (pass.isDeleted || pass.isHidden) return true;
  if (!pass.level || pass.level.isDeleted || pass.level.isHidden) return true;
  if (pass.player?.isBanned) return true;
  return false;
}

export function isFavoriteLevelHidden(level) {
  if (!level) return true;
  return Boolean(level.isDeleted || level.isHidden);
}

export function isFavoritePackHidden(pack) {
  if (!pack) return true;
  const mode = Number(pack.viewMode);
  return (
    mode === PACK_VIEW_LINKONLY ||
    mode === PACK_VIEW_PRIVATE ||
    mode === PACK_VIEW_FORCED_PRIVATE
  );
}

export function isFavoritePlayerHidden(player) {
  if (!player) return true;
  return Boolean(player.isBanned);
}

export function isFavoriteCreatorHidden(creator) {
  if (!creator) return true;
  const id = Number(creator.id);
  return !Number.isInteger(id) || id <= 0;
}

export function isFavoriteEntityHidden(kind, entity) {
  if (kind === "pass") return isFavoritePassHidden(entity);
  if (kind === "level") return isFavoriteLevelHidden(entity);
  if (kind === "pack") return isFavoritePackHidden(entity);
  if (kind === "player") return isFavoritePlayerHidden(entity);
  if (kind === "creator") return isFavoriteCreatorHidden(entity);
  return true;
}

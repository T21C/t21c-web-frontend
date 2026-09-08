function firstIdObject(...candidates) {
  for (const row of candidates) {
    if (row && typeof row === "object" && row.id != null) return row;
  }
  return null;
}

export function unwrapFavoriteLevel(data) {
  return firstIdObject(data?.level, data);
}

export function unwrapFavoritePass(data) {
  return firstIdObject(data?.results?.[0], data?.pass, data);
}

export function unwrapFavoritePack(data) {
  return firstIdObject(data?.pack, data);
}

export function unwrapFavoritePlayer(data) {
  return firstIdObject(data?.player, data);
}

export function favoriteItemHasEntity(item) {
  if (!item || typeof item !== "object") return false;
  const entity = item[item.kind];
  return Boolean(entity && typeof entity === "object");
}

export function favoriteEntityId(kind, entity) {
  if (!entity || typeof entity !== "object") return null;
  if (kind === "pack") {
    const fromLink =
      typeof entity.linkCode === "string" ? entity.linkCode.trim() : "";
    if (/^[A-Za-z0-9]{1,32}$/.test(fromLink)) return fromLink;
    const fromId = typeof entity.id === "string" ? entity.id.trim() : "";
    if (/^[A-Za-z0-9]{1,32}$/.test(fromId)) return fromId;
    return null;
  }
  const id = Number(entity.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function favoriteItemFromEntity(kind, entity, id = favoriteEntityId(kind, entity)) {
  if (!kind || !entity || typeof entity !== "object" || id == null || id === "") {
    return null;
  }
  if (kind === "pack") {
    const code = String(id).trim();
    if (!/^[A-Za-z0-9]{1,32}$/.test(code)) return null;
    return { kind, id: code, [kind]: entity };
  }
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  return { kind, id: numericId, [kind]: entity };
}

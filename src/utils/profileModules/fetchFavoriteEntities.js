import api from "@/utils/api";
import { routes } from "@/api/routes";
import {
  unwrapFavoriteLevel,
  unwrapFavoritePack,
  unwrapFavoritePass,
  unwrapFavoriteCreator,
  unwrapFavoritePlayer,
} from "./favoriteEntityShape";

export {
  favoriteEntityId,
  favoriteItemFromEntity,
  favoriteItemHasEntity,
  unwrapFavoriteCreator,
  unwrapFavoriteLevel,
  unwrapFavoritePack,
  unwrapFavoritePass,
  unwrapFavoritePlayer,
} from "./favoriteEntityShape";

export async function fetchFavoriteEntity(kind, id, options = {}) {
  const { signal } = options;
  if (kind === "level") {
    const { data } = await api.get(routes.database.levels.byIdQuery(id), { signal });
    return unwrapFavoriteLevel(data);
  }
  if (kind === "pass") {
    const { data } = await api.get(routes.database.passes.byId(id), { signal });
    return unwrapFavoritePass(data);
  }
  if (kind === "pack") {
    const { data } = await api.get(routes.database.levels.packs.byId(id), {
      params: { tree: "false" },
      signal,
    });
    return unwrapFavoritePack(data);
  }
  if (kind === "player") {
    const { data } = await api.get(`${routes.playersV3.root()}/${id}`, { signal });
    return unwrapFavoritePlayer(data);
  }
  if (kind === "creator") {
    const { data } = await api.get(`${routes.creatorsV3.root()}/${id}`, { signal });
    return unwrapFavoriteCreator(data);
  }
  return null;
}

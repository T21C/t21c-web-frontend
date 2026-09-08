import api from "@/utils/api";
import { routes } from "@/api/routes";
import {
  buildIdOrQuery,
  normalizePositiveIds,
  orderByIds,
} from "./featuredEntitySearchQuery";

export { buildIdOrQuery, normalizePositiveIds, orderByIds } from "./featuredEntitySearchQuery";

export async function fetchLevelsByIds(ids, { signal } = {}) {
  const normalized = normalizePositiveIds(ids);
  if (!normalized.length) return [];
  const { data } = await api.get(routes.database.levels.root(), {
    params: {
      query: buildIdOrQuery(normalized),
      limit: normalized.length,
      offset: 0,
      deletedFilter: "hide",
    },
    signal,
  });
  return orderByIds(data?.results ?? [], normalized);
}

export async function fetchPassesByIds(ids, { signal } = {}) {
  const normalized = normalizePositiveIds(ids);
  if (!normalized.length) return [];
  const { data } = await api.get(routes.database.passes.root(), {
    params: {
      query: buildIdOrQuery(normalized),
      limit: normalized.length,
      offset: 0,
      deletedFilter: "hide",
    },
    signal,
  });
  return orderByIds(data?.results ?? [], normalized);
}

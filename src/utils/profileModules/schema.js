import {
  FAVORITE_ITEM_KINDS,
  MAX_FAVORITE_ITEMS,
  MAX_PROFILE_MODULE_ID_LENGTH,
  PROFILE_MODULE_VERSION,
  createProfileModuleId,
  isModuleTypeForKind,
  isRequiredModuleType,
  requiredModuleTypesForKind,
  stockModuleId,
  stockModuleTypesForKind,
} from "./catalog";

const MODULE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STOCK_ID_RE = /^stock-[a-zA-Z0-9_-]+$/;
const PACK_LINK_CODE_RE = /^[A-Za-z0-9]{1,32}$/;

function parseModuleId(raw) {
  if (typeof raw !== "string" || !raw.length || raw.length > MAX_PROFILE_MODULE_ID_LENGTH) {
    return null;
  }
  if (MODULE_ID_RE.test(raw) || STOCK_ID_RE.test(raw) || /^[a-zA-Z0-9_-]+$/.test(raw)) {
    return raw;
  }
  return null;
}

export function parseFavoriteItemId(kind, raw) {
  if (kind === "pack") {
    if (typeof raw !== "string") return null;
    const code = raw.trim();
    if (!PACK_LINK_CODE_RE.test(code)) return null;
    return code;
  }
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function parseFavoriteItems(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const items = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const kind = row.kind;
    if (!FAVORITE_ITEM_KINDS.includes(kind)) continue;
    const id = parseFavoriteItemId(kind, row.id);
    if (id == null) continue;
    const key = `${kind}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ kind, id });
    if (items.length >= MAX_FAVORITE_ITEMS) break;
  }
  return items;
}

function parseModuleConfig(type, raw) {
  const data = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  if (type === "favorite") {
    return { items: parseFavoriteItems(data.items) };
  }
  return {};
}

export function createStockLayout(kind) {
  return {
    version: PROFILE_MODULE_VERSION,
    modules: stockModuleTypesForKind(kind).map((type) => ({
      id: stockModuleId(type),
      type,
      config: {},
    })),
  };
}

function ensureRequiredModules(document, kind) {
  const modules = [...(document?.modules || [])];
  const have = new Set(modules.map((mod) => mod.type));
  for (const type of requiredModuleTypesForKind(kind)) {
    if (have.has(type)) continue;
    modules.push({
      id: stockModuleId(type),
      type,
      config: {},
    });
  }
  return {
    version: PROFILE_MODULE_VERSION,
    modules,
  };
}

export function readStoredProfileModules(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  if (!Array.isArray(raw.modules)) return null;
  const modules = [];
  const types = new Set();
  for (const row of raw.modules) {
    if (!row || typeof row !== "object") continue;
    const id = parseModuleId(row.id);
    const type = typeof row.type === "string" ? row.type.trim() : "";
    if (!id || !type) continue;
    if (types.has(type)) continue;
    types.add(type);
    modules.push({
      id,
      type,
      config: parseModuleConfig(type, row.config),
    });
  }
  return { version: PROFILE_MODULE_VERSION, modules };
}

export function resolveLayout(document, kind) {
  const stored = readStoredProfileModules(document);
  if (!stored) return createStockLayout(kind).modules;
  return ensureRequiredModules(
    {
      version: PROFILE_MODULE_VERSION,
      modules: stored.modules.filter((mod) => isModuleTypeForKind(kind, mod.type)),
    },
    kind,
  ).modules;
}

export function previousModuleCount(stored, kind) {
  const doc = readStoredProfileModules(stored);
  if (!doc) return createStockLayout(kind).modules.length;
  return ensureRequiredModules(
    {
      version: PROFILE_MODULE_VERSION,
      modules: doc.modules.filter((mod) => isModuleTypeForKind(kind, mod.type)),
    },
    kind,
  ).modules.length;
}

export function canAddModule(nextCount, previousCount, cap) {
  if (nextCount <= cap) return true;
  return nextCount <= previousCount;
}

export function cloneModulesDocument(kind, document) {
  const stored = readStoredProfileModules(document);
  if (!stored) return createStockLayout(kind);
  return ensureRequiredModules(
    {
      version: PROFILE_MODULE_VERSION,
      modules: stored.modules
        .filter((mod) => isModuleTypeForKind(kind, mod.type))
        .map((mod) => ({
          id: mod.id,
          type: mod.type,
          config:
            mod.type === "favorite"
              ? { items: [...(mod.config.items || [])] }
              : {},
        })),
    },
    kind,
  );
}

export function addModuleType(document, kind, type) {
  const next = cloneModulesDocument(kind, document);
  if (!isModuleTypeForKind(kind, type)) return next;
  if (next.modules.some((mod) => mod.type === type)) return next;
  next.modules.push({
    id: type === "favorite" ? createProfileModuleId() : stockModuleId(type),
    type,
    config: type === "favorite" ? { items: [] } : {},
  });
  return next;
}

export function removeModuleAt(document, kind, index) {
  const next = cloneModulesDocument(kind, document);
  if (index < 0 || index >= next.modules.length) return next;
  if (isRequiredModuleType(kind, next.modules[index].type)) return next;
  next.modules.splice(index, 1);
  return next;
}

export function reorderModules(document, kind, fromIndex, toIndex) {
  const next = cloneModulesDocument(kind, document);
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= next.modules.length ||
    toIndex >= next.modules.length
  ) {
    return next;
  }
  const [moved] = next.modules.splice(fromIndex, 1);
  next.modules.splice(toIndex, 0, moved);
  return next;
}

export function updateFavoriteItems(document, kind, moduleId, items) {
  const next = cloneModulesDocument(kind, document);
  const mod = next.modules.find((row) => row.id === moduleId && row.type === "favorite");
  if (!mod) return next;
  mod.config = { items: parseFavoriteItems(items) };
  return next;
}

export function documentsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

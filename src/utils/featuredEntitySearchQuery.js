/** Search language: `|` is OR. Prefer `id:` over `#` (client-only single-ID shortcut). */
export function buildIdOrQuery(ids) {
  return ids.map((id) => `id:${id}`).join(" | ");
}

export function orderByIds(rows, ids) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export function normalizePositiveIds(ids) {
  if (!Array.isArray(ids)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of ids) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

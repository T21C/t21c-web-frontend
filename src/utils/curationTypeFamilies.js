// tuf-search: #curationTypeFamilies
/**
 * C / V / O / H name families: one tier per family (highest numeric suffix wins).
 */

const FAMILY_LETTERS = "CVOH";

/**
 * @param {unknown} name
 * @returns {{ letter: string, tier: number } | null}
 */
export function parseCurationFamilyTier(name) {
  const s = String(name ?? "").trim();
  if (!s.length) return null;
  const letter = s[0].toUpperCase();
  if (!FAMILY_LETTERS.includes(letter)) return null;
  const rest = s.slice(1);
  if (rest !== "" && !/^\d+$/.test(rest)) return null;
  const tier = rest === "" ? 0 : parseInt(rest, 10);
  if (!Number.isFinite(tier) || tier < 0) return null;
  return { letter, tier };
}

/**
 * Collapse a selected type-id list so each C/V/O/H family keeps only the highest tier.
 * Existing selection order is preserved (winners replace in place). Misc names stay additive.
 *
 * @param {number[]} selectedIds
 * @param {{ id: number, name?: string }[]} types
 * @returns {number[]}
 */
export function collapseCurationTypeIdsByFamilyTier(selectedIds, types) {
  const byId = new Map((types || []).map((t) => [t.id, t]));
  const refs = [];
  for (const id of selectedIds || []) {
    const t = byId.get(id);
    if (!t) continue;
    refs.push({ id: t.id, name: t.name });
  }

  const bestByFamily = new Map();
  for (const ref of refs) {
    const parsed = parseCurationFamilyTier(ref.name);
    if (!parsed) continue;
    const current = bestByFamily.get(parsed.letter);
    if (!current || parsed.tier > current.tier) {
      bestByFamily.set(parsed.letter, { id: ref.id, tier: parsed.tier });
    }
  }

  const out = [];
  const seen = new Set();
  const emittedFamily = new Set();
  for (const ref of refs) {
    const parsed = parseCurationFamilyTier(ref.name);
    if (!parsed) {
      if (!seen.has(ref.id)) {
        seen.add(ref.id);
        out.push(ref.id);
      }
      continue;
    }
    if (emittedFamily.has(parsed.letter)) continue;
    emittedFamily.add(parsed.letter);
    const winnerId = bestByFamily.get(parsed.letter)?.id ?? ref.id;
    if (seen.has(winnerId)) continue;
    seen.add(winnerId);
    out.push(winnerId);
  }
  return out;
}

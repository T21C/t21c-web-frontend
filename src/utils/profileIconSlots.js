/**
 * Build ProfileHeader `iconSlots` for players (P/G/U + WF-based GQ/UQ) and creators (curation types).
 */

import { selectIconSize } from "@/utils/Utility";

const PGU_REGEX = /^([PGUpgu])(\d{1,2})$/;

/** 1-based n in 1..20 → Q tier 0..4 (four difficulties per bucket). */
export function pguNumberToQTier(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 1 || num > 20) return null;
  return Math.min(Math.floor((num - 1) / 4), 4);
}

function parsePguDifficultyName(name) {
  if (name == null || typeof name !== "string") return null;
  const m = String(name).trim().match(PGU_REGEX);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  if (letter !== "P" && letter !== "G" && letter !== "U") return null;
  const n = parseInt(m[2], 10);
  if (!Number.isFinite(n) || n < 1 || n > 20) return null;
  return { letter, n };
}

function getDifficultyEntry(difficultyDict, diffId) {
  if (diffId == null) return null;
  const d = difficultyDict?.[diffId] ?? difficultyDict?.[String(diffId)];
  return d || null;
}

function difficultyIconUrl(difficultyDict, diffId) {
  const icon = getDifficultyEntry(difficultyDict, diffId)?.icon;
  if (!icon) return undefined;
  try {
    const sized = selectIconSize(icon, "small");
    return sized || icon;
  } catch {
    return icon;
  }
}

function emptyPguSlot(key, label) {
  return {
    key,
    letter: label,
    count: "—",
    badge: 0,
    title: `${label}: no clears`,
  };
}

function emptyQSlot(key, label) {
  return {
    key,
    letter: label,
    count: "—",
    badge: 0,
    title: `${label}: no WF clears in range`,
  };
}

/**
 * Build player PGU + GQ/UQ icon slots from pre-aggregated maps rather than
 * the raw passes array. Moving this off the client-side passes list means
 * the profile page can paginate passes server-side without losing the
 * summary icons.
 *
 * @param {{
 *   clearsByDifficulty?: Record<string, number> | null;
 *   worldsFirstByDifficulty?: Record<string, number> | null;
 * } | null | undefined} aggregates
 * @param {Record<string, { name?: string; icon?: string | null; id?: number | string }>} difficultyDict
 */
export function buildPlayerIconSlots(aggregates, difficultyDict) {
  const dict = difficultyDict && typeof difficultyDict === "object" ? difficultyDict : {};
  const clears = aggregates?.clearsByDifficulty && typeof aggregates.clearsByDifficulty === "object"
    ? aggregates.clearsByDifficulty
    : {};
  const wfs = aggregates?.worldsFirstByDifficulty && typeof aggregates.worldsFirstByDifficulty === "object"
    ? aggregates.worldsFirstByDifficulty
    : {};

  /** @type {Record<"P"|"G"|"U", { maxN: number; clearsAtMax: number; diffId: number | string | null }>} */
  const pguStats = {
    P: { maxN: 0, clearsAtMax: 0, diffId: null },
    G: { maxN: 0, clearsAtMax: 0, diffId: null },
    U: { maxN: 0, clearsAtMax: 0, diffId: null },
  };
  let gqState = { tier: -1, wfCount: 0, maxNInTier: 0, diffId: null };
  let uqState = { tier: -1, wfCount: 0, maxNInTier: 0, diffId: null };

  for (const [diffIdKey, rawCount] of Object.entries(clears)) {
    const count = Number(rawCount) || 0;
    if (count <= 0) continue;
    const name = getDifficultyEntry(dict, diffIdKey)?.name;
    const parsed = parsePguDifficultyName(name);
    if (!parsed) continue;

    const { letter, n } = parsed;
    const st = pguStats[letter];
    if (n > st.maxN) {
      st.maxN = n;
      st.clearsAtMax = count;
      st.diffId = diffIdKey;
    } else if (n === st.maxN) {
      st.clearsAtMax += count;
    }
  }

  for (const [diffIdKey, rawCount] of Object.entries(wfs)) {
    const wfCount = Number(rawCount) || 0;
    if (wfCount <= 0) continue;
    const name = getDifficultyEntry(dict, diffIdKey)?.name;
    const parsed = parsePguDifficultyName(name);
    if (!parsed) continue;

    const { letter, n } = parsed;
    const tier = pguNumberToQTier(n);
    if (tier == null) continue;

    const applyTo = (state) => {
      if (tier > state.tier) {
        return { tier, wfCount, maxNInTier: n, diffId: diffIdKey };
      }
      if (tier === state.tier) {
        const next = { ...state, wfCount: state.wfCount + wfCount };
        if (n > state.maxNInTier) {
          next.maxNInTier = n;
          next.diffId = diffIdKey;
        }
        return next;
      }
      return state;
    };

    if (letter === "G") gqState = applyTo(gqState);
    else if (letter === "U") uqState = applyTo(uqState);
  }

  const pSlot =
    pguStats.P.maxN > 0
      ? {
          key: "p",
          letter: "P",
          diffId: pguStats.P.diffId,
          iconUrl: difficultyIconUrl(dict, pguStats.P.diffId),
          count: String(pguStats.P.maxN),
          badge: pguStats.P.clearsAtMax,
          title: `Top P clear: P${pguStats.P.maxN} (${pguStats.P.clearsAtMax} pass(es) at that difficulty)`,
        }
      : emptyPguSlot("p", "P");

  const gSlot =
    pguStats.G.maxN > 0
      ? {
          key: "g",
          letter: "G",
          diffId: pguStats.G.diffId,
          iconUrl: difficultyIconUrl(dict, pguStats.G.diffId),
          count: String(pguStats.G.maxN),
          badge: pguStats.G.clearsAtMax,
          title: `Top G clear: G${pguStats.G.maxN} (${pguStats.G.clearsAtMax} pass(es) at that difficulty)`,
        }
      : emptyPguSlot("g", "G");

  const uSlot =
    pguStats.U.maxN > 0
      ? {
          key: "u",
          letter: "U",
          diffId: pguStats.U.diffId,
          iconUrl: difficultyIconUrl(dict, pguStats.U.diffId),
          count: String(pguStats.U.maxN),
          badge: pguStats.U.clearsAtMax,
          title: `Top U clear: U${pguStats.U.maxN} (${pguStats.U.clearsAtMax} pass(es) at that difficulty)`,
        }
      : emptyPguSlot("u", "U");

  const gqSlot =
    gqState.tier >= 0
      ? {
          key: "gq",
          letter: "GQ",
          diffId: gqState.diffId,
          iconUrl: difficultyIconUrl(dict, Object.values(dict).filter((d) => d.name.startsWith(`GQ${gqState.tier}`))[0].id),
          count: String(gqState.tier),
          badge: gqState.wfCount,
          title: `Top GQ tier from WF G clears: GQ${gqState.tier} (${gqState.wfCount} WF pass(es) in that tier)`,
        }
      : emptyQSlot("gq", "GQ");

  const uqSlot =
    uqState.tier >= 0
      ? {
          key: "uq",
          letter: "UQ",
          diffId: uqState.diffId,
          iconUrl: difficultyIconUrl(dict, Object.values(dict).filter((d) => d.name.startsWith(`UQ${uqState.tier}`))[0].id),
          count: String(uqState.tier),
          badge: uqState.wfCount,
          title: `Top UQ tier from WF U clears: UQ${uqState.tier} (${uqState.wfCount} WF pass(es) in that tier)`,
        }
      : emptyQSlot("uq", "UQ");

  return [pSlot, gSlot, uSlot, gqSlot, uqSlot];
}

const CREATOR_SLOT_FAMILIES = ["C", "V", "O", "H"];

/** C / V / O / H followed only by digits (e.g. `C0`, `V3`). Anything else is "misc". */
function parseCurationFamilyTier(name) {
  const s = String(name ?? "").trim();
  if (!s.length) return null;
  const letter = s[0].toUpperCase();
  if (!"CVOH".includes(letter)) return null;
  const rest = s.slice(1);
  if (rest !== "" && !/^\d+$/.test(rest)) return null;
  const tier = rest === "" ? 0 : parseInt(rest, 10);
  if (!Number.isFinite(tier) || tier < 0) return null;
  return { letter, tier };
}

function tierDisplayCap(letter) {
  return letter === "H" ? 2 : 3;
}

function iconUrlForCurationType(type) {
  const rawIcon = type?.icon ?? null;
  if (!rawIcon) return undefined;
  try {
    return selectIconSize(rawIcon, "small") || rawIcon;
  } catch {
    return rawIcon;
  }
}

/**
 * Normalize saved display ids: unique positive numeric ids, max 5, order preserved.
 * @param {unknown} displayIds
 * @returns {number[]}
 */
function normalizeDisplayCurationTypeIds(displayIds) {
  if (!Array.isArray(displayIds)) return [];
  const out = [];
  const seen = new Set();
  for (const x of displayIds) {
    const id = Number(x);
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 5) break;
  }
  return out;
}

/**
 * Up to five header slots for creators.
 * When `displayCurationTypeIds` is non-empty, slots match that list in order; each badge is that type's count.
 * Otherwise: C, V, O, H (only when that family has counts), then optional misc — empty families omitted.
 * @param {Record<string, number> | null | undefined} curationTypeCounts
 * @param {Record<number, { id?: number; name?: string; icon?: string | null; color?: string }>} curationTypesDict
 * @param {unknown[] | null | undefined} displayCurationTypeIds — manual header badge order; if empty, use automatic layout
 */
export function buildCreatorIconSlots(curationTypeCounts, curationTypesDict, displayCurationTypeIds) {
  const counts = curationTypeCounts && typeof curationTypeCounts === "object" ? curationTypeCounts : {};
  const dict = curationTypesDict && typeof curationTypesDict === "object" ? curationTypesDict : {};

  const manualIds = normalizeDisplayCurationTypeIds(displayCurationTypeIds);
  if (manualIds.length > 0) {
    const withCounts = manualIds
      .map((typeId) => {
        const cnt = Number(counts[String(typeId)] ?? counts[typeId] ?? 0) || 0;
        return { typeId, cnt };
      })
      .filter((x) => x.cnt > 0);

    return withCounts.map(({ typeId, cnt }, idx) => {
      const type = dict[typeId];
      const name = type?.name ?? `#${typeId}`;
      const shortLetter = name.length <= 3 ? name : name.slice(0, 2);
      const title = `${name} · ${cnt} level(s)`;
      return {
        key: `ct_${typeId}_${idx}`,
        curationTypeId: typeId,
        letter: shortLetter,
        iconUrl: iconUrlForCurationType(type),
        count: "",
        badge: cnt,
        title,
        tooltip: title,
      };
    });
  }

  const entries = Object.entries(counts)
    .map(([idStr, cnt]) => {
      const id = Number(idStr);
      const c = Number(cnt) || 0;
      const type = dict[id];
      return { id, cnt: c, type, name: type?.name ?? "" };
    })
    .filter((e) => e.cnt > 0 && e.type && e.name);

  /** @type {Record<string, typeof entries>} */
  const byFamily = { C: [], V: [], O: [], H: [] };
  const misc = [];
  for (const e of entries) {
    const parsed = parseCurationFamilyTier(e.name);
    if (!parsed) {
      misc.push(e);
      continue;
    }
    byFamily[parsed.letter].push({ ...e, tier: parsed.tier });
  }

  const slots = [];

  for (const fam of CREATOR_SLOT_FAMILIES) {
    const list = byFamily[fam];
    if (!list.length) continue;

    const cap = tierDisplayCap(fam);
    /** One catalog row per family: highest tier wins; tie → higher level count. */
    const entry = list.reduce((best, x) => {
      if (x.tier > best.tier) return x;
      if (x.tier === best.tier && x.cnt > best.cnt) return x;
      return best;
    }, list[0]);
    const shownTier = Math.min(entry.tier, cap);
    const badge = entry.cnt;
    const letter = `${fam}${shownTier}`;
    const title = `${entry.name} · ${badge} level(s)`;
    slots.push({
      key: `creator_slot_${fam}_${entry.id}`,
      curationTypeId: entry.id,
      letter,
      iconUrl: iconUrlForCurationType(entry.type),
      count: "",
      badge,
      title,
      tooltip: title,
    });
  }

  misc.sort((a, b) => b.cnt - a.cnt || a.id - b.id);
  const m = misc[0];
  if (m) {
    const shortLetter = m.name.length <= 3 ? m.name : m.name.slice(0, 2);
    slots.push({
      key: `creator_misc_${m.id}`,
      curationTypeId: m.id,
      letter: shortLetter,
      iconUrl: iconUrlForCurationType(m.type),
      count: "",
      badge: m.cnt,
      title: m.name,
      tooltip: m.name,
    });
  }

  return slots.slice(0, 5);
}

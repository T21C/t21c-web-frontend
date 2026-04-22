/**
 * Build ProfileHeader `iconSlots` for players (P/G/U + WF-based GQ/UQ) and creators (curation types).
 */

import { selectIconSize } from "@/utils/Utility";

const DEFAULT_CREATOR_ICON_SLOTS = [
  { key: "c1", letter: "?", count: "", badge: 0 },
  { key: "c2", letter: "?", count: "", badge: 0 },
  { key: "c3", letter: "?", count: "", badge: 0 },
  { key: "c4", letter: "?", count: "", badge: 0 },
  { key: "c5", letter: "?", count: "", badge: 0 },
];

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

function isWorldsFirst(pass) {
  const v = pass?.isWorldsFirst;
  return v === true || v === 1 || v === "1";
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
 * @param {unknown[]} passes
 * @param {Record<string, { name?: string; icon?: string | null; id?: number | string }>} difficultyDict
 */
export function buildPlayerIconSlots(passes, difficultyDict) {
  const list = Array.isArray(passes) ? passes : [];
  const dict = difficultyDict && typeof difficultyDict === "object" ? difficultyDict : {};

  /** @type {Record<string, { maxN: number; clearsAtMax: number; diffId: number | string | null }>} */
  const pguStats = {
    P: { maxN: 0, clearsAtMax: 0, diffId: null },
    G: { maxN: 0, clearsAtMax: 0, diffId: null },
    U: { maxN: 0, clearsAtMax: 0, diffId: null },
  };
  /** WF G clears at the winning tier: tier, count, best N in tier, icon from that difficulty */
  let gqState = { tier: -1, wfCount: 0, maxNInTier: 0, diffId: null };
  let uqState = { tier: -1, wfCount: 0, maxNInTier: 0, diffId: null };

  for (const pass of list) {
    if (pass?.isDeleted) continue;
    const diffId = pass?.level?.diffId;
    const name = getDifficultyEntry(dict, diffId)?.name;
    const parsed = parsePguDifficultyName(name);
    if (!parsed) continue;

    const { letter, n } = parsed;
    const st = pguStats[letter];
    if (n > st.maxN) {
      st.maxN = n;
      st.clearsAtMax = 1;
      st.diffId = diffId ?? null;
    } else if (n === st.maxN) {
      st.clearsAtMax += 1;
    }

    if (isWorldsFirst(pass)) {
      const tier = pguNumberToQTier(n);
      if (tier == null) continue;
      if (letter === "G") {
        if (tier > gqState.tier) {
          gqState = { tier, wfCount: 1, maxNInTier: n, diffId: diffId ?? null };
        } else if (tier === gqState.tier) {
          gqState.wfCount += 1;
          if (n > gqState.maxNInTier) {
            gqState.maxNInTier = n;
            gqState.diffId = diffId ?? null;
          }
        }
      } else if (letter === "U") {
        if (tier > uqState.tier) {
          uqState = { tier, wfCount: 1, maxNInTier: n, diffId: diffId ?? null };
        } else if (tier === uqState.tier) {
          uqState.wfCount += 1;
          if (n > uqState.maxNInTier) {
            uqState.maxNInTier = n;
            uqState.diffId = diffId ?? null;
          }
        }
      }
    }
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

const padCreatorSlots = (slots) => {
  const list = Array.isArray(slots) && slots.length ? [...slots] : [];
  const defaults = [...DEFAULT_CREATOR_ICON_SLOTS];
  while (list.length < 5) {
    list.push(defaults[list.length] || defaults[defaults.length - 1]);
  }
  return list.slice(0, 5);
};

/**
 * @param {Record<string, number> | null | undefined} curationTypeCounts diffId-like string keys from API
 * @param {number[] | null | undefined} displayIds
 * @param {Record<number, { id?: number; name?: string; icon?: string | null; color?: string }>} curationTypesDict
 */
export function buildCreatorIconSlots(curationTypeCounts, displayIds, curationTypesDict) {
  const counts = curationTypeCounts && typeof curationTypeCounts === "object" ? curationTypeCounts : {};
  const ids = Array.isArray(displayIds) ? displayIds.filter((x) => Number.isFinite(Number(x))).map(Number) : [];
  const uniqueIds = [...new Set(ids)].slice(0, 5);

  const slots = uniqueIds.map((typeId, idx) => {
    const type = curationTypesDict?.[typeId];
    const name = type?.name ?? `#${typeId}`;
    const rawIcon = type?.icon ?? null;
    let iconUrl;
    if (rawIcon) {
      try {
        iconUrl = selectIconSize(rawIcon, "small") || rawIcon;
      } catch {
        iconUrl = rawIcon;
      }
    }
    const cnt = Number(counts[String(typeId)] ?? counts[typeId] ?? 0) || 0;
    const shortLetter = name.length <= 3 ? name : name.slice(0, 2);
    return {
      key: `ct_${typeId}_${idx}`,
      curationTypeId: typeId,
      letter: shortLetter,
      iconUrl: iconUrl || undefined,
      count: "",
      badge: cnt,
      title: name,
      tooltip: name,
    };
  });

  return padCreatorSlots(slots);
}

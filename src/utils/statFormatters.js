/**
 * Shared formatters for profile / creator fun-fact stats.
 */

export function formatCount(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return Math.trunc(x).toLocaleString("en-US");
}

export function formatFloat(n, digits = 2) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toFixed(digits);
}

/** ratio in 0..1 → percent string */
export function formatPercentRatio(r) {
  const x = Number(r);
  if (!Number.isFinite(x)) return "0%";
  return `${(x * 100).toFixed(2)}%`;
}

export function formatDateIso(iso) {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** milliseconds → short human duration */
export function formatDurationMs(ms) {
  const s = Number(ms);
  if (!Number.isFinite(s) || s <= 0) return "0";
  const sec = s / 1000;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  const min = Math.floor(sec / 60);
  const rem = sec - min * 60;
  if (min < 60) return `${min}m ${rem < 10 ? rem.toFixed(0) : Math.round(rem)}s`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

/**
 * @param {Record<string, number>} map diffId string -> count
 * @param {Record<string, { name?: string; sortOrder?: number }>} difficultyDict
 * @returns {{ key: string, label: string, count: number }[]}
 */
export function difficultyBreakdownEntries(map, difficultyDict) {
  const entries = Object.entries(map || {}).map(([id, count]) => ({
    key: id,
    label: difficultyDict?.[id]?.name ?? `#${id}`,
    sortOrder: difficultyDict?.[id]?.sortOrder ?? 0,
    count: Number(count) || 0,
  }));
  entries.sort((a, b) => b.sortOrder - a.sortOrder || a.label.localeCompare(b.label));
  return entries;
}

/**
 * Convert a fun-facts difficulty breakdown map into `DifficultyGraph` input data.
 *
 * Iterates over every PGU difficulty in `difficultyDict` (not just keys present
 * in `breakdownMap`) so the resulting series includes 0-count buckets and the
 * chart shows the complete PGU ladder without gaps.
 *
 * @param {Record<string, number>} breakdownMap diffId string -> count
 * @param {Record<string, { id?: number | string; name?: string; sortOrder?: number; type?: string }>} difficultyDict
 * @param {'passes' | 'levels'} mode
 */
export function toDifficultyGraphData(breakdownMap, difficultyDict, mode) {
  const isPasses = mode === "passes";
  const map = breakdownMap || {};
  return Object.entries(difficultyDict || {})
    .filter(([, info]) => info?.type === "PGU")
    .map(([id, info]) => {
      const value = Number(map[id]) || 0;
      return {
        id: Number(info?.id ?? id),
        name: info?.name ?? `#${id}`,
        passCount: isPasses ? value : 0,
        levelCount: isPasses ? 0 : value,
        sortOrder: info?.sortOrder ?? 0,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

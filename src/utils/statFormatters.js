// tuf-search: #statFormatters
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

/** ratio in 0..1 ➔ percent string */
export function formatPercentRatio(r) {
  const x = Number(r);
  if (!Number.isFinite(x)) return "0%";
  return `${(x * 100).toFixed(2)}%`;
}

/**
 * Accuracy ratio (0..1) ➔ percent string that surfaces closeness to 100%.
 *
 * Plain rounding hides near-perfect runs (e.g. 0.999962 ➔ "100.00%"). Instead
 * the integer part is kept in full and the fractional part shows every leading
 * 9 up to and including the first non-nine digit, so the value reads as
 * "99.9996" rather than rounding up to 100. The fractional part is truncated
 * (never rounded up) so accuracy is never overstated.
 *
 * @param {number} ratio accuracy fraction in [0, 1]
 * @param {{ minDecimals?: number, withPercent?: boolean }} [opts]
 *   minDecimals: minimum fractional digits always shown (default 2)
 *   withPercent: append a trailing "%" (default true)
 */
export function formatAccuracyRatio(ratio, { minDecimals = 2, withPercent = true } = {}) {
  const suffix = withPercent ? "%" : "";
  const x = Number(ratio);
  if (!Number.isFinite(x)) return `0${suffix}`;
  if (x >= 1) return `100${suffix}`;
  if (x <= 0) return `${(0).toFixed(minDecimals)}${suffix}`;

  // Inspect at high precision so float noise (e.g. 99.99 stored as 99.9899…)
  // is rounded away before we truncate.
  const INSPECT_DECIMALS = 12;
  const fixed = (x * 100).toFixed(INSPECT_DECIMALS);
  const [intPart, decRaw = ""] = fixed.split(".");

  // Rounding at INSPECT_DECIMALS may carry into 100 (e.g. 0.9999999999999).
  if (Number(intPart) >= 100) return `100${suffix}`;

  let keep = minDecimals;
  if (intPart === "99") {
    let leadingNines = 0;
    while (leadingNines < decRaw.length && decRaw[leadingNines] === "9") {
      leadingNines += 1;
    }
    keep = Math.min(INSPECT_DECIMALS, Math.max(minDecimals, leadingNines + 1));
  }
  const decPart = decRaw.slice(0, keep).padEnd(keep, "0");
  return `${intPart}.${decPart}${suffix}`;
}

export function formatDateIso(iso) {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** milliseconds ➔ short human duration */
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
    .filter(([, info]) => 
      info?.type === "PGU" 
    || (info?.type === "SPECIAL" && (
         info?.name.includes("Q") 
      || info?.name.includes("P0")
      || info?.name.includes("Impossible")
      || info?.name.includes("Unranked")
      ) && mode === "levels")
    )
    .map(([id, info]) => {
      const value = Number(map[id]) || 0;
      let name = info?.name.includes("Q") ? info?.name.split(" ")[0] : info?.name ?? `#${id}`;
      if (info?.name.includes("Impossible")) {
        name = "∞";
      }
      let sortOrder = info?.name.includes("P0") ? -1 : info?.sortOrder;
      if (info?.name.includes("Unranked")) {
        sortOrder = -2;
        name = "0";
      }
      return {
        id: Number(info?.id ?? id),
        name,
        passCount: isPasses ? value : 0,
        levelCount: isPasses ? 0 : value,
        sortOrder,
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

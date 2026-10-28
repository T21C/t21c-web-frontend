export const ACTUATION_MIN_MM = 0.1;
export const ACTUATION_MAX_MM = 4;
const LABEL_COLOR = "var(--color-white)";
const KEY_BASE = "var(--color-white-t10)";

export function roundActuationMm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return (Math.round(n * 10) / 10).toFixed(1);
}

export function formatActuationMm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const clamped = Math.min(ACTUATION_MAX_MM, Math.max(ACTUATION_MIN_MM, Math.round(n * 10) / 10));
  return clamped.toFixed(1);
}

export function formatDepthLabel(value) {
  return roundActuationMm(value);
}

function depthBucket(mm) {
  return Math.round(Number(mm) * 10);
}

function modalBuckets(values) {
  const counts = new Map();
  for (const value of values) {
    const bucket = depthBucket(value);
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }
  let max = 0;
  for (const count of counts.values()) max = Math.max(max, count);
  const modes = new Set();
  for (const [bucket, count] of counts) {
    if (count === max) modes.add(bucket);
  }
  return modes;
}

const FILL_LOG_K = 1;

export function depthFillAlpha(mm) {
  const n = Number(mm);
  if (!Number.isFinite(n)) return 0;
  const clamped = Math.min(ACTUATION_MAX_MM, Math.max(ACTUATION_MIN_MM, n));
  const t = (clamped - ACTUATION_MIN_MM) / (ACTUATION_MAX_MM - ACTUATION_MIN_MM);
  const progressed = Math.log1p(t * FILL_LOG_K) / Math.log1p(FILL_LOG_K);
  return 1 - progressed;
}

export function depthFillColor(mm) {
  const alpha = depthFillAlpha(mm);
  if (alpha <= 0) return null;
  const percent = Math.round(alpha * 1000) / 10;
  return `color-mix(in srgb, var(--color-purple) ${percent}%, ${KEY_BASE})`;
}

function whiteLabel(mm, corner) {
  return {text: formatDepthLabel(mm), corner, color: LABEL_COLOR};
}

function outlierFill(mm, modal) {
  if (mm == null || !Number.isFinite(Number(mm))) return null;
  if (modal.has(depthBucket(mm))) return null;
  return depthFillColor(mm);
}

export function rtModeFromFields(row, board) {
  if (row && (
    row.rapidTriggerSplit != null
    || row.rapidTriggerActuationMm != null
    || row.rapidTriggerPressMm != null
    || row.rapidTriggerReleaseMm != null
  )) {
    if (row.rapidTriggerSplit) return "split";
    if (row.rapidTriggerActuationMm != null) return "single";
    return "off";
  }
  if (!board || board.sensing !== "hall") return "off";
  if (board.rapidTriggerSplit) return "split";
  if (board.rapidTriggerActuationMm != null) return "single";
  return "off";
}

export function effectiveActuationMm(row, board) {
  if (row?.actuationMm != null && row.actuationMm !== "") return Number(row.actuationMm);
  if (board?.actuationMm == null || board.actuationMm === "") return null;
  const n = Number(board.actuationMm);
  return Number.isFinite(n) ? n : null;
}

export function effectiveRapidTrigger(row, board) {
  const mode = rtModeFromFields(row, board);
  if (mode === "off") {
    return {mode, actuationMm: null, pressMm: null, releaseMm: null};
  }
  const src = row && (
    row.rapidTriggerSplit != null
    || row.rapidTriggerActuationMm != null
    || row.rapidTriggerPressMm != null
    || row.rapidTriggerReleaseMm != null
  ) ? row : board;
  return {
    mode,
    actuationMm: src?.rapidTriggerActuationMm == null ? null : Number(src.rapidTriggerActuationMm),
    pressMm: src?.rapidTriggerPressMm == null ? null : Number(src.rapidTriggerPressMm),
    releaseMm: src?.rapidTriggerReleaseMm == null ? null : Number(src.rapidTriggerReleaseMm),
  };
}

function isCommonDepth(mm, modal) {
  return mm != null && Number.isFinite(Number(mm)) && modal.has(depthBucket(mm));
}

function splitDepthFill(releaseMm, pressMm, releaseModal, pressModal) {
  const releaseKnown = releaseMm != null && Number.isFinite(Number(releaseMm));
  const pressKnown = pressMm != null && Number.isFinite(Number(pressMm));
  if (!releaseKnown && !pressKnown) return null;
  const releaseCommon = !releaseKnown || isCommonDepth(releaseMm, releaseModal);
  const pressCommon = !pressKnown || isCommonDepth(pressMm, pressModal);
  if (releaseCommon && pressCommon) return null;
  const top = releaseKnown ? depthFillColor(releaseMm) : null;
  const bottom = pressKnown ? depthFillColor(pressMm) : null;
  if (!top && !bottom) return null;
  return `linear-gradient(to bottom, ${top || KEY_BASE} 50%, ${bottom || KEY_BASE} 50%)`;
}

export function depthPaints(editorMode, codes, ctx) {
  const result = {};
  if (editorMode === "actuation") {
    const depths = [];
    for (const code of codes) {
      const mm = effectiveActuationMm(ctx.keyByCode?.get(code), ctx.board);
      if (mm == null || !Number.isFinite(mm)) continue;
      depths.push({code, mm});
    }
    const modal = modalBuckets(depths.map((row) => row.mm));
    for (const {code, mm} of depths) {
      const fill = outlierFill(mm, modal);
      result[code] = {
        labels: [whiteLabel(mm, "tl")],
        ...(fill ? {fill} : {}),
      };
    }
    return result;
  }
  if (editorMode !== "rapidTrigger") return result;
  const rows = [];
  const singles = [];
  const releases = [];
  const presses = [];
  for (const code of codes) {
    const rt = effectiveRapidTrigger(ctx.keyByCode?.get(code), ctx.board);
    if (rt.mode === "off") continue;
    rows.push({code, rt});
    if (rt.mode === "single" && Number.isFinite(rt.actuationMm)) singles.push(rt.actuationMm);
    if (rt.mode === "split") {
      if (Number.isFinite(rt.releaseMm)) releases.push(rt.releaseMm);
      if (Number.isFinite(rt.pressMm)) presses.push(rt.pressMm);
    }
  }
  const singleModal = modalBuckets(singles);
  const releaseModal = modalBuckets(releases);
  const pressModal = modalBuckets(presses);
  const singleCoversAll = rows.every((row) => row.rt.mode === "single");
  for (const {code, rt} of rows) {
    if (rt.mode === "single") {
      if (!Number.isFinite(rt.actuationMm)) continue;
      const fill = singleCoversAll
        ? outlierFill(rt.actuationMm, singleModal)
        : depthFillColor(rt.actuationMm);
      result[code] = {
        labels: [whiteLabel(rt.actuationMm, "tl")],
        ...(fill ? {fill} : {}),
      };
      continue;
    }
    const labels = [];
    if (Number.isFinite(rt.releaseMm)) labels.push(whiteLabel(rt.releaseMm, "tl"));
    if (Number.isFinite(rt.pressMm)) labels.push(whiteLabel(rt.pressMm, "br"));
    const fill = splitDepthFill(rt.releaseMm, rt.pressMm, releaseModal, pressModal);
    if (!labels.length && !fill) continue;
    result[code] = {
      ...(labels.length ? {labels} : {}),
      ...(fill ? {fill} : {}),
    };
  }
  return result;
}

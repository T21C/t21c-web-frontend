export const STAGE_WIDTH = 1000;
export const STAGE_HEIGHT = 1200;
export const STAGE_MAX_HEIGHT = STAGE_HEIGHT;
export const STAGE_PADDING = 24;
export const STAGE_BLOCK_GAP = 16;
export const MIN_BLOCK_W = 40;
export const MIN_BLOCK_H = 24;
export const MIN_BLOCK_X = -STAGE_WIDTH;
export const MIN_BLOCK_Y = -STAGE_HEIGHT;
export const MAX_BLOCK_X = STAGE_WIDTH;
export const MAX_BLOCK_Y = STAGE_HEIGHT;
export const MIN_BLOCK_ROTATION = -360;
export const MAX_BLOCK_ROTATION = 360;

const LEGACY_ALIGN = ["left", "center", "right"];
const LEGACY_WIDTH = ["full", "half"];

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clampBlockRotation(value, fallback = 0) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_BLOCK_ROTATION, Math.max(MIN_BLOCK_ROTATION, n));
}

function isLegacyLayout(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return "align" in raw || "width" in raw;
}

function hasFreeformLayout(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  return "x" in raw || "y" in raw || "w" in raw || "h" in raw;
}

function defaultLocked(descriptor) {
  return descriptor?.resizeBehavior === "aspect";
}

/** Parse + clamp freeform layout from stored values. */
export function normalizeLayout(raw, descriptor, legacyStackY = STAGE_PADDING) {
  const defaultW = descriptor?.defaultSize?.w ?? 600;
  const defaultH = descriptor?.defaultSize?.h ?? 120;

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    if (hasFreeformLayout(raw) && !isLegacyLayout(raw)) {
      let w = clampInt(raw.w, MIN_BLOCK_W, STAGE_WIDTH);
      let h = clampInt(raw.h, MIN_BLOCK_H, STAGE_MAX_HEIGHT);
      let x = clampInt(raw.x, MIN_BLOCK_X, MAX_BLOCK_X);
      let y = clampInt(raw.y, MIN_BLOCK_Y, MAX_BLOCK_Y);
      let locked;
      if (raw.locked !== undefined) {
        locked = raw.locked !== false;
      } else {
        locked = descriptor?.resizeBehavior === "aspect";
      }
      const rotation = clampBlockRotation(raw.rotation, 0);
      return { x, y, w, h, locked, rotation };
    }

    if (isLegacyLayout(raw)) {
      const width = LEGACY_WIDTH.includes(raw.width) ? raw.width : "full";
      const w = width === "half" ? 500 : STAGE_WIDTH;
      const align = LEGACY_ALIGN.includes(raw.align) ? raw.align : "center";
      let x = 0;
      if (align === "center") x = Math.round((STAGE_WIDTH - w) / 2);
      else if (align === "right") x = STAGE_WIDTH - w;
      const h = defaultH;
      const y = legacyStackY;
      return { x, y, w, h, locked: defaultLocked(descriptor), rotation: 0 };
    }
  }

  const w = defaultW;
  const h = defaultH;
  const x = Math.round((STAGE_WIDTH - w) / 2);
  const y = legacyStackY;
  return { x, y, w, h, locked: defaultLocked(descriptor), rotation: 0 };
}

export function createDefaultLayout(descriptor, stackY = STAGE_PADDING) {
  return normalizeLayout(null, descriptor, stackY);
}

export function computeNextStackY(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) return STAGE_PADDING;
  let maxBottom = STAGE_PADDING;
  for (const block of blocks) {
    const layout = block?.layout;
    maxBottom = Math.max(maxBottom, (layout?.y ?? 0) + (layout?.h ?? 0) + STAGE_BLOCK_GAP);
  }
  return maxBottom;
}

export function computeStageContentHeight(_blocks, _padding = STAGE_PADDING) {
  return STAGE_HEIGHT;
}

/** CSS positioning for a block inside the design stage. */
export function getBlockPositionStyle(layout, descriptor) {
  const normalized = normalizeLayout(layout, descriptor);
  const style = {
    position: "absolute",
    left: normalized.x,
    top: normalized.y,
    width: normalized.w,
  };

  if (
    descriptor?.resizeBehavior === "aspect" ||
    descriptor?.resizeBehavior === "free" ||
    descriptor?.resizeBehavior === "text"
  ) {
    style.height = normalized.h;
  } else {
    style.minHeight = normalized.h;
  }

  if (normalized.rotation) {
    style.transform = `rotate(${normalized.rotation}deg)`;
    style.transformOrigin = "center center";
  }

  return style;
}

export function getAspectRatio(layout) {
  const w = layout?.w ?? 1;
  const h = layout?.h ?? 1;
  if (!w || !h) return 1;
  return w / h;
}

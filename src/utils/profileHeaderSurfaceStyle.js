/** Profile header surface style: ordered DOM stack + per-layer image settings (v3). */

export const PROFILE_HEADER_SURFACE_STYLE_VERSION = 3;
export const MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES = 15;
export const MAX_PROFILE_HEADER_SURFACE_IMAGE_LAYERS = 10;
/** @deprecated Use MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES */
export const MAX_PROFILE_HEADER_SURFACE_LAYERS = MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES;
export const MAX_PROFILE_HEADER_SURFACE_JSON_BYTES = 32_768;
export const MAX_PROFILE_HEADER_SURFACE_STOPS = 8;
export const MIN_PROFILE_HEADER_SURFACE_STOPS = 2;
export const SURFACE_STACK_KIND_GRADIENT = "gradient";
export const SURFACE_STACK_KIND_IMAGE = "image";
export const MAX_PROFILE_HEADER_SURFACE_LAYER_LABEL_LENGTH = 32;
export const MAX_PROFILE_HEADER_SURFACE_STACK_ENTRY_ID_LENGTH = 64;

const STACK_ENTRY_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_LABEL =
  /url\s*\(|var\s*\(|expression\s*\(|@import|javascript:|\/\*|\*\/|;|\\|<\/|<>/i;

export function createStackEntryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function parseStackId(raw, assignIfMissing) {
  if (typeof raw === "string" && raw.length > 0 && raw.length <= MAX_PROFILE_HEADER_SURFACE_STACK_ENTRY_ID_LENGTH) {
    if (STACK_ENTRY_ID_RE.test(raw) || /^[a-zA-Z0-9_-]+$/.test(raw)) {
      return raw;
    }
  }
  return assignIfMissing ? createStackEntryId() : null;
}

function parseStackLabel(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s.length || s.length > MAX_PROFILE_HEADER_SURFACE_LAYER_LABEL_LENGTH) return null;
  if (DANGEROUS_LABEL.test(s)) return null;
  return s;
}

export const GRADIENT_LAYER_TYPES = [
  "linear",
  "radial",
  "conic",
  "repeating-linear",
  "repeating-radial",
  "repeating-conic",
];

export const RADIAL_SHAPES = ["circle", "ellipse"];
export const RADIAL_SIZES = [
  "closest-side",
  "closest-corner",
  "farthest-side",
  "farthest-corner",
];

export const IMAGE_SIZE_PRESETS = ["cover", "contain", "auto"];
export const IMAGE_REPEAT = ["no-repeat", "repeat", "repeat-x", "repeat-y", "space", "round"];

export const IMAGE_DIMENSION_PERCENT_MIN = 0;
export const IMAGE_DIMENSION_PERCENT_MAX = 300;
export const IMAGE_DIMENSION_PIXEL_MIN = 0;
export const IMAGE_DIMENSION_PIXEL_MAX = 4000;
export const IMAGE_SIZE_OFFSET_UNITS = ["percent", "pixel"];
export const IMAGE_REPEAT_TILE = IMAGE_REPEAT.filter((r) => r !== "no-repeat");

export const IMAGE_POSITION_PERCENT_MIN = -100;
export const IMAGE_POSITION_PERCENT_MAX = 200;
export const IMAGE_POSITION_PIXEL_MIN = -1000;
export const IMAGE_POSITION_PIXEL_MAX = 1000;
export const IMAGE_POSITION_OFFSET_UNITS = ["percent", "pixel"];
export const IMAGE_POSITION_HORIZONTAL_KEYWORDS = ["left", "center", "right"];
export const IMAGE_POSITION_VERTICAL_KEYWORDS = ["top", "center", "bottom"];

const DEFAULT_IMAGE_POSITION_AXIS_X = { side: "center", unit: "percent", value: 0 };
const DEFAULT_IMAGE_POSITION_AXIS_Y = { side: "center", unit: "percent", value: 0 };

export function createDefaultImagePosition() {
  return {
    x: { ...DEFAULT_IMAGE_POSITION_AXIS_X },
    y: { ...DEFAULT_IMAGE_POSITION_AXIS_Y },
  };
}

export const PAD_FROM_TOP_OFFSET_UNITS = IMAGE_SIZE_OFFSET_UNITS;
export const PAD_FROM_TOP_PERCENT_MIN = IMAGE_POSITION_PERCENT_MIN;
export const PAD_FROM_TOP_PERCENT_MAX = IMAGE_POSITION_PERCENT_MAX;
export const PAD_FROM_TOP_PIXEL_MIN = IMAGE_POSITION_PIXEL_MIN;
export const PAD_FROM_TOP_PIXEL_MAX = IMAGE_POSITION_PIXEL_MAX;

const DEFAULT_PAD_FROM_TOP = { unit: "pixel", value: 0 };

export function createDefaultPadFromTop() {
  return { ...DEFAULT_PAD_FROM_TOP };
}

function clampPadFromTopValue(value, unit) {
  if (unit === "pixel") {
    return clamp(Math.round(value), PAD_FROM_TOP_PIXEL_MIN, PAD_FROM_TOP_PIXEL_MAX);
  }
  return round1(clamp(value, PAD_FROM_TOP_PERCENT_MIN, PAD_FROM_TOP_PERCENT_MAX));
}

function parsePadFromTopUnit(raw) {
  if (raw === "pixel" || raw === "px") return "pixel";
  if (raw === "percent" || raw === "%") return "percent";
  return "percent";
}

/** Normalize pad-from-top offset for UI and rendering. */
export function normalizePadFromTop(raw) {
  if (!raw || typeof raw !== "object") {
    return createDefaultPadFromTop();
  }
  const unit = parsePadFromTopUnit(raw.unit);
  const n = Number(raw.value);
  const value = Number.isFinite(n) ? clampPadFromTopValue(n, unit) : 0;
  return { unit, value };
}

/** Apply pad-from-top as layer `top` only; other edges stay on `.profile-header__surface-layer` defaults. */
export function applyPadFromTopLayerStyle(style, padFromTop) {
  const pad = normalizePadFromTop(padFromTop);
  if (pad.value === 0) {
    style.top = undefined;
    return;
  }
  style.top = formatAxisLength(pad);
}

function parsePadFromTop(raw) {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object") return null;
  const pad = normalizePadFromTop(raw);
  if (!PAD_FROM_TOP_OFFSET_UNITS.includes(pad.unit)) return null;
  return pad;
}

export function isImageTilingEnabled(repeat) {
  return repeat !== "no-repeat";
}
export const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
  "hue",
  "saturation",
  "color",
  "luminosity",
];

const DANGEROUS_COLOR =
  /url\s*\(|var\s*\(|expression\s*\(|@import|javascript:|\/\*|\*\/|;|\\|<\/|<>/i;

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i;
const HSL_COLOR =
  /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function parseOpacity(raw) {
  if (raw === undefined || raw === null) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return round1(clamp(n, 0, 1));
}

function parseVisible(raw) {
  return raw !== false;
}

export function parseProfileHeaderSurfaceColor(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s.length || s.length > 64 || DANGEROUS_COLOR.test(s)) return null;

  if (HEX_COLOR.test(s)) return s.toLowerCase();

  const rgb = s.match(RGB_COLOR);
  if (rgb) {
    const r = clamp(Number(rgb[1]), 0, 255);
    const g = clamp(Number(rgb[2]), 0, 255);
    const b = clamp(Number(rgb[3]), 0, 255);
    if (rgb[4] !== undefined) {
      const a = clamp(Number(rgb[4]), 0, 1);
      return `rgba(${r}, ${g}, ${b}, ${round1(a)})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  const hsl = s.match(HSL_COLOR);
  if (hsl) {
    const h = clamp(Number(hsl[1]), 0, 360);
    const sat = clamp(Number(hsl[2]), 0, 100);
    const l = clamp(Number(hsl[3]), 0, 100);
    if (hsl[4] !== undefined) {
      const a = clamp(Number(hsl[4]), 0, 1);
      return `hsla(${h}, ${sat}%, ${l}%, ${round1(a)})`;
    }
    return `hsl(${h}, ${sat}%, ${l}%)`;
  }

  return null;
}

function parsePercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return round1(clamp(n, 0, 100));
}

function parsePositionPercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return round1(n);
}

function parseAngle(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return round1(((n % 360) + 360) % 360);
}

function parseGradientPosition(raw) {
  if (!raw || typeof raw !== "object") return null;
  const x = parsePositionPercent(raw.xPercent);
  const y = parsePositionPercent(raw.yPercent);
  if (x === null || y === null) return null;
  return { xPercent: x, yPercent: y };
}

function clampImagePositionOffset(value, unit) {
  if (unit === "pixel") {
    return clamp(Math.round(value), IMAGE_POSITION_PIXEL_MIN, IMAGE_POSITION_PIXEL_MAX);
  }
  return round1(clamp(value, IMAGE_POSITION_PERCENT_MIN, IMAGE_POSITION_PERCENT_MAX));
}

function parseImagePositionAxisOffset(raw, unit) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return clampImagePositionOffset(n, unit);
}

/** Normalize one axis (`x` | `y`) for UI and rendering. */
export function normalizeImagePositionAxis(raw, axis) {
  const sides = axis === "x" ? IMAGE_POSITION_HORIZONTAL_KEYWORDS : IMAGE_POSITION_VERTICAL_KEYWORDS;
  const fallback = axis === "x" ? DEFAULT_IMAGE_POSITION_AXIS_X : DEFAULT_IMAGE_POSITION_AXIS_Y;

  if (!raw || typeof raw !== "object") {
    return { ...fallback };
  }

  let side = raw.side;
  if (typeof side !== "string" || !sides.includes(side)) {
    side = fallback.side;
  }

  const unit = raw.unit === "pixel" ? "pixel" : "percent";
  const value = parseImagePositionAxisOffset(raw.value, unit);

  return { side, unit, value };
}

/** Read image position for UI. */
export function normalizeImagePosition(raw) {
  if (!raw || typeof raw !== "object") {
    return createDefaultImagePosition();
  }

  return {
    x: normalizeImagePositionAxis(raw.x, "x"),
    y: normalizeImagePositionAxis(raw.y, "y"),
  };
}

function parseImagePosition(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.x || typeof raw.x !== "object" || !raw.y || typeof raw.y !== "object") return null;

  const position = {
    x: normalizeImagePositionAxis(raw.x, "x"),
    y: normalizeImagePositionAxis(raw.y, "y"),
  };
  if (
    !IMAGE_POSITION_HORIZONTAL_KEYWORDS.includes(position.x.side) ||
    !IMAGE_POSITION_VERTICAL_KEYWORDS.includes(position.y.side) ||
    !IMAGE_POSITION_OFFSET_UNITS.includes(position.x.unit) ||
    !IMAGE_POSITION_OFFSET_UNITS.includes(position.y.unit)
  ) {
    return null;
  }
  return position;
}

/** Resolve object-fit / background-size keyword (`cover` | `contain` | `auto`). */
export function normalizeImageSizeFit(raw) {
  if (typeof raw === "string" && IMAGE_SIZE_PRESETS.includes(raw)) return raw;
  return "cover";
}

const DEFAULT_IMAGE_SIZE_AXIS = { unit: "percent", value: 100 };

export function createDefaultImageSizeDimensions() {
  return {
    width: { ...DEFAULT_IMAGE_SIZE_AXIS },
    height: { ...DEFAULT_IMAGE_SIZE_AXIS },
  };
}

function clampImageSizeValue(value, unit) {
  if (unit === "pixel") {
    return clamp(Math.round(value), IMAGE_DIMENSION_PIXEL_MIN, IMAGE_DIMENSION_PIXEL_MAX);
  }
  return round1(clamp(value, IMAGE_DIMENSION_PERCENT_MIN, IMAGE_DIMENSION_PERCENT_MAX));
}

function parseImageSizeAxisValue(raw, unit) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_IMAGE_SIZE_AXIS.value;
  return clampImageSizeValue(n, unit);
}

function parseImageSizeDimensionAxis(raw, axisKey) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_IMAGE_SIZE_AXIS };
  }
  const unit = raw.unit === "pixel" ? "pixel" : "percent";
  const value = parseImageSizeAxisValue(raw.value, unit);
  return { unit, value };
}

/** Normalize one size axis (`width` | `height`) for UI and rendering. */
export function normalizeImageSizeDimensionAxis(raw, axisKey) {
  return parseImageSizeDimensionAxis(raw, axisKey);
}

/** Read manual background size dimensions for UI. */
export function normalizeImageSizeDimensions(raw) {
  if (!raw || typeof raw !== "object") {
    return createDefaultImageSizeDimensions();
  }
  return {
    width: normalizeImageSizeDimensionAxis(raw.width, "width"),
    height: normalizeImageSizeDimensionAxis(raw.height, "height"),
  };
}

function parseImageSizeDimensions(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.width || typeof raw.width !== "object" || !raw.height || typeof raw.height !== "object") {
    return null;
  }

  const width = parseImageSizeDimensionAxis(raw.width, "width");
  const height = parseImageSizeDimensionAxis(raw.height, "height");
  if (
    !IMAGE_SIZE_OFFSET_UNITS.includes(width.unit) ||
    !IMAGE_SIZE_OFFSET_UNITS.includes(height.unit)
  ) {
    return null;
  }
  return { width, height };
}

function formatSizeAxisLength(axis) {
  if (axis.unit === "pixel") return `${axis.value}px`;
  return `${axis.value}%`;
}

function parseImageSizeFit(raw) {
  if (typeof raw === "string" && IMAGE_SIZE_PRESETS.includes(raw)) return raw;
  return "cover";
}

function formatAxisLength(axis) {
  if (axis.unit === "pixel") return `${axis.value}px`;
  return `${axis.value}%`;
}

/** One axis token for valid two-value `background-position` syntax. */
function formatImagePositionComponent(axis) {
  const { side, value } = axis;
  if (side === "center" && value === 0) {
    return "center";
  }
  if (value === 0) {
    return side;
  }
  if (side === "center") {
    const magnitude = formatAxisLength({ unit: axis.unit, value: Math.abs(value) });
    const op = value >= 0 ? "+" : "-";
    return `calc(50% ${op} ${magnitude})`;
  }
  return `${side} ${formatAxisLength(axis)}`;
}

function formatImageBackgroundPosition(position) {
  const pos = normalizeImagePosition(position);
  const x = formatImagePositionComponent(pos.x);
  const y = formatImagePositionComponent(pos.y);
  if (x === "center" && y === "center") {
    return "center";
  }
  return `${x} ${y}`;
}

function parseStops(raw) {
  if (!Array.isArray(raw)) return null;
  if (raw.length < MIN_PROFILE_HEADER_SURFACE_STOPS || raw.length > MAX_PROFILE_HEADER_SURFACE_STOPS) {
    return null;
  }
  const stops = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const color = parseProfileHeaderSurfaceColor(item.color);
    const offsetPercent = parsePercent(item.offsetPercent);
    if (!color || offsetPercent === null) return null;
    stops.push({ color, offsetPercent });
  }
  stops.sort((a, b) => a.offsetPercent - b.offsetPercent);
  return stops;
}

function parseGradientLayerFields(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = raw.type;
  if (typeof type !== "string" || !GRADIENT_LAYER_TYPES.includes(type)) return null;
  const stops = parseStops(raw.stops);
  if (!stops) return null;

  const layer = { type, stops };

  if (type === "linear" || type === "repeating-linear") {
    layer.angleDeg = parseAngle(raw.angleDeg);
  }

  if (type === "radial" || type === "repeating-radial" || type === "conic" || type === "repeating-conic") {
    layer.position = parseGradientPosition(raw.position) ?? { xPercent: 50, yPercent: 50 };
  }

  if (type === "radial" || type === "repeating-radial") {
    layer.shape = raw.shape === "circle" || raw.shape === "ellipse" ? raw.shape : "ellipse";
    if (typeof raw.size === "string" && RADIAL_SIZES.includes(raw.size)) {
      layer.size = raw.size;
    }
  }

  if (type === "conic" || type === "repeating-conic") {
    layer.angleDeg = parseAngle(raw.angleDeg);
  }

  if (typeof raw.blendMode === "string" && BLEND_MODES.includes(raw.blendMode) && raw.blendMode !== "normal") {
    layer.blendMode = raw.blendMode;
  }

  return layer;
}

function parseImageSettings(raw) {
  if (!raw || typeof raw !== "object") return null;
  const sizeFit = parseImageSizeFit(raw.sizeFit);
  const sizeDimensions = parseImageSizeDimensions(raw.sizeDimensions);
  const position = parseImagePosition(raw.position);
  if (!sizeDimensions || !position) return null;
  if (!IMAGE_REPEAT.includes(raw.repeat)) return null;

  const image = { sizeFit, sizeDimensions, position, repeat: raw.repeat };
  if (raw.sizeDimensionsLinked === true) {
    image.sizeDimensionsLinked = true;
  }
  if (typeof raw.blendMode === "string" && BLEND_MODES.includes(raw.blendMode) && raw.blendMode !== "normal") {
    image.blendMode = raw.blendMode;
  }
  const padFromTop = parsePadFromTop(raw.padFromTop);
  if (padFromTop === null) return null;
  if (padFromTop) {
    image.padFromTop = padFromTop;
  }
  return image;
}

function parseStackEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const kind = raw.kind;
  const id = parseStackId(raw.id, true);
  if (!id) return null;
  const label = parseStackLabel(raw.label);
  if (label === null) return null;

  if (kind === SURFACE_STACK_KIND_IMAGE) {
    return {
      id,
      kind: SURFACE_STACK_KIND_IMAGE,
      opacity: parseOpacity(raw.opacity),
      visible: parseVisible(raw.visible),
      ...(label ? { label } : {}),
    };
  }

  if (kind === SURFACE_STACK_KIND_GRADIENT) {
    const fields = parseGradientLayerFields(raw);
    if (!fields) return null;
    return {
      id,
      kind: SURFACE_STACK_KIND_GRADIENT,
      opacity: parseOpacity(raw.opacity),
      visible: parseVisible(raw.visible),
      ...(label ? { label } : {}),
      ...fields,
    };
  }

  return null;
}

function parseStack(rawStack) {
  if (!Array.isArray(rawStack)) return null;
  if (rawStack.length === 0 || rawStack.length > MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES) return null;

  let imageCount = 0;
  const stack = [];

  for (const entry of rawStack) {
    const parsed = parseStackEntry(entry);
    if (!parsed) return null;
    if (parsed.kind === SURFACE_STACK_KIND_IMAGE) {
      imageCount += 1;
      if (imageCount > MAX_PROFILE_HEADER_SURFACE_IMAGE_LAYERS) return null;
    }
    stack.push(parsed);
  }

  return stack;
}

function parseImagesMap(rawImages, imageIds) {
  if (imageIds.length === 0) {
    if (rawImages !== undefined && rawImages !== null) return null;
    return undefined;
  }
  if (!rawImages || typeof rawImages !== "object" || Array.isArray(rawImages)) return null;

  const images = {};
  for (const id of imageIds) {
    const parsed = parseImageSettings(rawImages[id]);
    if (!parsed) return null;
    images[id] = parsed;
  }

  const keys = Object.keys(rawImages).sort();
  const expected = [...imageIds].sort();
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    return null;
  }

  return images;
}

/** Parse and validate v3 style JSON. */
export function parseProfileHeaderSurfaceStyle(input) {
  if (input === null || input === undefined) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (input.version !== PROFILE_HEADER_SURFACE_STYLE_VERSION) return null;
  if (input.image !== undefined && input.image !== null) return null;

  const stack = parseStack(input.stack);
  if (!stack) return null;

  const imageIds = getImageStackEntryIds(stack);
  const images = parseImagesMap(input.images, imageIds);
  if (images === null) return null;

  return {
    version: PROFILE_HEADER_SURFACE_STYLE_VERSION,
    stack,
    ...(images ? { images } : {}),
  };
}

/** Strict parse first; fall back to in-memory editor draft for live preview. */
export function coerceProfileHeaderSurfaceStyleForRender(input) {
  const parsed = parseProfileHeaderSurfaceStyle(input);
  if (parsed) return parsed;
  if (input === null || input === undefined) return null;
  if (typeof input !== "object" || Array.isArray(input)) return null;
  if (input.version !== PROFILE_HEADER_SURFACE_STYLE_VERSION) return null;
  if (!Array.isArray(input.stack)) return null;
  return {
    version: PROFILE_HEADER_SURFACE_STYLE_VERSION,
    stack: input.stack,
    ...(input.images &&
    typeof input.images === "object" &&
    !Array.isArray(input.images)
      ? { images: input.images }
      : {}),
  };
}

export function countGradientStackEntries(stack) {
  return stack.filter((e) => e.kind === SURFACE_STACK_KIND_GRADIENT).length;
}

export function countImageStackEntries(stack) {
  return stack.filter((e) => e.kind === SURFACE_STACK_KIND_IMAGE).length;
}

export function getImageStackEntryIds(stack) {
  if (!Array.isArray(stack)) return [];
  return stack.filter((e) => e.kind === SURFACE_STACK_KIND_IMAGE).map((e) => e.id);
}

export function stackHasImageLayer(stack) {
  return stack.some((e) => e.kind === SURFACE_STACK_KIND_IMAGE);
}

export function pruneImagesMap(stack, images) {
  const ids = new Set(getImageStackEntryIds(stack));
  if (!images || typeof images !== "object") return {};
  const next = {};
  for (const id of ids) {
    if (images[id]) next[id] = images[id];
  }
  return next;
}

export function parseProfileHeaderSurfaceImageAssets(input) {
  if (input == null) return {};
  if (typeof input !== "object" || Array.isArray(input)) return {};
  const out = {};
  for (const [layerId, val] of Object.entries(input)) {
    if (!layerId || !val || typeof val !== "object") continue;
    const assetId = typeof val.assetId === "string" ? val.assetId.trim() : "";
    const url = typeof val.url === "string" ? val.url.trim() : "";
    if (assetId && url) out[layerId] = { assetId, url };
  }
  return out;
}

export function canAddStackEntry(stack) {
  return Array.isArray(stack) && stack.length < MAX_PROFILE_HEADER_SURFACE_STACK_ENTRIES;
}

export function canAddImageLayer(stack) {
  return (
    canAddStackEntry(stack) &&
    countImageStackEntries(stack) < MAX_PROFILE_HEADER_SURFACE_IMAGE_LAYERS
  );
}

export function findStackIndexById(stack, id) {
  if (!id || !Array.isArray(stack)) return -1;
  return stack.findIndex((e) => e.id === id);
}

function formatStops(stops) {
  return stops.map((s) => `${s.color} ${s.offsetPercent}%`).join(", ");
}

export function buildGradientLayerCss(layer, options = {}) {
  const stops = formatStops(layer.stops);
  const { type } = layer;
  const ignorePosition = options.ignorePosition === true;

  if (type === "linear") {
    return `linear-gradient(${layer.angleDeg ?? 0}deg, ${stops})`;
  }
  if (type === "repeating-linear") {
    return `repeating-linear-gradient(${layer.angleDeg ?? 0}deg, ${stops})`;
  }

  const pos = ignorePosition
    ? { xPercent: 50, yPercent: 50 }
    : (layer.position ?? { xPercent: 50, yPercent: 50 });
  const at = `${pos.xPercent}% ${pos.yPercent}%`;

  if (type === "radial" || type === "repeating-radial") {
    const shape = layer.shape ?? "ellipse";
    const sizePart = layer.size ? ` ${layer.size}` : "";
    const fn = type === "radial" ? "radial-gradient" : "repeating-radial-gradient";
    return `${fn}(${shape}${sizePart} at ${at}, ${stops})`;
  }

  const deg = layer.angleDeg ?? 0;
  const fn = type === "conic" ? "conic-gradient" : "repeating-conic-gradient";
  return `${fn}(from ${deg}deg at ${at}, ${stops})`;
}

function escapeCssUrl(url) {
  return url.replace(/"/g, "%22").replace(/\)/g, "%29");
}

function formatImageBackgroundSize(settings) {
  const dims = normalizeImageSizeDimensions(settings.sizeDimensions);
  if (settings.sizeDimensionsLinked === true) {
    return formatSizeAxisLength(dims.width);
  }
  return `${formatSizeAxisLength(dims.width)} ${formatSizeAxisLength(dims.height)}`;
}

export function buildImageLayerDomStyle(imageUrl, settings, options = {}) {
  const safeUrl = escapeCssUrl(imageUrl);
  const style = {
    backgroundImage: `url("${safeUrl}")`,
    backgroundSize: formatImageBackgroundSize(settings),
    backgroundRepeat: settings.repeat,
  };
  style.backgroundPosition =
    options.ignorePosition === true ? "center" : formatImageBackgroundPosition(settings.position);
  if (options.ignorePosition !== true) {
    applyPadFromTopLayerStyle(style, settings.padFromTop);
  }
  if (settings.blendMode && settings.blendMode !== "normal") {
    style.mixBlendMode = settings.blendMode;
  }
  return style;
}

/** Ordered DOM layer models for ProfileHeader surface stack. */
export function buildSurfaceStackRenderLayers(style, imageAssetsByLayerId) {
  if (!style?.stack?.length) return [];

  const assets =
    imageAssetsByLayerId && typeof imageAssetsByLayerId === "object" && !Array.isArray(imageAssetsByLayerId)
      ? imageAssetsByLayerId
      : {};

  return style.stack
    .map((entry, index) => {
      const opacity = entry.opacity ?? 1;
      const visible = entry.visible !== false;

      if (entry.kind === SURFACE_STACK_KIND_GRADIENT) {
        const layerStyle = { background: buildGradientLayerCss(entry) };
        if (entry.blendMode && entry.blendMode !== "normal") {
          layerStyle.mixBlendMode = entry.blendMode;
        }
        return {
          key: `gradient-${entry.id ?? index}`,
          visible,
          opacity,
          style: layerStyle,
        };
      }

      if (entry.kind === SURFACE_STACK_KIND_IMAGE) {
        const settings = style.images?.[entry.id];
        const assetUrl =
          typeof assets[entry.id]?.url === "string" ? assets[entry.id].url.trim() : "";
        if (!assetUrl || !settings) return null;
        return {
          key: `image-${entry.id ?? index}`,
          visible,
          opacity,
          style: buildImageLayerDomStyle(assetUrl, settings),
        };
      }

      return null;
    })
    .filter(Boolean);
}

const DEFAULT_LAYER_LABEL_RE = /^Layer\s+(\d+)$/i;

/** Next unused default gradient label: "Layer 1", "Layer 2", … */
export function getNextDefaultLayerLabel(stack) {
  const used = new Set();
  if (Array.isArray(stack)) {
    for (const entry of stack) {
      if (entry?.kind !== SURFACE_STACK_KIND_GRADIENT) continue;
      const label = entry?.label?.trim();
      if (!label) continue;
      const match = label.match(DEFAULT_LAYER_LABEL_RE);
      if (match) used.add(Number(match[1]));
    }
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return `Layer ${n}`;
}

const DEFAULT_GRADIENT_LAYER_STOPS = [
  { color: "#291148", offsetPercent: 0 },
  { color: "#971993", offsetPercent: 100 },
];

/** Shared default gradient fields for new layers and the initial editor style. */
function createDefaultGradientLayerFields(type = "linear") {
  const fields = {
    type,
    angleDeg: 135,
    opacity: 1,
    visible: true,
    stops: DEFAULT_GRADIENT_LAYER_STOPS.map((stop) => ({ ...stop })),
  };
  if (type === "radial" || type === "repeating-radial" || type === "conic" || type === "repeating-conic") {
    fields.position = { xPercent: 50, yPercent: 50 };
  }
  if (type === "radial" || type === "repeating-radial") {
    fields.shape = "ellipse";
  }
  return fields;
}

export function createDefaultProfileHeaderSurfaceStyle() {
  return {
    version: PROFILE_HEADER_SURFACE_STYLE_VERSION,
    stack: [
      {
        id: createStackEntryId(),
        kind: SURFACE_STACK_KIND_GRADIENT,
        label: "Layer 1",
        ...createDefaultGradientLayerFields("linear"),
      },
    ],
  };
}

export function createEmptyGradientLayer(type = "linear", stackForLabel) {
  const layer = {
    id: createStackEntryId(),
    kind: SURFACE_STACK_KIND_GRADIENT,
    ...createDefaultGradientLayerFields(type),
  };
  if (Array.isArray(stackForLabel)) {
    layer.label = getNextDefaultLayerLabel(stackForLabel);
  }
  return layer;
}

export function createImageStackEntry() {
  return {
    id: createStackEntryId(),
    kind: SURFACE_STACK_KIND_IMAGE,
    opacity: 1,
    visible: true,
  };
}

export function createDefaultImageSettings() {
  return {
    sizeDimensions: createDefaultImageSizeDimensions(),
    sizeDimensionsLinked: true,
    position: createDefaultImagePosition(),
    repeat: "no-repeat",
  };
}

/** Append a new image layer with default settings (caller must respect caps). */
export function addImageLayerToStyle(style) {
  const entry = createImageStackEntry();
  const images = { ...(style.images ?? {}), [entry.id]: createDefaultImageSettings() };
  return {
    style: {
      ...style,
      version: PROFILE_HEADER_SURFACE_STYLE_VERSION,
      stack: [...style.stack, entry],
      images,
    },
    newLayerId: entry.id,
  };
}

/** Remove one image layer and its settings by stack index. */
export function removeImageLayerAtIndex(style, stackIndex) {
  const entry = style.stack[stackIndex];
  if (!entry || entry.kind !== SURFACE_STACK_KIND_IMAGE) return style;
  const nextStack = style.stack.filter((_, i) => i !== stackIndex);
  const images = { ...(style.images ?? {}) };
  delete images[entry.id];
  const pruned = pruneImagesMap(nextStack, images);
  return {
    ...style,
    version: PROFILE_HEADER_SURFACE_STYLE_VERSION,
    stack: nextStack,
    ...(Object.keys(pruned).length ? { images: pruned } : {}),
  };
}

export function getImageSettingsForLayer(style, layerId) {
  if (!layerId || !style?.images) return null;
  return style.images[layerId] ?? null;
}

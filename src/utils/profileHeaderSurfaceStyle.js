/** Profile header surface style: ordered DOM stack + shared image settings. */

export const PROFILE_HEADER_SURFACE_STYLE_VERSION = 2;
export const MAX_PROFILE_HEADER_SURFACE_LAYERS = 10;
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
export const IMAGE_REPEAT_TILE = IMAGE_REPEAT.filter((r) => r !== "no-repeat");

export const IMAGE_POSITION_PERCENT_MIN = -100;
export const IMAGE_POSITION_PERCENT_MAX = 200;
export const IMAGE_POSITION_PIXEL_MIN = -1000;
export const IMAGE_POSITION_PIXEL_MAX = 1000;
export const IMAGE_POSITION_UNITS = ["percent", "pixel"];

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

function parseImagePositionPixel(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseImagePosition(raw) {
  if (!raw || typeof raw !== "object") return null;
  const unit = raw.unit === "pixel" ? "pixel" : "percent";
  if (unit === "pixel") {
    const x = parseImagePositionPixel(raw.x ?? raw.xPx);
    const y = parseImagePositionPixel(raw.y ?? raw.yPx);
    if (x === null || y === null) return null;
    return { unit: "pixel", x, y };
  }
  const x = parsePositionPercent(raw.x ?? raw.xPercent);
  const y = parsePositionPercent(raw.y ?? raw.yPercent);
  if (x === null || y === null) return null;
  return { unit: "percent", x, y };
}

/** Read image position for UI (supports legacy `{ xPercent, yPercent }`). */
export function normalizeImagePosition(raw) {
  if (!raw || typeof raw !== "object") {
    return { unit: "percent", x: 50, y: 50 };
  }
  if (raw.unit === "pixel" || raw.xPx != null || raw.yPx != null) {
    const parsed = parseImagePosition({ unit: "pixel", x: raw.x ?? raw.xPx, y: raw.y ?? raw.yPx });
    return parsed ?? { unit: "pixel", x: 0, y: 0 };
  }
  const parsed = parseImagePosition({
    unit: "percent",
    x: raw.x ?? raw.xPercent,
    y: raw.y ?? raw.yPercent,
  });
  return parsed ?? { unit: "percent", x: 50, y: 50 };
}

export function defaultImagePositionForUnit(unit) {
  return unit === "pixel" ? { unit: "pixel", x: 0, y: 0 } : { unit: "percent", x: 50, y: 50 };
}

/** Resolve object-fit / background-size keyword (`cover` | `contain` | `auto`). */
export function normalizeImageSizeFit(raw) {
  if (typeof raw === "string" && IMAGE_SIZE_PRESETS.includes(raw)) return raw;
  return "cover";
}

/** @deprecated Use normalizeImageSizeFit */
export function normalizeImageSize(size) {
  return normalizeImageSizeFit(size);
}

const DEFAULT_IMAGE_SIZE_DIMENSIONS = { widthPercent: 100, heightPercent: 100 };

function parseImageDimensionPercent(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return round1(n);
}

function parseImageSizeDimensions(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_IMAGE_SIZE_DIMENSIONS };
  const w = parseImageDimensionPercent(raw.widthPercent);
  const h = parseImageDimensionPercent(raw.heightPercent);
  return {
    widthPercent: w ?? DEFAULT_IMAGE_SIZE_DIMENSIONS.widthPercent,
    heightPercent: h ?? DEFAULT_IMAGE_SIZE_DIMENSIONS.heightPercent,
  };
}

/** Read manual background size % for UI. */
export function getImageSizeDimensions(settings) {
  if (!settings || typeof settings !== "object") return { ...DEFAULT_IMAGE_SIZE_DIMENSIONS };
  if (settings.sizeDimensions && typeof settings.sizeDimensions === "object") {
    return parseImageSizeDimensions(settings.sizeDimensions);
  }
  if (settings.size && typeof settings.size === "object") {
    return parseImageSizeDimensions(settings.size);
  }
  return { ...DEFAULT_IMAGE_SIZE_DIMENSIONS };
}

export function imageSizeDimensionsFromValues(sizeX, sizeY) {
  return { widthPercent: sizeX, heightPercent: sizeY };
}

function parseImageSizeFit(raw, legacySize) {
  if (typeof raw === "string" && IMAGE_SIZE_PRESETS.includes(raw)) return raw;
  if (typeof legacySize === "string" && IMAGE_SIZE_PRESETS.includes(legacySize)) return legacySize;
  return "cover";
}

function formatImageBackgroundPosition(position) {
  const pos = normalizeImagePosition(position);
  if (pos.unit === "pixel") {
    return `${pos.x}px ${pos.y}px`;
  }
  return `${pos.x}% ${pos.y}%`;
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
  const sizeFit = parseImageSizeFit(raw.sizeFit, raw.size);
  const sizeDimensions = parseImageSizeDimensions(
    raw.sizeDimensions ?? (typeof raw.size === "object" ? raw.size : undefined),
  );
  const position = parseImagePosition(raw.position);
  if (!position) return null;
  if (!IMAGE_REPEAT.includes(raw.repeat)) return null;

  const image = { sizeFit, sizeDimensions, position, repeat: raw.repeat };
  if (raw.sizeDimensionsLinked === true) {
    image.sizeDimensionsLinked = true;
  }
  if (typeof raw.blendMode === "string" && BLEND_MODES.includes(raw.blendMode) && raw.blendMode !== "normal") {
    image.blendMode = raw.blendMode;
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
  if (rawStack.length > MAX_PROFILE_HEADER_SURFACE_LAYERS + 1) return null;

  let imageCount = 0;
  let gradientCount = 0;
  const stack = [];

  for (const entry of rawStack) {
    const parsed = parseStackEntry(entry);
    if (!parsed) return null;
    if (parsed.kind === SURFACE_STACK_KIND_IMAGE) {
      imageCount += 1;
      if (imageCount > 1) return null;
    } else {
      gradientCount += 1;
      if (gradientCount > MAX_PROFILE_HEADER_SURFACE_LAYERS) return null;
    }
    stack.push(parsed);
  }

  return stack;
}

export function parseProfileHeaderSurfaceStyle(input) {
  if (input === null || input === undefined) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  if (input.version !== PROFILE_HEADER_SURFACE_STYLE_VERSION) return null;

  const stack = parseStack(input.stack);
  if (!stack || stack.length === 0) return null;

  let image;
  const hasImageLayer = stack.some((e) => e.kind === SURFACE_STACK_KIND_IMAGE);
  if (hasImageLayer) {
    if (input.image === undefined || input.image === null) return null;
    image = parseImageSettings(input.image);
    if (!image) return null;
  } else if (input.image != null) {
    return null;
  }

  return {
    version: PROFILE_HEADER_SURFACE_STYLE_VERSION,
    stack,
    ...(image ? { image } : {}),
  };
}

export function countGradientStackEntries(stack) {
  return stack.filter((e) => e.kind === SURFACE_STACK_KIND_GRADIENT).length;
}

export function stackHasImageLayer(stack) {
  return stack.some((e) => e.kind === SURFACE_STACK_KIND_IMAGE);
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
  const fit = normalizeImageSizeFit(settings.sizeFit ?? settings.size);
  const { widthPercent, heightPercent } = getImageSizeDimensions(settings);
  const isDefaultDims =
    widthPercent === DEFAULT_IMAGE_SIZE_DIMENSIONS.widthPercent &&
    heightPercent === DEFAULT_IMAGE_SIZE_DIMENSIONS.heightPercent;
  if (isDefaultDims) return fit;
  if (settings.sizeDimensionsLinked === true) {
    return `${widthPercent}%`;
  }
  return `${widthPercent}% ${heightPercent}%`;
}

export function buildImageLayerDomStyle(imageUrl, settings, options = {}) {
  const safeUrl = escapeCssUrl(imageUrl);
  const style = {
    backgroundImage: `url("${safeUrl}")`,
    backgroundSize: formatImageBackgroundSize(settings),
    backgroundRepeat: settings.repeat,
  };
  if (options.ignorePosition === true) {
    style.backgroundPosition = "center center";
  } else {
    style.backgroundPosition = formatImageBackgroundPosition(settings.position);
  }
  if (settings.blendMode && settings.blendMode !== "normal") {
    style.mixBlendMode = settings.blendMode;
  }
  return style;
}

/** Ordered DOM layer models for ProfileHeader surface stack. */
export function buildSurfaceStackRenderLayers(style, imageUrl) {
  if (!style?.stack?.length) return [];

  const url =
    typeof imageUrl === "string" && imageUrl.trim().length > 0 ? imageUrl.trim() : null;

  return style.stack
    .map((entry, index) => {
      const opacity = entry.opacity ?? 1;
      const visible = entry.visible !== false;

      if (entry.kind === SURFACE_STACK_KIND_GRADIENT) {
        const style = { background: buildGradientLayerCss(entry) };
        if (entry.blendMode && entry.blendMode !== "normal") {
          style.mixBlendMode = entry.blendMode;
        }
        return {
          key: `gradient-${index}`,
          visible,
          opacity,
          style,
        };
      }

      if (entry.kind === SURFACE_STACK_KIND_IMAGE && url && style.image) {
        return {
          key: `image-${index}`,
          visible,
          opacity,
          style: buildImageLayerDomStyle(url, style.image),
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
    sizeFit: "cover",
    sizeDimensions: { ...DEFAULT_IMAGE_SIZE_DIMENSIONS },
    position: { unit: "percent", x: 50, y: 50 },
    repeat: "no-repeat",
  };
}

export function ensureImageStackEntry(style) {
  if (stackHasImageLayer(style.stack)) return style;
  return {
    ...style,
    stack: [...style.stack, createImageStackEntry()],
    image: style.image ?? createDefaultImageSettings(),
  };
}

export function removeImageStackEntry(style) {
  return {
    ...style,
    stack: style.stack.filter((e) => e.kind !== SURFACE_STACK_KIND_IMAGE),
    image: undefined,
  };
}

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

function parseAngle(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return round1(((n % 360) + 360) % 360);
}

function parsePosition(raw) {
  if (!raw || typeof raw !== "object") return null;
  const x = parsePercent(raw.xPercent);
  const y = parsePercent(raw.yPercent);
  if (x === null || y === null) return null;
  return { xPercent: x, yPercent: y };
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
    layer.position = parsePosition(raw.position) ?? { xPercent: 50, yPercent: 50 };
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

function parseImageSize(raw) {
  if (typeof raw === "string" && IMAGE_SIZE_PRESETS.includes(raw)) return raw;
  if (!raw || typeof raw !== "object") return null;
  const w = parsePercent(raw.widthPercent);
  const h = parsePercent(raw.heightPercent);
  if (w === null || h === null) return null;
  return { widthPercent: w, heightPercent: h };
}

function parseImageSettings(raw) {
  if (!raw || typeof raw !== "object") return null;
  const size = parseImageSize(raw.size);
  const position = parsePosition(raw.position);
  if (!size || !position) return null;
  if (!IMAGE_REPEAT.includes(raw.repeat)) return null;

  const image = { size, position, repeat: raw.repeat };
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
    image = parseImageSettings(input.image);
    if (!image) return null;
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

export function buildGradientLayerCss(layer) {
  const stops = formatStops(layer.stops);
  const { type } = layer;

  if (type === "linear") {
    return `linear-gradient(${layer.angleDeg ?? 0}deg, ${stops})`;
  }
  if (type === "repeating-linear") {
    return `repeating-linear-gradient(${layer.angleDeg ?? 0}deg, ${stops})`;
  }

  const pos = layer.position ?? { xPercent: 50, yPercent: 50 };
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

function formatImageSize(size) {
  if (typeof size === "string") return size;
  return `${size.widthPercent}% ${size.heightPercent}%`;
}

export function buildImageLayerDomStyle(imageUrl, settings) {
  const safeUrl = escapeCssUrl(imageUrl);
  const position = `${settings.position.xPercent}% ${settings.position.yPercent}%`;
  const style = {
    backgroundImage: `url("${safeUrl}")`,
    backgroundPosition: position,
    backgroundSize: formatImageSize(settings.size),
    backgroundRepeat: settings.repeat,
  };
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

export function createDefaultProfileHeaderSurfaceStyle() {
  return {
    version: PROFILE_HEADER_SURFACE_STYLE_VERSION,
    stack: [
      {
        id: createStackEntryId(),
        kind: SURFACE_STACK_KIND_GRADIENT,
        type: "linear",
        angleDeg: 135,
        opacity: 1,
        visible: true,
        stops: [
          { color: "#3d1f5c", offsetPercent: 0 },
          { color: "#5c2040", offsetPercent: 100 },
        ],
      },
    ],
  };
}

export function createEmptyGradientLayer(type = "linear") {
  return {
    id: createStackEntryId(),
    kind: SURFACE_STACK_KIND_GRADIENT,
    type,
    angleDeg: 135,
    position: { xPercent: 50, yPercent: 50 },
    shape: "ellipse",
    opacity: 1,
    visible: true,
    stops: [
      { color: "#4a2d6e", offsetPercent: 0 },
      { color: "#2a1a3d", offsetPercent: 100 },
    ],
  };
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
    size: "cover",
    position: { xPercent: 50, yPercent: 50 },
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

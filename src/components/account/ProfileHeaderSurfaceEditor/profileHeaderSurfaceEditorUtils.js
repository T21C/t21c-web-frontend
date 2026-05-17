import { SURFACE_STACK_KIND_GRADIENT, SURFACE_STACK_KIND_IMAGE } from "@/utils/profileHeaderSurfaceStyle";

export function deepCloneStyle(style) {
  if (style === undefined) return undefined;
  if (style === null) return null;
  return JSON.parse(JSON.stringify(style));
}

/** Build `{ value, label }[]` for CustomSelect from string enum values. */
export function valuesToSelectOptions(values, getLabel = (v) => v) {
  return values.map((value) => ({ value, label: getLabel(value) }));
}

export function getGradientOrdinal(stack, stackIndex) {
  let ordinal = 0;
  for (let i = 0; i <= stackIndex; i += 1) {
    if (stack[i]?.kind === SURFACE_STACK_KIND_GRADIENT) ordinal += 1;
  }
  return ordinal;
}

export function canDeleteStackEntry(stack, stackIndex) {
  if (!Array.isArray(stack) || stack.length <= 1) return false;
  const entry = stack[stackIndex];
  if (!entry) return false;
  if (entry.kind === SURFACE_STACK_KIND_IMAGE) return true;
  const gradientCount = stack.filter((e) => e.kind === SURFACE_STACK_KIND_GRADIENT).length;
  const hasImage = stack.some((e) => e.kind === SURFACE_STACK_KIND_IMAGE);
  if (gradientCount <= 1 && !hasImage) return false;
  return true;
}

export function getLayerDisplayLabel(entry, stack, stackIndex, t) {
  if (entry?.label?.trim()) return entry.label.trim();
  if (entry?.kind === SURFACE_STACK_KIND_IMAGE) {
    return t("settings.headerSurface.backgroundImageRow");
  }
  if (entry?.kind === SURFACE_STACK_KIND_GRADIENT) {
    return t("settings.headerSurface.layerN", { n: getGradientOrdinal(stack, stackIndex) });
  }
  return "";
}

// tuf-search: #iconGalleryModules #icons #gallery
/**
 * Dev gallery: discover every `*.jsx` under this folder via Vite `import.meta.glob`.
 * New icon files show up automatically without editing the barrel (`index.js`).
 * Labels are derived from the file path (relative to this directory, without `.jsx`).
 */
const ICON_MODULES = import.meta.glob("./**/*.jsx", { eager: true });

function pathLabelFromGlobKey(globKey) {
  return globKey.replace(/^\.\//, "").replace(/\.jsx$/i, "");
}

function pickReactComponent(mod) {
  if (!mod || typeof mod !== "object") return null;
  if (typeof mod.default === "function") return mod.default;
  const named = Object.entries(mod).filter(
    ([key, value]) => key !== "__esModule" && typeof value === "function",
  );
  if (named.length === 0) return null;
  const pascal = named.find(([key]) => /^[A-Z]/.test(key));
  return (pascal || named[0])[1];
}

/** @returns {{ id: string; mod: Record<string, unknown> }[]} */
export function getIconGalleryModuleEntries() {
  return Object.keys(ICON_MODULES)
    .map((globKey) => ({
      id: pathLabelFromGlobKey(globKey),
      mod: ICON_MODULES[globKey],
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function resolveIconGalleryComponent(mod) {
  return pickReactComponent(mod);
}

/** Default props so gallery cells render without per-icon manual wiring. */
export function getIconGalleryDemoProps(id) {
  const base = {
    color: "var(--color-white)",
    size: 28,
    className: "assets-page__jsx-icon-svg",
  };
  if (id === "LegacyDiffIcon/LegacyDiffIcon" || id.endsWith("/LegacyDiffIcon")) {
    return { ...base, diff: "21.1+", size: 32 };
  }
  if (id === "DefaultAvatar") {
    return { size: 32, className: "assets-page__jsx-icon-svg" };
  }
  return base;
}

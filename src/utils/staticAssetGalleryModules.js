// tuf-search: #staticAssetGalleryModules #assets #gallery
const ASSET_URL_MODULES = import.meta.glob("../assets/**/*.{png,jpg,jpeg,webp,gif,svg,ico,woff2,woff,ttf}", {
  eager: true,
  query: "?url",
  import: "default",
});

function labelFromAssetGlobKey(globKey) {
  return globKey.replace(/^\.\.\/assets\//, "");
}

/** @returns {{ id: string; url: string }[]} */
export function getStaticAssetGalleryEntries() {
  return Object.entries(ASSET_URL_MODULES)
    .map(([globKey, url]) => ({
      id: labelFromAssetGlobKey(globKey),
      url: typeof url === "string" ? url : String(url),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

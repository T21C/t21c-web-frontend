/**
 * Scans client/public/banners (recursively) and writes:
 * - client/public/banners/manifest.json (served at /banners/manifest.json for the UI)
 * - BUILD_OUT_DIR/banners/manifest.json when building production assets
 *
 * Set BACKEND_BANNER_MANIFEST_PATH explicitly when a local backend checkout also
 * needs the authoritative allowlist. Container and CI builds stay independent.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(__dirname, "..");
const bannersDir = path.join(clientRoot, "public", "banners");
const backendManifestPath = process.env.BACKEND_BANNER_MANIFEST_PATH?.trim();

const IMAGE_EXT = /\.(webp|jpg|jpeg|png|gif|svg)$/i;
const SKIP_NAMES = new Set(["manifest.json", ".gitkeep"]);

function collectPresetPaths(absDir, relParts = []) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(absDir)) {
    return out;
  }
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  for (const ent of entries) {
    if (SKIP_NAMES.has(ent.name)) continue;
    const nextRel = [...relParts, ent.name];
    const abs = path.join(absDir, ent.name);
    if (ent.isDirectory()) {
      out.push(...collectPresetPaths(abs, nextRel));
    } else if (ent.isFile() && IMAGE_EXT.test(ent.name)) {
      const posix = nextRel.join("/").replace(/\\/g, "/");
      out.push(`banners/${posix}`);
    }
  }
  return out;
}

function main() {
  const found = collectPresetPaths(bannersDir);
  const unique = [...new Set(found)].sort((a, b) => a.localeCompare(b));
  const presets =
    unique.length > 0
      ? unique
      : ["banners/default.svg"];

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    presets,
  };

  fs.mkdirSync(bannersDir, { recursive: true });
  const publicOut = path.join(bannersDir, "manifest.json");
  const json = JSON.stringify(payload, null, 2);
  fs.writeFileSync(publicOut, json, "utf8");

  if (backendManifestPath) {
    const absoluteBackendManifestPath = path.resolve(clientRoot, backendManifestPath);
    fs.mkdirSync(path.dirname(absoluteBackendManifestPath), { recursive: true });
    fs.writeFileSync(absoluteBackendManifestPath, json, "utf8");
    console.log(`[generateBannerManifest] copied allowlist ➔ ${absoluteBackendManifestPath}`);
  }

  const buildOutDir = process.env.BUILD_OUT_DIR;
  if (buildOutDir && fs.existsSync(buildOutDir)) {
    const distBannersDir = path.join(buildOutDir, "banners");
    fs.mkdirSync(distBannersDir, { recursive: true });
    const distManifest = path.join(distBannersDir, "manifest.json");
    fs.writeFileSync(distManifest, json, "utf8");
    console.log(`[generateBannerManifest] build out ➔ ${path.relative(clientRoot, distManifest)}`);
  }

  console.log(`[generateBannerManifest] ${presets.length} preset(s) ➔ ${path.relative(clientRoot, publicOut)}`);
}

main();

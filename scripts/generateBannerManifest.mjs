/**
 * Scans client/public/banners (recursively) and writes:
 * - client/public/banners/manifest.json (served at /banners/manifest.json for the UI)
 * - server/src/config/bannerPresetManifest.json (authoritative allowlist for API validation)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(__dirname, "..");
const bannersDir = path.join(clientRoot, "public", "banners");
const serverManifestPath = path.join(clientRoot, "..", "server", "src", "config", "bannerPresetManifest.json");

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

  fs.mkdirSync(path.dirname(serverManifestPath), { recursive: true });
  fs.writeFileSync(serverManifestPath, json, "utf8");

  const buildOutDir = process.env.BUILD_OUT_DIR;
  if (buildOutDir && fs.existsSync(buildOutDir)) {
    const distBannersDir = path.join(buildOutDir, "banners");
    fs.mkdirSync(distBannersDir, { recursive: true });
    const distManifest = path.join(distBannersDir, "manifest.json");
    fs.writeFileSync(distManifest, json, "utf8");
    console.log(`[generateBannerManifest] build out → ${path.relative(clientRoot, distManifest)}`);
  }

  console.log(`[generateBannerManifest] ${presets.length} preset(s) → ${path.relative(clientRoot, publicOut)}`);
  console.log(`[generateBannerManifest] copied allowlist → ${serverManifestPath}`);
}

main();

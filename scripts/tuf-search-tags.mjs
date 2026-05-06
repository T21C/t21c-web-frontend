/**
 * Prepends IDE-friendly tuf-search comments to client/src sources (idempotent).
 * Usage: node scripts/tuf-search-tags.mjs [--force]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.join(__dirname, "..");
const srcRoot = path.join(clientRoot, "src");
const enPagesDir = path.join(srcRoot, "translations", "languages", "en", "pages");
const enComponentsDir = path.join(srcRoot, "translations", "languages", "en", "components");

const EXT_RE = /\.(jsx?|tsx?|css|scss)$/i;
const SUFFIX_DROP = /(Page|Popup|Tab|Panel|Modal|Drawer|Portal)$/;

/** Path segments that add little search value as hashtags */
const SKIP_PATH_SEGMENTS = new Set([
  "components",
  "pages",
  "common",
  "hooks",
  "utils",
  "contexts",
  "layouts",
  "assets",
  "lib",
  "misc",
]);

const force = process.argv.includes("--force");

/** Full first-line overrides (posix rel from src) — kept when using --force */
const MANUAL_LINE_BY_REL = new Map([
  ["utils/Utility.js", "// tuf-search: #Utility #utils — shared client helpers"],
  ["App.jsx", "// tuf-search: #App #root — application shell"],
  ["main.jsx", "// tuf-search: #main #entry — Vite entry"],
]);

/** @param {string} relFromSrc */
function normalizeRelPosix(relFromSrc) {
  return relFromSrc.split(/[/\\]/).join("/");
}

/** @param {string} relFromSrc */
function isUnderPagesDir(relFromSrc) {
  return /^pages[\\/]/.test(relFromSrc);
}

/** @param {string} name */
function looksLikeComponentFile(name) {
  const base = path.basename(name, path.extname(name));
  return /^[A-Z]/.test(base);
}

/** @param {string} pascal */
function pascalToCamel(pascal) {
  if (!pascal) return pascal;
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** @param {string} folderName e.g. SubmissionManagementPage */
function folderToContextTag(folderName) {
  if (!folderName || !/[A-Za-z]/.test(folderName)) return null;
  let stem = folderName;
  if (SUFFIX_DROP.test(stem)) stem = stem.replace(SUFFIX_DROP, "");
  if (!stem) return null;
  const tag = pascalToCamel(stem);
  return tag || null;
}

/** @param {string} folderName */
function folderToPageJsonBase(folderName) {
  if (!folderName.endsWith("Page")) return null;
  const stem = folderName.replace(/Page$/, "");
  if (!stem) return null;
  return pascalToCamel(stem);
}

/** @param {string} absJsonPath */
function readPageEnglishTitle(absJsonPath) {
  try {
    const raw = fs.readFileSync(absJsonPath, "utf8");
    const j = JSON.parse(raw);
    const header = j?.header?.title;
    if (typeof header === "string" && header.trim()) return cleanTitle(header);
    const meta = j?.meta?.title;
    if (typeof meta === "string" && meta.trim()) return cleanTitle(meta);
  } catch {
    /* ignore */
  }
  return null;
}

/** @param {string} s */
function cleanTitle(s) {
  return s.replace(/\s*\|\s*TUF\s*$/i, "").trim();
}

/** @param {string} content */
function extractTranslationNamespaces(content) {
  /** @type {string[]} */
  const out = [];
  const single = /useTranslation\s*\(\s*['"]([^'"]+)['"]\s*[,)]/g;
  let m;
  while ((m = single.exec(content)) !== null) out.push(m[1]);
  const array = /useTranslation\s*\(\s*\[([\s\S]*?)\]\s*[,)]/g;
  while ((m = array.exec(content)) !== null) {
    const inner = m[1];
    const parts = inner.match(/['"]([^'"]+)['"]/g) || [];
    for (const p of parts) out.push(p.replace(/['"]/g, ""));
  }
  return [...new Set(out)];
}

/** @param {unknown} node @param {number} depth */
function findFirstTitleLikeString(node, depth = 0) {
  if (depth > 6 || node === null || node === undefined) return null;
  if (typeof node === "string") {
    const t = node.trim();
    if (t.length > 2 && t.length < 120 && !t.includes("{{")) return t;
    return null;
  }
  if (typeof node !== "object") return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const f = findFirstTitleLikeString(item, depth + 1);
      if (f) return f;
    }
    return null;
  }
  const preferred = ["title", "heading", "label", "name"];
  for (const k of preferred) {
    if (k in node && typeof node[k] === "string") {
      const t = node[k].trim();
      if (t.length > 2 && t.length < 120 && !t.includes("{{")) return t;
    }
  }
  for (const k of Object.keys(node)) {
    if (k === "description" || k === "meta") continue;
    const f = findFirstTitleLikeString(node[k], depth + 1);
    if (f) return f;
  }
  if (node.meta && typeof node.meta === "object") {
    const t = node.meta.title;
    if (typeof t === "string") {
      const x = t.trim();
      if (x.length > 2 && x.length < 120) return cleanTitle(x);
    }
  }
  return null;
}

/** @param {string[]} namespaces */
function readComponentEnglish(namespaces) {
  for (const ns of namespaces) {
    if (ns === "common" || ns === "pages") continue;
    const abs = path.join(enComponentsDir, `${ns}.json`);
    if (!fs.existsSync(abs)) continue;
    try {
      const raw = fs.readFileSync(abs, "utf8");
      const j = JSON.parse(raw);
      const title = findFirstTitleLikeString(j);
      if (title) return title;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** @param {string} basenameNoExt */
function matchStemForPairing(basenameNoExt) {
  return basenameNoExt.toLowerCase();
}

/** @param {string} filePath absolute */
function collectFiles(filePath, acc) {
  const relFromSrc = path.relative(srcRoot, filePath);
  if (relFromSrc === "translations" || relFromSrc.startsWith(`translations${path.sep}`)) return;

  const st = fs.statSync(filePath);
  if (st.isDirectory()) {
    const base = path.basename(filePath);
    if (base === "node_modules") return;
    for (const ent of fs.readdirSync(filePath, { withFileTypes: true })) {
      collectFiles(path.join(filePath, ent.name), acc);
    }
    return;
  }
  if (!EXT_RE.test(filePath)) return;
  acc.push(filePath);
}

/** @param {string} absPath */
function readFileStripBom(absPath) {
  let s = fs.readFileSync(absPath, "utf8");
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  return s;
}

/** @param {string} content */
function hasTufSearchLine(content) {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    return /^\/\/\s*tuf-search:/.test(t) || /^\/\*\s*tuf-search:/.test(t);
  }
  return false;
}

/** @param {string} content */
function stripLeadingTufSearch(content) {
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return content;
  const t = lines[i].trim();
  if (/^\/\/\s*tuf-search:/.test(t)) {
    lines.splice(i, 1);
    return lines.join("\n");
  }
  if (/^\/\*\s*tuf-search:[\s\S]*\*\/$/.test(t)) {
    lines.splice(i, 1);
    return lines.join("\n");
  }
  return content;
}

/** @param {string} segment */
function segmentToPascalish(segment) {
  if (/[A-Z]/.test(segment) && !segment.includes("-") && !segment.includes("_")) {
    return segment;
  }
  return segment
    .split(/[-_]/)
    .map((s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ""))
    .join("");
}

/** @param {string} relFromSrc path relative to src; may include filename */
function derivePathContextTags(relFromSrc) {
  const parts = relFromSrc.split(/[/\\]/).filter(Boolean);
  /** @type {string[]} */
  const tags = [];
  for (const part of parts) {
    if (part.includes(".")) continue;
    if (SKIP_PATH_SEGMENTS.has(part.toLowerCase())) continue;
    if (!/^[A-Za-z][\w-]*$/.test(part) || part.length < 2) continue;
    const pascalish = segmentToPascalish(part);
    const tag = folderToContextTag(pascalish);
    const hashed = tag ? `#${tag}` : null;
    if (hashed && !tags.includes(hashed)) tags.push(hashed);
  }
  return tags;
}

/** @param {string} relFromSrc */
function findPageEnglishForPath(relFromSrc) {
  const parts = relFromSrc.split(/[/\\]/).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part.endsWith("Page")) {
      const base = folderToPageJsonBase(part);
      if (!base) continue;
      const jsonPath = path.join(enPagesDir, `${base}.json`);
      if (fs.existsSync(jsonPath)) {
        const title = readPageEnglishTitle(jsonPath);
        if (title) return title;
      }
    }
  }
  return null;
}

/**
 * @param {string} absPath
 * @param {string} relFromSrc
 * @param {Map<string, Map<string, string>>} dirToStemToHashtags - dir -> stem -> "#a #b"
 */
function buildHashtagLineForJs(absPath, relFromSrc, dirToStemToHashtags) {
  const ext = path.extname(absPath);
  const base = path.basename(absPath, ext);
  const dir = path.dirname(absPath);
  const dirKey = path.relative(srcRoot, dir);

  /** @type {string[]} */
  const ordered = [];

  if (base === "index") {
    const parentFolder = path.basename(dir);
    if (parentFolder && parentFolder !== "src") {
      const folderTag = folderToContextTag(
        parentFolder
          .split(/[-_]/)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join("")
      );
      if (folderTag) ordered.push(`#${folderTag}`);
      if (/^[A-Z]/.test(parentFolder)) ordered.push(`#${parentFolder}`);
    }
    ordered.push("#index");
  } else if (looksLikeComponentFile(absPath)) {
    ordered.push(`#${base}`);
    const camel = pascalToCamel(base);
    if (camel !== base.toLowerCase()) ordered.push(`#${camel}`);
  } else {
    ordered.push(`#${base}`);
  }

  const pathTags = derivePathContextTags(relFromSrc);
  for (const t of pathTags) {
    if (!ordered.includes(t)) ordered.push(t);
  }

  // De-dupe preserving order
  const seen = new Set();
  const hashtags = [];
  for (const t of ordered) {
    if (!seen.has(t)) {
      seen.add(t);
      hashtags.push(t);
    }
  }

  let english = null;
  if (isUnderPagesDir(relFromSrc)) {
    english = findPageEnglishForPath(relFromSrc);
  }
  if (!english && (ext === ".jsx" || ext === ".js")) {
    const content = readFileStripBom(absPath);
    const ns = extractTranslationNamespaces(content.slice(0, 12000));
    english = readComponentEnglish(ns);
  }

  const tagStr = hashtags.join(" ");
  let line = `// tuf-search: ${tagStr}`;
  if (english) {
    const frag = english.length > 100 ? `${english.slice(0, 97)}...` : english;
    line += ` — ${frag}`;
  }
  if (line.length > 200) {
    line = `// tuf-search: ${tagStr}`;
  }
  return line;
}

/**
 * @param {string} absPath
 * @param {string} relFromSrc
 * @param {Map<string, Map<string, string>>} dirToStemToHashtags
 */
function buildHashtagLineForCss(absPath, relFromSrc, dirToStemToHashtags) {
  const base = path.basename(absPath, path.extname(absPath));
  const dir = path.dirname(absPath);
  const dirKey = path.relative(srcRoot, dir);
  const stemKey = base.toLowerCase();

  const paired = dirToStemToHashtags.get(dirKey)?.get(stemKey);
  if (paired) {
    return `/* tuf-search: ${paired} */`;
  }

  /** @type {string[]} */
  const ordered = [];
  ordered.push(`#${base}`);

  const pathTags = derivePathContextTags(relFromSrc);
  for (const t of pathTags) {
    if (!ordered.includes(t)) ordered.push(t);
  }

  const seen = new Set();
  const hashtags = [];
  for (const t of ordered) {
    if (!seen.has(t)) {
      seen.add(t);
      hashtags.push(t);
    }
  }

  let english = null;
  if (isUnderPagesDir(relFromSrc)) {
    english = findPageEnglishForPath(relFromSrc);
  }

  const tagStr = hashtags.join(" ");
  let line = `/* tuf-search: ${tagStr}`;
  if (english) {
    const frag = english.length > 100 ? `${english.slice(0, 97)}...` : english;
    line += ` — ${frag}`;
  }
  line += ` */`;
  if (line.length > 220) {
    line = `/* tuf-search: ${tagStr} */`;
  }
  return line;
}

function main() {
  if (!fs.existsSync(srcRoot)) {
    console.error("Missing client/src");
    process.exit(1);
  }

  /** @type {string[]} */
  const all = [];
  collectFiles(srcRoot, all);

  const jsFiles = all.filter((f) => /\.(jsx?|tsx?)$/i.test(f));
  const cssFiles = all.filter((f) => /\.(css|scss)$/i.test(f));

  /** @type {Map<string, Map<string, string>>} */
  const dirToStemToHashtags = new Map();

  for (const absPath of jsFiles) {
    const rel = path.relative(srcRoot, absPath);
    const line = buildHashtagLineForJs(absPath, rel, dirToStemToHashtags);
    const m = /^\/\/\s*tuf-search:\s+(.+?)(?:\s+—\s+.+)?$/.exec(line);
    const hashtagsOnly = m ? m[1].trim() : line.replace(/^\/\/\s*tuf-search:\s+/, "").split(/\s+—\s+/)[0];
    const dir = path.dirname(absPath);
    const dirKey = path.relative(srcRoot, dir);
    const base = path.basename(absPath, path.extname(absPath));
    const stem = matchStemForPairing(base);
    if (!dirToStemToHashtags.has(dirKey)) dirToStemToHashtags.set(dirKey, new Map());
    dirToStemToHashtags.get(dirKey).set(stem, hashtagsOnly);
  }

  let updated = 0;
  let skipped = 0;

  for (const absPath of [...jsFiles, ...cssFiles]) {
    const rel = path.relative(srcRoot, absPath);
    const relPosix = normalizeRelPosix(rel);
    let content = readFileStripBom(absPath);
    if (force && hasTufSearchLine(content)) {
      content = stripLeadingTufSearch(content);
    }
    if (!force && hasTufSearchLine(content)) {
      skipped++;
      continue;
    }

    const isCss = /\.(css|scss)$/i.test(absPath);
    let line = isCss
      ? buildHashtagLineForCss(absPath, rel, dirToStemToHashtags)
      : buildHashtagLineForJs(absPath, rel, dirToStemToHashtags);
    if (!isCss && MANUAL_LINE_BY_REL.has(relPosix)) {
      line = MANUAL_LINE_BY_REL.get(relPosix);
    }

    const out = `${line}\n${content}`;
    fs.writeFileSync(absPath, out, "utf8");
    updated++;
  }

  console.log(`tuf-search-tags: updated ${updated}, skipped ${skipped}${force ? " (force)" : ""}`);
}

main();

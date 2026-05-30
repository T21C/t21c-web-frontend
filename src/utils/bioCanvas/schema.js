import { getBlockDescriptor, BLOCK_DESCRIPTORS, getBlockTypeLabel } from "./registry.js";
import {
  STAGE_WIDTH,
  STAGE_MAX_HEIGHT,
  STAGE_PADDING,
  computeNextStackY,
  createDefaultLayout,
  normalizeLayout,
} from "./layout.js";

export const BIO_CANVAS_VERSION = 1;
export const MAX_BIO_CANVAS_BLOCKS = 50;
export const MAX_BIO_CANVAS_JSON_BYTES = 65_536;
export const MAX_BIO_CANVAS_BLOCK_ID_LENGTH = 64;

export {
  STAGE_WIDTH,
  STAGE_HEIGHT,
  STAGE_MAX_HEIGHT,
  STAGE_PADDING,
  computeNextStackY,
  createDefaultLayout,
  normalizeLayout,
} from "./layout.js";

export { BLOCK_TYPE_LABELS, getBlockTypeLabel } from "./registry.js";

const BLOCK_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BioCanvasError extends Error {
  constructor(message) {
    super(message);
    this.name = "BioCanvasError";
  }
}

export function createBlockId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function parseBlockId(raw) {
  if (typeof raw !== "string" || !raw.length || raw.length > MAX_BIO_CANVAS_BLOCK_ID_LENGTH) {
    return null;
  }
  if (BLOCK_ID_RE.test(raw) || /^[a-zA-Z0-9_-]+$/.test(raw)) {
    return raw;
  }
  return null;
}

function formatZodIssues(issues) {
  return issues
    .map((issue) => {
      const path = issue.path?.length ? issue.path.join(".") : "value";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function describeBlockError(raw, index, typeCounts) {
  const position = `Block ${index + 1}`;

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return `${position}: must be an object`;
  }

  const id = parseBlockId(raw.id);
  if (!id) {
    return `${position}: invalid or missing block id`;
  }

  if (typeof raw.type !== "string" || !raw.type.trim()) {
    return `${position}: missing block type`;
  }

  const typeLabel = getBlockTypeLabel(raw.type);
  const labeled = `${position} (${typeLabel})`;

  const descriptor = getBlockDescriptor(raw.type);
  if (!descriptor) {
    return `${position}: unknown block type "${raw.type}"`;
  }

  const count = typeCounts.get(descriptor.type) ?? 0;
  if (count >= descriptor.maxPerCanvas) {
    return `${labeled}: too many ${typeLabel} blocks (maximum ${descriptor.maxPerCanvas})`;
  }

  const parsed = descriptor.dataSchema.safeParse(raw.data ?? {});
  if (!parsed.success) {
    return `${labeled}: ${formatZodIssues(parsed.error.issues)}`;
  }

  return null;
}

function parseBlock(raw, typeCounts, legacyStackY) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const id = parseBlockId(raw.id);
  if (!id) return null;
  if (typeof raw.type !== "string") return null;

  const descriptor = getBlockDescriptor(raw.type);
  if (!descriptor) return null;

  const count = typeCounts.get(descriptor.type) ?? 0;
  if (count >= descriptor.maxPerCanvas) return null;

  const parsed = descriptor.dataSchema.safeParse(raw.data ?? {});
  if (!parsed.success) return null;

  typeCounts.set(descriptor.type, count + 1);
  const layout = normalizeLayout(raw.layout, descriptor, legacyStackY);

  return {
    id,
    type: descriptor.type,
    layout,
    data: parsed.data,
  };
}

function validateCanvasStructure(input) {
  if (input === null || input === undefined) return null;

  const serialized = JSON.stringify(input);
  if (serialized.length > MAX_BIO_CANVAS_JSON_BYTES) {
    return "Canvas payload is too large";
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return "Canvas must be an object";
  }

  if (input.version !== BIO_CANVAS_VERSION) {
    return `Unsupported canvas version (expected ${BIO_CANVAS_VERSION})`;
  }

  if (!Array.isArray(input.blocks)) {
    return "Canvas blocks must be an array";
  }

  if (input.blocks.length > MAX_BIO_CANVAS_BLOCKS) {
    return `Too many blocks (maximum ${MAX_BIO_CANVAS_BLOCKS})`;
  }

  return null;
}

/** Collect human-readable validation errors for each invalid block. */
export function collectBioCanvasBlockErrors(input) {
  const structureError = validateCanvasStructure(input);
  if (structureError) return [structureError];
  if (input === null || input === undefined) return [];

  const typeCounts = new Map();
  const errors = [];

  for (let index = 0; index < input.blocks.length; index += 1) {
    const blockError = describeBlockError(input.blocks[index], index, typeCounts);
    if (blockError) {
      errors.push(blockError);
      continue;
    }

    const descriptor = getBlockDescriptor(input.blocks[index].type);
    if (descriptor) {
      const count = typeCounts.get(descriptor.type) ?? 0;
      typeCounts.set(descriptor.type, count + 1);
    }
  }

  return errors;
}

function formatBlockErrors(errors) {
  if (errors.length === 1) return errors[0];
  return `Canvas has ${errors.length} invalid blocks:\n${errors.map((err) => `• ${err}`).join("\n")}`;
}

/** Parse and validate; `null` input clears stored canvas. */
export function parseBioCanvas(input) {
  if (input === null || input === undefined) return null;

  const structureError = validateCanvasStructure(input);
  if (structureError) {
    throw new BioCanvasError(structureError);
  }

  const blockErrors = collectBioCanvasBlockErrors(input);
  if (blockErrors.length) {
    throw new BioCanvasError(formatBlockErrors(blockErrors));
  }

  const typeCounts = new Map();
  const blocks = [];
  let legacyStackY = STAGE_PADDING;

  for (const rawBlock of input.blocks) {
    const parsed = parseBlock(rawBlock, typeCounts, legacyStackY);
    if (!parsed) {
      throw new BioCanvasError("Invalid block in canvas");
    }
    blocks.push(parsed);
    legacyStackY = parsed.layout.y + parsed.layout.h + 16;
  }

  return {
    version: BIO_CANVAS_VERSION,
    blocks,
  };
}

/** Lenient parse for live editor preview. */
export function coerceBioCanvasForRender(input) {
  try {
    return parseBioCanvas(input);
  } catch {
    if (input === null || input === undefined) return null;
    if (typeof input !== "object" || Array.isArray(input)) return null;
    if (input.version !== BIO_CANVAS_VERSION || !Array.isArray(input.blocks)) return null;
    return {
      version: BIO_CANVAS_VERSION,
      blocks: input.blocks,
    };
  }
}

export function createBlock(type, id, existingBlocks = []) {
  const descriptor = getBlockDescriptor(type);
  if (!descriptor) return null;
  return {
    id: id ?? createBlockId(),
    type: descriptor.type,
    layout: createDefaultLayout(descriptor),
    data: descriptor.createDefault(),
  };
}

export function createDefaultBioCanvas() {
  const textBlock = createBlock("text", undefined, []);
  return {
    version: BIO_CANVAS_VERSION,
    blocks: textBlock ? [textBlock] : [],
  };
}

export function toPlainText(doc) {
  if (!doc?.blocks?.length) return null;
  const parts = [];
  for (const block of doc.blocks) {
    const descriptor = getBlockDescriptor(block.type);
    if (!descriptor) continue;
    const text = descriptor.toPlainText(block.data);
    if (text?.trim()) parts.push(text.trim());
  }
  if (!parts.length) return null;
  const joined = parts.join("\n\n");
  return joined.length > 2000 ? joined.slice(0, 2000) : joined;
}

export function getImageBlockIds(doc) {
  if (!doc?.blocks?.length) return [];
  return doc.blocks.filter((b) => b.type === "image").map((b) => b.id);
}

export function parseBioCanvasImageAssets(input) {
  if (input == null) return {};
  if (typeof input !== "object" || Array.isArray(input)) return {};
  const out = {};
  for (const [blockId, val] of Object.entries(input)) {
    if (!blockId || !val || typeof val !== "object") continue;
    const assetId = typeof val.assetId === "string" ? val.assetId.trim() : "";
    const url = typeof val.url === "string" ? val.url.trim() : "";
    if (assetId && url) out[blockId] = { assetId, url };
  }
  return out;
}

export function pruneBioCanvasImageAssets(doc, assets) {
  const ids = new Set(getImageBlockIds(doc));
  const next = {};
  for (const id of ids) {
    if (assets[id]) next[id] = assets[id];
  }
  return next;
}

export function upsertBioCanvasImageAsset(existing, blockId, assetId, url) {
  const assets = parseBioCanvasImageAssets(existing);
  return { ...assets, [blockId]: { assetId, url } };
}

export { BLOCK_DESCRIPTORS };

import { z } from "zod";
import { parseSafeUrl, zSafeUrl } from "../urls.js";

export const EMBED_BLOCK_TYPE = "embed";
export const MAX_EMBED_TITLE_LENGTH = 120;

const DANGEROUS_TITLE = /url\s*\(|var\s*\(|expression\s*\(|@import|javascript:|\/\*|\*\/|<\/|<>/i;

const EMBED_HOST_PATTERNS = [
  { host: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i, label: "youtube" },
  { host: /(^|\.)bilibili\.com$/i, label: "bilibili" },
];

export function getEmbedProvider(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    for (const row of EMBED_HOST_PATTERNS) {
      if (row.host.test(host)) return row.label;
    }
    return null;
  } catch {
    return null;
  }
}

/** Extract YouTube video id from common watch/short/embed URLs. */
export function extractYouTubeVideoId(url) {
  if (!url) return null;
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const longUrlRegex = /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/;
  const embedRegex = /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;
  const shortMatch = url.match(shortUrlRegex);
  const longMatch = url.match(longUrlRegex);
  const embedMatch = url.match(embedRegex);
  return shortMatch?.[1] ?? longMatch?.[1] ?? embedMatch?.[1] ?? null;
}

/** Build a YouTube iframe embed URL without hitting the video details API. */
export function getYouTubeEmbedUrl(url) {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  const timestampMatch = url.match(/[?&]t=(\d+)s?/);
  const timestamp = timestampMatch?.[1] ?? null;
  let embedUrl = `https://www.youtube.com/embed/${videoId}`;
  if (timestamp) {
    embedUrl += `?start=${timestamp}`;
  }
  return embedUrl;
}

/** Thumbnail for YouTube links without API calls. */
export function getYouTubeThumbnailUrl(url) {
  const videoId = extractYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
}

const zEmbedUrl = zSafeUrl.refine((url) => getEmbedProvider(url) !== null, {
  message: "Only YouTube and Bilibili video links are supported",
});

export const embedBlockDataSchema = z.object({
  url: zEmbedUrl,
  title: z
    .string()
    .max(MAX_EMBED_TITLE_LENGTH)
    .transform((s) => s.trim())
    .refine((s) => !DANGEROUS_TITLE.test(s), { message: "Invalid title" })
    .optional(),
});

export const embedBlockDescriptor = {
  type: EMBED_BLOCK_TYPE,
  maxPerCanvas: 10,
  defaultSize: { w: 640, h: 360 },
  resizeBehavior: "aspect",
  dataSchema: embedBlockDataSchema,
  createDefault: () => ({ url: "", title: "" }),
  toPlainText: (data) => {
    const title = data.title?.trim();
    return title ? `[video: ${title}] ${data.url}` : `[video] ${data.url}`;
  },
};

export function isLikelyEmbedUrl(raw) {
  const parsed = parseSafeUrl(raw);
  return parsed !== null && getEmbedProvider(parsed) !== null;
}

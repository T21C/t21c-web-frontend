import { z } from "zod";
import { parseSafeUrl, zSafeUrl } from "../urls";
import {
  extractYouTubeVideoId,
  getBilibiliEmbedUrl,
  getLocalVideoPreview,
  getVideoProvider,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
} from "../../videoLink";

export const EMBED_BLOCK_TYPE = "embed";
export const MAX_EMBED_TITLE_LENGTH = 120;

const DANGEROUS_TITLE = /url\s*\(|var\s*\(|expression\s*\(|@import|javascript:|\/\*|\*\/|<\/|<>/i;

export {
  extractYouTubeVideoId,
  getBilibiliEmbedUrl,
  getLocalVideoPreview,
  getVideoProvider,
  getVideoProvider as getEmbedProvider,
  getYouTubeEmbedUrl,
  getYouTubeThumbnailUrl,
};

const zEmbedUrl = zSafeUrl.refine((url) => getVideoProvider(url) !== null, {
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
  return parsed !== null && getVideoProvider(parsed) !== null;
}

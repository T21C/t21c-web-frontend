import { z } from "zod";
import { zSafeUrl } from "../urls.js";

export const SOCIAL_BLOCK_TYPE = "social";
export const MAX_SOCIAL_LINKS = 12;

export const SOCIAL_PLATFORMS = [
  "discord",
  "youtube",
  "twitter",
  "twitch",
  "github",
  "instagram",
  "tiktok",
  "steam",
  "website",
  "other",
];

export const SOCIAL_SHAPES = ["circle", "rounded", "square"];
export const SOCIAL_ALIGNMENTS = ["left", "center", "right"];
export const MIN_SOCIAL_ICON_SIZE = 24;
export const MAX_SOCIAL_ICON_SIZE = 96;
export const DEFAULT_SOCIAL_ICON_SIZE = 40;
export const MIN_SOCIAL_GAP = 0;
export const MAX_SOCIAL_GAP = 48;
export const DEFAULT_SOCIAL_GAP = 12;

export function clampSocialIconSize(value, fallback = DEFAULT_SOCIAL_ICON_SIZE) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_SOCIAL_ICON_SIZE, Math.max(MIN_SOCIAL_ICON_SIZE, n));
}

export function clampSocialGap(value, fallback = DEFAULT_SOCIAL_GAP) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_SOCIAL_GAP, Math.max(MIN_SOCIAL_GAP, n));
}

const zIconSize = z
  .number()
  .optional()
  .transform((v) => clampSocialIconSize(v ?? DEFAULT_SOCIAL_ICON_SIZE));

const zGap = z
  .number()
  .optional()
  .transform((v) => clampSocialGap(v ?? DEFAULT_SOCIAL_GAP));

export const socialBlockDataSchema = z.object({
  links: z.array(
    z.object({
      platform: z.enum(SOCIAL_PLATFORMS),
      url: zSafeUrl,
      label: z.string().max(40).optional(),
    }),
  ).max(MAX_SOCIAL_LINKS),
  iconSize: zIconSize,
  shape: z.enum(SOCIAL_SHAPES).optional().default("circle"),
  gap: zGap,
  align: z.enum(SOCIAL_ALIGNMENTS).optional().default("center"),
  showLabels: z.boolean().optional().default(false),
});

export const socialBlockDescriptor = {
  type: SOCIAL_BLOCK_TYPE,
  maxPerCanvas: 5,
  defaultSize: { w: 360, h: 64 },
  resizeBehavior: "free",
  dataSchema: socialBlockDataSchema,
  createDefault: () => ({
    links: [],
    iconSize: DEFAULT_SOCIAL_ICON_SIZE,
    shape: "circle",
    gap: DEFAULT_SOCIAL_GAP,
    align: "center",
    showLabels: false,
  }),
  toPlainText: (data) => data.links.map((l) => `${l.platform}: ${l.url}`).join(" | "),
};

import { z } from "zod";

const DANGEROUS_TEXT = /url\s*\(|var\s*\(|expression\s*\(|@import|javascript:|\/\*|\*\/|<\/|<>/i;

export const TEXT_BLOCK_TYPE = "text";
export const MAX_TEXT_HEADING_LENGTH = 120;
export const MAX_TEXT_BODY_LENGTH = 4000;
export const MIN_TEXT_FONT_SIZE = 12;
export const MAX_TEXT_FONT_SIZE = 72;
export const DEFAULT_TEXT_FONT_SIZE = 16;
export const DEFAULT_TEXT_HEADING_FONT_SIZE = 20;
export const TEXT_ALIGNMENTS = ["left", "center", "right"];
export const TEXT_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
export const DEFAULT_TEXT_COLOR_PICKER = "#e0e0e0";

export function parseTextBlockColor(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.length || trimmed.length > 7 || !TEXT_COLOR_REGEX.test(trimmed)) return null;
  return trimmed.toLowerCase();
}

const zPlainText = (max) =>
  z
    .string()
    .max(max)
    .transform((s) => s.trim())
    .refine((s) => !DANGEROUS_TEXT.test(s), { message: "Invalid text content" });

export function clampTextFontSize(value, fallback = DEFAULT_TEXT_FONT_SIZE) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_TEXT_FONT_SIZE, Math.max(MIN_TEXT_FONT_SIZE, n));
}

const zFontSize = () => z.number().optional();

const zTextColor = () =>
  z
    .string()
    .max(7)
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      return parseTextBlockColor(value) ?? undefined;
    })
    .refine((value) => value === undefined || parseTextBlockColor(value) !== null, {
      message: "Invalid text color",
    });

const zBodyText = (max) =>
  z
    .string()
    .max(max)
    .refine((s) => !DANGEROUS_TEXT.test(s), { message: "Invalid text content" });

export const textBlockDataSchema = z.object({
  heading: zPlainText(MAX_TEXT_HEADING_LENGTH).nullable().optional(),
  body: zBodyText(MAX_TEXT_BODY_LENGTH),
  fontSize: zFontSize(),
  headingFontSize: zFontSize(),
  align: z.enum(TEXT_ALIGNMENTS).optional().default("left"),
  color: zTextColor(),
});

export const textBlockDescriptor = {
  type: TEXT_BLOCK_TYPE,
  maxPerCanvas: 20,
  defaultSize: { w: 600, h: 120 },
  resizeBehavior: "text",
  dataSchema: textBlockDataSchema,
  createDefault: () => ({
    heading: null,
    body: "Sample text",
    fontSize: DEFAULT_TEXT_FONT_SIZE,
    headingFontSize: DEFAULT_TEXT_HEADING_FONT_SIZE,
    align: "left",
  }),
  toPlainText: (data) => {
    const parts = [];
    if (data.heading?.trim()) parts.push(data.heading.trim());
    if (data.body?.trim()) parts.push(data.body.trim());
    return parts.join("\n");
  },
};

import { z } from "zod";

export const IMAGE_BLOCK_TYPE = "image";
export const MAX_IMAGE_ALT_LENGTH = 200;
export const IMAGE_CROP_FITS = ["cover", "contain"];
export const DEFAULT_IMAGE_CROP = {
  fit: "cover",
  focalX: 50,
  focalY: 50,
  zoom: 1,
};

const DANGEROUS_ALT = /url\s*\(|var\s*\(|expression\s*\(|@import|javascript:|\/\*|\*\/|<\/|<>/i;

export const imageCropSchema = z.object({
  fit: z.enum(IMAGE_CROP_FITS).optional().default("cover"),
  focalX: z.number().min(0).max(100).optional().default(50),
  focalY: z.number().min(0).max(100).optional().default(50),
  zoom: z.number().min(1).max(4).optional().default(1),
});

export const imageBlockDataSchema = z.object({
  alt: z
    .string()
    .max(MAX_IMAGE_ALT_LENGTH)
    .transform((s) => s.trim())
    .refine((s) => !DANGEROUS_ALT.test(s), { message: "Invalid alt text" })
    .optional(),
  crop: imageCropSchema.optional().default({ ...DEFAULT_IMAGE_CROP }),
});

export function normalizeImageCrop(raw) {
  const parsed = imageCropSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : { ...DEFAULT_IMAGE_CROP };
}

export const imageBlockDescriptor = {
  type: IMAGE_BLOCK_TYPE,
  maxPerCanvas: 20,
  defaultSize: { w: 600, h: 400 },
  resizeBehavior: "free",
  dataSchema: imageBlockDataSchema,
  createDefault: () => ({ crop: { ...DEFAULT_IMAGE_CROP } }),
  toPlainText: (data) => (data.alt?.trim() ? `[image: ${data.alt}]` : "[image]"),
};

// tuf-search: #validateCdnBannerImage #cdn
import { isCdnSupportedImageMimeType } from "@/config/constants/cdnImageAccept.js";

/**
 * Matches `getValidationOptionsForType('BANNER')` and `multerMemoryCdnImage10Mb`.
 * @see server/src/externalServices/cdnService/services/imageValidator.ts
 * @see server/src/config/multerMemoryUploads.ts
 */
export const CDN_BANNER_IMAGE_LIMITS = Object.freeze({
  maxBytes: 10 * 1024 * 1024,
  maxMb: 10,
  minWidth: 64,
  minHeight: 32,
  maxWidth: 3840,
  maxHeight: 2160,
});

/**
 * @param {File} file
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function readImageFileDimensions(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const dims = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      return dims;
    }
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error("decode"));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * @param {File | null | undefined} file
 * @returns {Promise<
 *   | { ok: true }
 *   | { ok: false, reason: 'invalidFile' | 'invalidFileType' | 'fileTooLarge' | 'dimensionsTooSmall' | 'unreadable', maxMb?: number, minWidth?: number, minHeight?: number }
 * >}
 */
export async function validateCdnBannerImageFile(file) {
  if (!file) {
    return { ok: false, reason: "invalidFile" };
  }
  if (!isCdnSupportedImageMimeType(file.type)) {
    return { ok: false, reason: "invalidFileType" };
  }
  if (file.size > CDN_BANNER_IMAGE_LIMITS.maxBytes) {
    return {
      ok: false,
      reason: "fileTooLarge",
      maxMb: CDN_BANNER_IMAGE_LIMITS.maxMb,
    };
  }
  if (file.type === "image/svg+xml") {
    return { ok: true };
  }
  let width;
  let height;
  try {
    ({ width, height } = await readImageFileDimensions(file));
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (!width || !height) {
    return { ok: false, reason: "unreadable" };
  }
  if (
    width < CDN_BANNER_IMAGE_LIMITS.minWidth ||
    height < CDN_BANNER_IMAGE_LIMITS.minHeight
  ) {
    return {
      ok: false,
      reason: "dimensionsTooSmall",
      minWidth: CDN_BANNER_IMAGE_LIMITS.minWidth,
      minHeight: CDN_BANNER_IMAGE_LIMITS.minHeight,
    };
  }
  return { ok: true };
}

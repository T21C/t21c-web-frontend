// tuf-search: #cdnImageAccept #constants
/**
 * MIME types allowed for CDN image uploads.
 * Keep in sync with `IMAGE_TYPES[].formats` (server) and `CDN_IMAGE_MIME_TYPES` in multerMemoryUploads.ts.
 */
export const CDN_IMAGE_MIME_TYPES = Object.freeze([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

/** Comma-separated list for `<input type="file" accept={...} />` */
export const CDN_IMAGE_ACCEPT = CDN_IMAGE_MIME_TYPES.join(',');

/**
 * @param {string} mimeType - `File#type` from the browser
 * @returns {boolean}
 */
export function isCdnSupportedImageMimeType(mimeType) {
  return Boolean(mimeType && CDN_IMAGE_MIME_TYPES.includes(mimeType));
}

/**
 * @param {string} mimeType
 * @returns {string} Extension with leading dot (e.g. `.png`)
 */
export function cdnImageExtensionFromMime(mimeType) {
  switch (mimeType) {
    case "image/jpeg":
    case "image/jpg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".png";
  }
}

/**
 * Output file metadata for CDN uploads, preserving the browser-reported MIME type.
 * @param {File} file
 * @param {string} [defaultBaseName]
 */
export function cdnImageOutputFromFile(file, defaultBaseName = "image") {
  const mimeType = file.type || "image/png";
  const ext = cdnImageExtensionFromMime(mimeType);
  const rawName = typeof file.name === "string" ? file.name.trim() : "";
  const fileName =
    rawName && rawName.toLowerCase().endsWith(ext) ? rawName : `${defaultBaseName}${ext}`;
  return { mimeType, fileName };
}

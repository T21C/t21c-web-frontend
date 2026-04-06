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

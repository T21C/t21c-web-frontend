/**
 * Utility functions for handling archive uploads.
 *
 * Supports the same archive formats accepted by the server's archiveService
 * (.zip / .rar / .7z / .tar / .gz / .tgz). Browsers report archive MIME types
 * inconsistently — especially for RAR / 7z / tar — so we accept either an
 * approved MIME type *or* an approved file extension.
 *
 * NOTE: Filenames are no longer hex-encoded on transport. The chunked upload flow carries
 * the raw UTF-8 file name inside a JSON init body; the server NFC-normalises it on receipt.
 * The legacy multipart submission flow relies on `form-data`/browser multipart encoding, which
 * handles UTF-8 filenames correctly on all modern targets.
 */

/** MIME types we accept for archive uploads. Order matches `application/zip` legacy behaviour first. */
export const ACCEPTED_ARCHIVE_MIMES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
  'application/x-compressed-tar',
]);

/** File extensions we accept (lowercased, leading dot). Includes compound `.tar.gz`. */
export const ACCEPTED_ARCHIVE_EXTENSIONS = [
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.tar.gz',
  '.tgz',
  '.gz',
];

/** `accept=` attribute string for `<input type="file">` elements. */
export const ARCHIVE_ACCEPT_ATTR = ACCEPTED_ARCHIVE_EXTENSIONS.join(',');

/**
 * Returns true when `filename` ends with one of the supported archive extensions.
 * Case-insensitive; checks compound `.tar.gz` before `.gz`.
 */
export const hasAcceptedArchiveExtension = (filename) => {
  if (typeof filename !== 'string') return false;
  const lower = filename.toLowerCase();
  return ACCEPTED_ARCHIVE_EXTENSIONS.some(ext => lower.endsWith(ext));
};

/**
 * True when the file's MIME or extension is recognised as a supported archive.
 *
 * Accepting either condition matters: many browsers send empty/`application/octet-stream`
 * for `.rar` and `.7z`, and macOS sometimes reports `.tar` as `application/x-tar` and
 * other times as nothing.
 */
export const isAcceptedArchiveFile = (file) => {
  if (!file) return false;
  const mimeOk = !!file.type && ACCEPTED_ARCHIVE_MIMES.has(file.type);
  return mimeOk || hasAcceptedArchiveExtension(file.name);
};

/**
 * Prepares an archive file for upload. Validates type/extension and returns the file
 * plus its NFC-normalised original name.
 *
 * @param {File} file
 * @returns {{ file: File, originalName: string, size: number } | null}
 */
export const prepareArchiveForUpload = (file) => {
  if (!file) return null;
  if (!isAcceptedArchiveFile(file)) {
    throw new Error('Invalid file type. Supported formats: .zip, .rar, .7z, .tar, .tar.gz, .tgz.');
  }
  return {
    file,
    originalName: typeof file.name === 'string' ? file.name.normalize('NFC') : file.name,
    size: file.size,
  };
};

/**
 * Backwards-compatible alias. Older call sites still import `prepareZipForUpload`;
 * the new API is `prepareArchiveForUpload`. Both accept any supported archive format.
 *
 * @deprecated Use {@link prepareArchiveForUpload}.
 */
export const prepareZipForUpload = prepareArchiveForUpload;

/**
 * Validates an archive file's size.
 * @param {File} file
 * @param {number} [maxSizeMB]
 * @returns {boolean}
 */
export const validateArchiveSize = (file, maxSizeMB = 100) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/** @deprecated Use {@link validateArchiveSize}. */
export const validateZipSize = validateArchiveSize;

/**
 * Formats file size for display.
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

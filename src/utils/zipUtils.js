/**
 * Utility functions for handling zip file operations.
 *
 * NOTE: Filenames are no longer hex-encoded on transport. The chunked upload flow carries
 * the raw UTF-8 file name inside a JSON init body; the server NFC-normalises it on receipt.
 * The legacy multipart submission flow relies on `form-data`/browser multipart encoding, which
 * handles UTF-8 filenames correctly on all modern targets.
 */

/**
 * Prepares a zip file for upload. Validates type and returns the file plus its original name.
 * @param {File} file
 * @returns {{ file: File, originalName: string, size: number } | null}
 */
export const prepareZipForUpload = (file) => {
  if (!file) return null;
  if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
    throw new Error('Invalid file type. Please upload a zip file.');
  }
  return {
    file,
    originalName: typeof file.name === 'string' ? file.name.normalize('NFC') : file.name,
    size: file.size,
  };
};

/**
 * Validates a zip file's size.
 * @param {File} file
 * @param {number} [maxSizeMB]
 * @returns {boolean}
 */
export const validateZipSize = (file, maxSizeMB = 100) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * Formats file size for display
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
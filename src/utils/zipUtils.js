/**
 * Utility functions for handling zip file operations
 */

/**
 * Prepares a zip file for upload by encoding the original filename
 * @param {File} file - The zip file to prepare
 * @returns {Object} Object containing the prepared file and original name
 */
export const prepareZipForUpload = (file) => {
  if (!file) return null;

  // Validate file type
  if (file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
    throw new Error('Invalid file type. Please upload a zip file.');
  }

  // Create a new File object with the encoded name
  const encodedName = encodeFilename(file.name);
  const preparedFile = new File([file], encodedName, {
    type: file.type,
    lastModified: file.lastModified,
  });

  return {
    file: preparedFile,
    originalName: file.name,
    size: file.size
  };
};

/**
 * Encodes a filename to UTF-8 hex to handle special characters
 * @param {string} filename - The filename to encode
 * @returns {string} The encoded filename
 */
export const encodeFilename = (filename) => {
  return Array.from(new TextEncoder().encode(filename))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Decodes a hex-encoded filename back to UTF-8
 * @param {string} encodedFilename - The encoded filename
 * @returns {string} The decoded filename
 */
export const decodeFilename = (encodedFilename) => {
  const hex = encodedFilename.match(/.{1,2}/g) || [];
  const bytes = new Uint8Array(hex.map(byte => parseInt(byte, 16)));
  return new TextDecoder().decode(bytes);
};

/**
 * Validates a zip file's size
 * @param {File} file - The zip file to validate
 * @param {number} maxSizeMB - Maximum size in megabytes
 * @returns {boolean} Whether the file size is valid
 */
export const validateZipSize = (file, maxSizeMB = 140) => {
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
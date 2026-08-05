// tuf-search: #packDownloadUtils
import { formatFileSize } from './zipUtils';

const LEVEL_TYPE = 'level';
const FOLDER_TYPE = 'folder';

const extractItemSize = (item) => {
  if (!item || item.type !== LEVEL_TYPE) return null;
  const rawSize = item.downloadSizeBytes ?? item.cdnDownload?.size;
  return typeof rawSize === 'number' && !Number.isNaN(rawSize) ? rawSize : null;
};

const aggregateItems = (items = []) => {
  return items.reduce(
    (acc, item) => {
      if (!item) {
        return acc;
      }

      if (item.type === LEVEL_TYPE) {
        const size = extractItemSize(item);
        if (size != null) {
          acc.totalBytes += size;
        } else {
          acc.missingCount += 1;
        }
        acc.levelCount += 1;
        return acc;
      }

      if (item.type === FOLDER_TYPE && Array.isArray(item.children)) {
        const childSummary = aggregateItems(item.children);
        acc.totalBytes += childSummary.totalBytes;
        acc.missingCount += childSummary.missingCount;
        acc.levelCount += childSummary.levelCount;
        return acc;
      }

      return acc;
    },
    { totalBytes: 0, missingCount: 0, levelCount: 0 }
  );
};

export const summarizePackSize = (items = []) => aggregateItems(items);

export const summarizeFolderSize = (folder) => {
  if (!folder || folder.type !== FOLDER_TYPE) {
    return { totalBytes: 0, missingCount: 0, levelCount: 0 };
  }
  return aggregateItems(folder.children || []);
};

const aggregateFolderClears = (items = []) => {
  return items.reduce(
    (acc, item) => {
      if (!item) return acc;

      if (item.type === LEVEL_TYPE) {
        acc.total += 1;
        if (item.isCleared) acc.cleared += 1;
        return acc;
      }

      if (item.type === FOLDER_TYPE && Array.isArray(item.children)) {
        const child = aggregateFolderClears(item.children);
        acc.total += child.total;
        acc.cleared += child.cleared;
        return acc;
      }

      return acc;
    },
    { cleared: 0, total: 0 },
  );
};

/**
 * Nested clear progress for a list of pack tree items (folders + levels).
 * @returns {{ cleared: number, total: number, percent: number }}
 */
export const summarizePackClears = (items = []) => {
  const { cleared, total } = aggregateFolderClears(items);
  return {
    cleared,
    total,
    percent: total > 0 ? Math.round((cleared / total) * 100) : 0,
  };
};

/**
 * Nested clear progress for a pack folder (all descendant levels).
 * @returns {{ cleared: number, total: number, percent: number }}
 */
export const summarizeFolderClears = (folder) => {
  if (!folder || folder.type !== FOLDER_TYPE) {
    return { cleared: 0, total: 0, percent: 0 };
  }
  return summarizePackClears(folder.children || []);
};

export const formatEstimatedSize = ({ totalBytes, missingCount } = {}) => {
  const sizeLabel =
    typeof totalBytes === 'number' && totalBytes > 0
      ? formatFileSize(totalBytes)
      : '0 Bytes';

  const mc = typeof missingCount === 'number' && missingCount > 0 ? missingCount : 0;
  return { sizeLabel, missingCount: mc };
};


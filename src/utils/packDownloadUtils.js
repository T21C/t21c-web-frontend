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

export const formatEstimatedSize = ({ totalBytes, missingCount }) => {
  const sizeLabel =
    typeof totalBytes === 'number' && totalBytes > 0
      ? formatFileSize(totalBytes)
      : '0 Bytes';

  if (missingCount > 0) {
    return { 
      sizeLabel, 
      isEstimated: `(estimated, ${missingCount} items missing metadata)`,
      shortEstimated: `(est., ${missingCount} missing)`
    };
  }

  return { sizeLabel, isEstimated: null, shortEstimated: null };
};


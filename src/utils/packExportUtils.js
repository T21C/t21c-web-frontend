// tuf-search: #packExportUtils #pack #export
import { formatCreatorDisplay } from '@/utils/Utility';
import { getSongDisplayName, getArtistDisplayName } from '@/utils/levelHelpers';
import {
  getCurationTypesResolved,
  sortCurationsForDisplay,
} from '@/utils/curationTypeUtils';

export const PACK_EXPORT_HEADERS = [
  'Folder',
  'TUF ID',
  'Song',
  'Artist',
  'Creator',
  'Rating',
  'Curation',
  'Video Link',
  'Download',
  'Clear Amount',
];

const sortItemsByOrder = (items = []) =>
  [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

function formatCurationColumn(level, curationTypesDict) {
  const curations = sortCurationsForDisplay(level?.curations, curationTypesDict);
  const names = [];
  for (const curation of curations) {
    const types = getCurationTypesResolved(curation, curationTypesDict);
    for (const type of types) {
      if (type?.name) names.push(type.name);
    }
  }
  return [...new Set(names)].join(', ');
}

function sanitizeFolderSegment(name) {
  return String(name ?? '')
    .replace(/[/\\]/g, '_')
    .trim();
}

function joinFolderPath(segments) {
  return segments
    .map(sanitizeFolderSegment)
    .filter(Boolean)
    .join('/');
}

function emptyFolderRowCells(folderPath) {
  return [folderPath, '', '', '', '', '', '', '', '', ''];
}

function traversePackTree(items, includeFolders, folderPathSegments, onRow) {
  const sorted = sortItemsByOrder(items);
  for (const item of sorted) {
    if (item.type === 'folder') {
      const segment = sanitizeFolderSegment(item.name);
      const childSegments = segment ? [...folderPathSegments, segment] : folderPathSegments;
      const folderPath = joinFolderPath(childSegments);

      if (includeFolders && folderPath) {
        onRow({ kind: 'folder', folderPath });
      }
      if (item.children?.length) {
        traversePackTree(item.children, includeFolders, childSegments, onRow);
      }
    } else if (item.type === 'level') {
      onRow({
        kind: 'level',
        item,
        folderPath: joinFolderPath(folderPathSegments),
      });
    }
  }
}

export function sanitizeFilename(name) {
  const base = (name || 'pack')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 120);
  return base || 'pack';
}

export function buildExportRows(
  pack,
  packItems,
  { includeFolders },
  { difficultyDict, curationTypesDict, unavailableLabel = 'Unavailable' },
) {
  const rows = [];

  traversePackTree(packItems, includeFolders, [], (entry) => {
    if (entry.kind === 'folder') {
      rows.push({
        kind: 'folder',
        cells: emptyFolderRowCells(entry.folderPath),
      });
      return;
    }

    const { item, folderPath } = entry;
    const level = item.referencedLevel;
    const levelId = level?.id ?? item.levelId;
    if (levelId == null) return;

    if (!level) {
      rows.push({
        kind: 'level',
        cells: [
          folderPath,
          levelId,
          unavailableLabel,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
        ],
      });
      return;
    }

    rows.push({
      kind: 'level',
      cells: [
        folderPath,
        levelId,
        getSongDisplayName(level),
        getArtistDisplayName(level),
        formatCreatorDisplay(level),
        difficultyDict?.[level.diffId]?.name ?? '',
        formatCurationColumn(level, curationTypesDict),
        level.videoLink ?? '',
        level.dlLink || level.workshopLink || level.ws || '',
        level.clears ?? '',
      ],
    });
  });

  return { headers: PACK_EXPORT_HEADERS, rows };
}

function escapeCsvCell(value) {
  if (value == null || value === '') return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToAoa(headers, rows) {
  return [headers, ...rows.map((row) => row.cells)];
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadPackExport({ format, packName, headers, rows }) {
  const ext = format === 'xlsx' ? 'xlsx' : 'csv';
  const filename = `${sanitizeFilename(packName)}_export.${ext}`;
  const aoa = rowsToAoa(headers, rows);

  if (format === 'csv') {
    const body = aoa.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', body], { type: 'text/csv;charset=utf-8' });
    triggerBlobDownload(blob, filename);
    return;
  }

  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
  XLSX.writeFile(workbook, filename);
}

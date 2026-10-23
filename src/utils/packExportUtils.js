// tuf-search: #packExportUtils #pack #export
import { formatCreatorDisplay, sortLevelCredits } from '@/utils/Utility';
import { getSongDisplayName, getArtistDisplayName } from '@/utils/levelHelpers';
import {
  getCurationTypesResolved,
  sortCurationsForDisplay,
} from '@/utils/curationTypeUtils';
import { parseCurationFamilyTier } from '@/utils/curationTypeFamilies';
import { normalizeTagIds, tagRequestDiff } from '@/components/requests/levelRequestShared';

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
  'Charters',
  'VFXers',
];

export const LEVEL_LIST_EXPORT_HEADERS = PACK_EXPORT_HEADERS.filter(
  (header) => header !== 'Folder',
);

export const REQUEST_EXPORT_HEADERS = [
  'levelId',
  'Song',
  'Artist',
  'Creator',
  'Difficulty',
  'reason',
];

const sortItemsByOrder = (items = []) =>
  [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

function joinCreditNamesByRole(level, role) {
  const credits = sortLevelCredits(level?.levelCredits);
  if (credits.length === 0) return '';

  return credits
    .filter((credit) => credit?.role?.toLowerCase() === role)
    .map((credit) => credit?.creator?.name.replace(/,/g, ' ') ?? '')
    .join(', ');
}

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
  return [folderPath, '', '', '', '', '', '', '', '', '', '', ''];
}

function unavailableLevelCells(levelId, unavailableLabel) {
  return [
    levelId,
    unavailableLabel,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];
}

/**
 * Flat level columns matching pack export (without Folder).
 * @returns {Array} cells for LEVEL_LIST_EXPORT_HEADERS
 */
export function buildLevelExportCells(
  level,
  { difficultyDict, curationTypesDict, unavailableLabel = 'Unavailable' } = {},
) {
  if (!level) {
    return unavailableLevelCells('', unavailableLabel);
  }

  return [
    level.id ?? '',
    getSongDisplayName(level),
    getArtistDisplayName(level),
    formatCreatorDisplay(level),
    difficultyDict?.[level.diffId]?.name ?? '',
    formatCurationColumn(level, curationTypesDict),
    level.videoLink ?? '',
    level.dlLink || level.workshopLink || level.ws || '',
    level.clears ?? '',
    joinCreditNamesByRole(level, 'charter'),
    joinCreditNamesByRole(level, 'vfxer'),
  ];
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
  const dicts = { difficultyDict, curationTypesDict, unavailableLabel };

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
        cells: [folderPath, ...unavailableLevelCells(levelId, unavailableLabel)],
      });
      return;
    }

    rows.push({
      kind: 'level',
      cells: [folderPath, ...buildLevelExportCells(level, dicts)],
    });
  });

  return { headers: PACK_EXPORT_HEADERS, rows };
}

/**
 * Flat spreadsheet rows for a list of level search hits (no Folder column).
 */
export function buildLevelListExportRows(
  levels,
  { difficultyDict, curationTypesDict, unavailableLabel = 'Unavailable' } = {},
) {
  const dicts = { difficultyDict, curationTypesDict, unavailableLabel };
  const rows = [];

  for (const level of levels || []) {
    const levelId = level?.id;
    if (levelId == null && !level) continue;

    if (!level || levelId == null) {
      rows.push({
        kind: 'level',
        cells: unavailableLevelCells(levelId ?? '', unavailableLabel),
      });
      continue;
    }

    rows.push({
      kind: 'level',
      cells: buildLevelExportCells(level, dicts),
    });
  }

  return { headers: LEVEL_LIST_EXPORT_HEADERS, rows };
}

function requestLevelForCreator(level) {
  const fromTeamName = typeof level?.teamName === 'string' ? level.teamName.trim() : '';
  const fromTeam = typeof level?.team === 'string'
    ? level.team.trim()
    : String(level?.team?.name || '').trim();
  const team = fromTeamName || fromTeam;
  return {
    ...level,
    team: team || null,
  };
}

function curationTypeName(id, curationTypesDict) {
  const dict = curationTypesDict || {};
  const type = dict[id] ?? dict[String(id)];
  return type?.name ? String(type.name) : `#${id}`;
}

function curationRerateAddRemoveIds(request) {
  const payload = request?.payload || {};
  if (Array.isArray(payload.addCurationTypeIds) || Array.isArray(payload.removeCurationTypeIds)) {
    return {
      addIds: normalizeTagIds(payload.addCurationTypeIds),
      removeIds: normalizeTagIds(payload.removeCurationTypeIds),
    };
  }
  return tagRequestDiff(payload?.curationTypeIds, request?.level?.curationTypeIds);
}

function curationRerateChangeLines(request, curationTypesDict) {
  if (request?.type !== 'curation_rerate') return [];

  const { addIds, removeIds } = curationRerateAddRemoveIds(request);
  const addByFamily = new Map();
  for (const id of addIds) {
    const name = curationTypeName(id, curationTypesDict);
    const parsed = parseCurationFamilyTier(name);
    if (!parsed) continue;
    const queue = addByFamily.get(parsed.letter);
    if (queue) queue.push(name);
    else addByFamily.set(parsed.letter, [name]);
  }

  const lines = [];
  for (const id of removeIds) {
    const name = curationTypeName(id, curationTypesDict);
    const parsed = parseCurationFamilyTier(name);
    if (!parsed) continue;
    const queue = addByFamily.get(parsed.letter);
    if (!queue?.length) continue;
    lines.push(`${name} > ${queue.shift()}`);
  }
  return lines;
}

function formatRequestExportReason(request, curationTypesDict) {
  const reason = request?.reason == null ? '' : String(request.reason);
  const lines = curationRerateChangeLines(request, curationTypesDict);
  if (lines.length === 0) return reason;
  if (!reason.trim()) return lines.join('\n');
  return `${lines.join('\n')}\n${reason}`;
}

/**
 * Spreadsheet rows for level requests.
 * Columns: levelId, Song, Artist, Creator, Difficulty, reason.
 */
export function buildRequestExportRows(
  requests,
  { difficultyDict, curationTypesDict, unavailableLabel = 'Unavailable' } = {},
) {
  const rows = [];

  for (const request of requests || []) {
    if (!request) continue;

    const level = request.level;
    const levelId = level?.id ?? request.levelId ?? '';
    const reason = formatRequestExportReason(request, curationTypesDict);

    if (!level || level.missing) {
      rows.push({
        kind: 'level',
        cells: [levelId, unavailableLabel, '', '', '', reason],
      });
      continue;
    }

    const difficultyName = level.difficulty?.name
      || difficultyDict?.[level.diffId]?.name
      || '';

    rows.push({
      kind: 'level',
      cells: [
        levelId,
        getSongDisplayName(level),
        getArtistDisplayName(level),
        formatCreatorDisplay(requestLevelForCreator(level)),
        difficultyName,
        reason,
      ],
    });
  }

  return { headers: REQUEST_EXPORT_HEADERS, rows };
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

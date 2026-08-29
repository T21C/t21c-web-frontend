export const DEFAULT_MOD_SORT = 'name-asc';

export const MOD_SORT_OPTIONS = [
  { value: 'name-asc', labelKey: 'nameAsc' },
  { value: 'name-desc', labelKey: 'nameDesc' },
  { value: 'date-desc', labelKey: 'dateNewest' },
  { value: 'date-asc', labelKey: 'dateOldest' },
  { value: 'creator-asc', labelKey: 'creatorAsc' },
  { value: 'creator-desc', labelKey: 'creatorDesc' },
];

function text(value) {
  return String(value || '');
}

function compareText(a, b) {
  return text(a).localeCompare(text(b), undefined, { numeric: true, sensitivity: 'base' });
}

function uploadedMs(mod) {
  const parsed = Date.parse(mod?.sourceUploadedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareModsBySort(a, b, sort) {
  switch (sort) {
    case 'name-desc':
      return compareText(b.name, a.name) || a.id - b.id;
    case 'date-desc':
      return uploadedMs(b) - uploadedMs(a) || compareText(a.name, b.name) || a.id - b.id;
    case 'date-asc':
      return uploadedMs(a) - uploadedMs(b) || compareText(a.name, b.name) || a.id - b.id;
    case 'creator-asc':
      return (
        compareText(a.creatorUsername, b.creatorUsername) ||
        compareText(a.name, b.name) ||
        a.id - b.id
      );
    case 'creator-desc':
      return (
        compareText(b.creatorUsername, a.creatorUsername) ||
        compareText(a.name, b.name) ||
        a.id - b.id
      );
    case 'name-asc':
    default:
      return compareText(a.name, b.name) || a.id - b.id;
  }
}

export function sortMods(mods, sort) {
  return [...mods].sort((a, b) => compareModsBySort(a, b, sort));
}

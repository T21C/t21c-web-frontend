// tuf-search: #sortPendingSubmissions #submissionLock #admin #submissionManagement
import api from '@/utils/api';

function sortNumber(row) {
  if (row.sortValue === null) return null;
  if (row.sortValue != null && Number.isFinite(Number(row.sortValue))) return Number(row.sortValue);
  const time = new Date(row.createdAt).getTime();
  return Number.isFinite(time) ? time : null;
}

function tieNumber(value) {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function compareTie(a, b, dir) {
  const aValue = tieNumber(a);
  const bValue = tieNumber(b);
  if (aValue == null || bValue == null || aValue === bValue) return 0;
  const delta = aValue - bValue;
  return dir === 'asc' ? delta : -delta;
}

export function itemBelongsInLoadedWindow(item, loaded, hasMore, dir = 'desc') {
  if (!item) return false;
  if (!loaded?.length) return true;
  if (!hasMore) return true;
  const last = loaded[loaded.length - 1];
  if (!last || last.id === item.id) return true;
  return sortPendingSubmissions([item, last], dir)[0]?.id === item.id;
}

export function sortPendingSubmissions(list, dir = 'desc') {
  return [...(list || [])].sort((a, b) => {
    const lockDelta = Number(Boolean(a.isLocked)) - Number(Boolean(b.isLocked));
    if (lockDelta !== 0) return lockDelta;
    const aValue = sortNumber(a);
    const bValue = sortNumber(b);
    if (aValue == null || bValue == null) {
      if (aValue == null && bValue == null) return b.id - a.id;
      return aValue == null ? 1 : -1;
    }
    if (aValue !== bValue) {
      const delta = aValue - bValue;
      return dir === 'asc' ? delta : -delta;
    }
    const tieDelta = compareTie(a.sortTie, b.sortTie, dir);
    if (tieDelta !== 0) return tieDelta;
    const volumeDelta = compareTie(a.sortVolume, b.sortVolume, dir);
    if (volumeDelta !== 0) return volumeDelta;
    return b.id - a.id;
  });
}

export async function togglePendingSubmissionLock({
  lockUrl,
  submission,
  setSubmissions,
  parkOffPage = false,
  dir = 'desc',
  onAlreadyHandled,
}) {
  const nextLocked = !submission.isLocked;
  const response = await api.put(lockUrl, { isLocked: nextLocked });
  if (response.status === 202) {
    onAlreadyHandled?.(response.data);
    return null;
  }
  setSubmissions((prev) => {
    const updated = prev.map((row) => (
      row.id === submission.id ? { ...row, isLocked: nextLocked } : row
    ));
    if (nextLocked && parkOffPage) {
      return updated.filter((row) => row.id !== submission.id);
    }
    return sortPendingSubmissions(updated, dir);
  });
  return nextLocked;
}

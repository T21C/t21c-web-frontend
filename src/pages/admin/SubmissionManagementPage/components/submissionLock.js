// tuf-search: #sortPendingSubmissions #submissionLock #admin #submissionManagement
import api from '@/utils/api';

export function sortPendingSubmissions(list) {
  return [...(list || [])].sort((a, b) => {
    const lockDelta = Number(Boolean(a.isLocked)) - Number(Boolean(b.isLocked));
    if (lockDelta !== 0) return lockDelta;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
}

export async function togglePendingSubmissionLock({
  lockUrl,
  submission,
  setSubmissions,
  parkOffPage = false,
}) {
  const nextLocked = !submission.isLocked;
  await api.put(lockUrl, { isLocked: nextLocked });
  setSubmissions((prev) => {
    const updated = prev.map((row) => (
      row.id === submission.id ? { ...row, isLocked: nextLocked } : row
    ));
    if (nextLocked && parkOffPage) {
      return updated.filter((row) => row.id !== submission.id);
    }
    return sortPendingSubmissions(updated);
  });
  return nextLocked;
}

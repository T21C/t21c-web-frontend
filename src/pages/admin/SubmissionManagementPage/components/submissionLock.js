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
}) {
  const nextLocked = !submission.isLocked;
  await api.put(lockUrl, { isLocked: nextLocked });
  setSubmissions((prev) =>
    sortPendingSubmissions(
      prev.map((row) => (row.id === submission.id ? { ...row, isLocked: nextLocked } : row)),
    ),
  );
}

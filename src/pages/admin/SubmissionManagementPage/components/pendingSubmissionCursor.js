// tuf-search: #encodePendingSubmissionCursor #pendingSubmissionCursor #admin #submissionManagement

export const PENDING_SUBMISSION_PAGE_SIZE = 15;

export function encodePendingSubmissionCursor(row, sort = 'submitted', dir = 'desc') {
  const time = new Date(row.createdAt).getTime();
  const createdAt = Number.isFinite(time) ? new Date(time).toISOString() : new Date(0).toISOString();
  let value = null;
  if (sort === 'submitted') {
    value = Number.isFinite(time) ? time : null;
  } else if (row.sortValue != null && Number.isFinite(Number(row.sortValue))) {
    value = Number(row.sortValue);
  }
  const cursor = {
    isLocked: row.isLocked ? 1 : 0,
    createdAt,
    id: row.id,
    sort,
    dir,
    value,
  };
  if (sort === 'ratio') {
    const tie = Number(row.sortTie);
    const volume = Number(row.sortVolume);
    cursor.tie = Number.isFinite(tie) ? tie : 0;
    cursor.volume = Number.isFinite(volume) ? volume : 0;
  }
  return btoa(JSON.stringify(cursor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

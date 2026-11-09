// tuf-search: #encodePendingSubmissionCursor #pendingSubmissionCursor #admin #submissionManagement

export const PENDING_SUBMISSION_PAGE_SIZE = 15;

export function encodePendingSubmissionCursor(row) {
  const createdAt = new Date(row.createdAt).toISOString();
  const cursor = {
    isLocked: row.isLocked ? 1 : 0,
    createdAt,
    id: row.id,
  };
  return btoa(JSON.stringify(cursor)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

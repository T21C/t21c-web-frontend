// tuf-search: #submissionSearch #admin #submissionManagement

export function filterSubmissionsByMatchedIds(submissions, matchedIds) {
  if (matchedIds == null) return submissions;
  const ids = new Set(matchedIds);
  return submissions.filter((submission) => ids.has(submission.id));
}

/** @typedef {'approve' | 'decline' | 'placeholder'} SubmissionCardPhase */

export const SUBMISSION_DISMISS_MS = 1000;

export function hasVisibleSubmissions(submissions, cardPhases) {
  return submissions.some((s) => cardPhases[s.id] !== 'placeholder');
}

/**
 * @param {string} baseClass
 * @param {SubmissionCardPhase | undefined} phase
 */
export function getSubmissionCardClassName(baseClass, phase) {
  if (phase === 'placeholder') {
    return `${baseClass} submission-card--placeholder`;
  }
  if (phase === 'approve' || phase === 'decline') {
    return `${baseClass} ${phase}`;
  }
  return baseClass;
}

export function clearCardPhase(setCardPhases, submissionId) {
  setCardPhases((prev) => {
    const next = { ...prev };
    delete next[submissionId];
    return next;
  });
}

/** @typedef {'queued' | 'processing' | 'complete' | 'declined' | 'error' | 'approve' | 'decline' | 'dismissing' | 'dismissing-complete' | 'dismissing-declined' | 'placeholder'} SubmissionCardPhase */

export const SUBMISSION_DISMISS_MS = 1000;
export const CARD_ERROR_FLASH_MS = 900;
export const HOLD_TO_CLOSE_ALL_MS = 800;

const SETTLED_CARD_PHASES = new Set(['complete', 'declined']);
const TERMINAL_CARD_PHASES = new Set([
  'complete',
  'declined',
  'dismissing',
  'dismissing-complete',
  'dismissing-declined',
  'placeholder',
  'approve',
  'decline',
]);

function isTerminalPhase(phase) {
  return TERMINAL_CARD_PHASES.has(phase);
}

export function isSettledCardPhase(phase) {
  return SETTLED_CARD_PHASES.has(phase);
}

function dismissingPhaseFor(phase) {
  return phase === 'declined' ? 'dismissing-declined' : 'dismissing-complete';
}

function isDismissingPhase(phase) {
  return phase === 'dismissing'
    || phase === 'dismissing-complete'
    || phase === 'dismissing-declined';
}

export function settledPhaseForAction(action) {
  return action === 'decline' ? 'declined' : 'complete';
}

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
  if (phase === 'dismissing' || phase === 'dismissing-complete') {
    return `${baseClass} complete dismissing`;
  }
  if (phase === 'dismissing-declined') {
    return `${baseClass} declined dismissing`;
  }
  if (
    phase === 'queued'
    || phase === 'processing'
    || phase === 'complete'
    || phase === 'declined'
    || phase === 'error'
  ) {
    return `${baseClass} ${phase}`;
  }
  if (phase === 'approve' || phase === 'decline') {
    return `${baseClass} ${phase}`;
  }
  return baseClass;
}

export function dismissSettledCards(setCardPhases, idsOrAll) {
  let ids = [];
  setCardPhases((prev) => {
    ids = idsOrAll === 'all'
      ? Object.keys(prev).filter((id) => isSettledCardPhase(prev[id]))
      : (Array.isArray(idsOrAll) ? idsOrAll : [idsOrAll])
        .map(String)
        .filter((id) => isSettledCardPhase(prev[id]));
    if (!ids.length) return prev;
    const next = { ...prev };
    ids.forEach((id) => {
      next[id] = dismissingPhaseFor(prev[id]);
    });
    return next;
  });
  if (!ids.length) return;
  window.setTimeout(() => {
    setCardPhases((prev) => {
      const next = { ...prev };
      let changed = false;
      ids.forEach((id) => {
        if (isDismissingPhase(prev[id])) {
          next[id] = 'placeholder';
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, SUBMISSION_DISMISS_MS);
}

export function clearCardPhase(setCardPhases, submissionId) {
  setCardPhases((prev) => {
    const next = { ...prev };
    delete next[submissionId];
    return next;
  });
}

export function markCardsQueued(setCardPhases, setDisabledButtons, ids) {
  if (!ids?.length) return;
  setCardPhases((prev) => {
    const next = { ...prev };
    ids.forEach((id) => {
      if (isTerminalPhase(next[id])) return;
      next[id] = 'queued';
    });
    return next;
  });
  setDisabledButtons((prev) => {
    const next = { ...prev };
    ids.forEach((id) => {
      next[id] = true;
    });
    return next;
  });
}

/**
 * Apply SSE/job status onto a card in-place (no collapse / layout shift).
 */
export function applySubmissionJobItem({
  item,
  kind,
  setCardPhases,
  setDisabledButtons,
  setSubmissions,
  applyCompletedStats,
  onFailed,
}) {
  if (!item || item.kind !== kind) return;
  const submissionId = item.itemId;

  if (item.status === 'queued' || item.status === 'processing') {
    const phase = item.status === 'processing' ? 'processing' : 'queued';
    setCardPhases((prev) => {
      if (isTerminalPhase(prev[submissionId])) return prev;
      return { ...prev, [submissionId]: phase };
    });
    setDisabledButtons((prev) => ({ ...prev, [submissionId]: true }));
    return;
  }

  if (item.status === 'failed') {
    setCardPhases((prev) => {
      if (isTerminalPhase(prev[submissionId])) return prev;
      return { ...prev, [submissionId]: 'error' };
    });
    setDisabledButtons((prev) => {
      const next = { ...prev };
      delete next[submissionId];
      return next;
    });
    onFailed?.(item.error);
    window.setTimeout(() => {
      setCardPhases((prev) => {
        if (prev[submissionId] !== 'error') return prev;
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    }, CARD_ERROR_FLASH_MS);
    return;
  }

  if (item.status === 'completed') {
    let shouldCount = false;
    const settledPhase = settledPhaseForAction(item.action);
    setCardPhases((prev) => {
      if (isTerminalPhase(prev[submissionId])) return prev;
      shouldCount = true;
      return { ...prev, [submissionId]: settledPhase };
    });
    setDisabledButtons((prev) => ({ ...prev, [submissionId]: true }));
    if (shouldCount && applyCompletedStats) {
      setSubmissions((prev) => applyCompletedStats(prev, submissionId, item.action));
    }
  }
}

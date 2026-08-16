import { Tooltip } from 'react-tooltip';

export function incrementSubmitterRecord(submissions, userId, field, submitterKey) {
  if (!userId) return submissions;
  return submissions.map((submission) => {
    const submitter = submission[submitterKey];
    if (!submitter || submitter.id !== userId) return submission;
    const stats = submitter.submissionStats || { accepted: 0, declined: 0 };
    return {
      ...submission,
      [submitterKey]: {
        ...submitter,
        submissionStats: {
          ...stats,
          [field]: (stats[field] || 0) + 1,
        },
      },
    };
  });
}

export function preserveSubmitterStats(previous, next, submitterKey) {
  if (!next) return previous;
  const prevSubmitter = previous?.[submitterKey];
  const nextSubmitter = next[submitterKey];
  if (!nextSubmitter) return next;
  return {
    ...next,
    [submitterKey]: {
      ...nextSubmitter,
      submissionStats: nextSubmitter.submissionStats ?? prevSubmitter?.submissionStats,
    },
  };
}

const SubmitterRecordBadge = ({ accepted = 0, declined = 0, tooltip, tooltipId }) => {
  const acceptedCount = Number(accepted) || 0;
  const declinedCount = Number(declined) || 0;
  const total = acceptedCount + declinedCount;
  const acceptPct = total === 0 ? 0 : (acceptedCount / total) * 100;

  return (
    <>
      <span
        className={`submitter-record-badge${total === 0 ? ' is-empty' : ''}`}
        style={{ '--submitter-record-accept-pct': acceptPct }}
        data-tooltip-id={tooltipId}
      >
        <span className="submitter-record-accepted">{acceptedCount}</span>
        <span className="submitter-record-divider">/</span>
        <span className="submitter-record-declined">{declinedCount}</span>
      </span>
      {tooltip && tooltipId && (
        <Tooltip id={tooltipId} place="top">
          {tooltip}
        </Tooltip>
      )}
    </>
  );
};

export default SubmitterRecordBadge;

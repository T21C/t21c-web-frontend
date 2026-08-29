// tuf-search: #SubmissionLockButton #submissionLockButton #admin #submissionManagement
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LockIcon } from '@/components/common/icons';

export default function SubmissionLockButton({ isLocked, onToggle }) {
  const { t } = useTranslation('pages');
  const [busy, setBusy] = useState(false);
  const locked = Boolean(isLocked);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onToggle();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="submission-lock-toggle">
      <button
        type="button"
        className={`submission-lock-toggle-btn${locked ? ' is-locked' : ''}`}
        aria-label={
          locked
            ? t('submissionManagement.lock.unlock')
            : t('submissionManagement.lock.lock')
        }
        title={
          locked
            ? t('submissionManagement.lock.lockedHint')
            : t('submissionManagement.lock.lock')
        }
        disabled={busy}
        onClick={handleClick}
      >
        <LockIcon color="currentColor" size={16} />
      </button>
    </div>
  );
}

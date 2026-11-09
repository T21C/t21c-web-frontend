// tuf-search: #SubmissionQueueBar #admin #submissionManagement
import { useTranslation } from 'react-i18next';

const SubmissionQueueBar = ({
  total,
  isPaging,
  queueDrift,
  onResync,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  if (total <= 0 && !queueDrift) return null;

  return (
    <div className="submission-queue-bar">
      {queueDrift && (
        <div className="submission-queue-sync" role="status">
          <p>{t('submissionManagement.queue.drift')}</p>
          <button type="button" onClick={onResync} disabled={isPaging}>
            {t('submissionManagement.queue.resync')}
          </button>
        </div>
      )}
      {total > 0 && (
        <div className="submission-queue-pager">
          <span>{t('submissionManagement.queue.pending', { count: total })}</span>
        </div>
      )}
    </div>
  );
};

export default SubmissionQueueBar;

// tuf-search: #SubmissionQueueBar #admin #submissionManagement
import { useTranslation } from 'react-i18next';

const SubmissionQueueBar = ({
  total,
}) => {
  const { t } = useTranslation(['pages', 'common']);
  if (total <= 0) return null;

  return (
    <div className="submission-queue-bar">
      <div className="submission-queue-pager">
        <span>{t('submissionManagement.queue.pending', { count: total })}</span>
      </div>
    </div>
  );
};

export default SubmissionQueueBar;

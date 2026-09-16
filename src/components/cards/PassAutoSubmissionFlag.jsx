// tuf-search: #PassAutoSubmissionFlag #autoSubmission #cards
import { useTranslation } from 'react-i18next';

const PassAutoSubmissionFlag = () => {
  const { t } = useTranslation('components');
  return <span className="flag">{t('cards.pass.flags.autoSubmitted')}</span>;
};

export default PassAutoSubmissionFlag;

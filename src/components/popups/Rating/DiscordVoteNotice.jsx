import { useTranslation } from 'react-i18next';
import { DiscordIcon } from '@/components/common/icons';
import './discordvotenotice.css';

const DiscordVoteNotice = ({ threadUrl }) => {
  const { t } = useTranslation('components');
  return (
    <div className="discord-vote-notice">
      <span>{t('rating.detailPopup.messages.voteSettled')}</span>
      {threadUrl && (
        <a
          className="discord-vote-notice__thread"
          href={threadUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <DiscordIcon size={16} color="currentColor" />
          {t('rating.detailPopup.messages.voteThread')}
        </a>
      )}
    </div>
  );
};

export default DiscordVoteNotice;

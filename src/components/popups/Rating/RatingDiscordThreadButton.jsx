import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { DiscordIcon } from '@/components/common/icons';
import DiscordThreadPingPopup from '@/components/discord/DiscordThreadPingPopup';
import { mergeRatingThreadState, ratingThreadAction } from '@/components/discord/ratingThread';
import './discordvotenotice.css';

export { mergeRatingThreadState };

const RatingDiscordThreadButton = ({ rating, linkedRequest, allowed, onUpdated }) => {
  const { t } = useTranslation('components');
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState(false);
  const url = rating?.discordMessageUrl || '';
  const closed = Boolean(rating?.discordThreadClosed);
  const action = ratingThreadAction({url, closed});
  if (!allowed || !rating?.id || rating.confirmedAt || linkedRequest) return null;

  const labelKey = action === 'close'
    ? 'rating.detailPopup.buttons.discordThreadClose'
    : action === 'reopen'
      ? 'rating.detailPopup.buttons.discordThreadReopen'
      : 'rating.detailPopup.buttons.discordThread';
  const successKey = action === 'close'
    ? 'rating.detailPopup.messages.discordThreadClosed'
    : action === 'reopen'
      ? 'rating.detailPopup.messages.discordThreadReopened'
      : 'rating.detailPopup.messages.discordThreadStarted';

  const run = async (nextAction, ping) => {
    setBusy(true);
    try {
      const response = await api.post(routes.admin.ratingDiscord(rating.id), {action: nextAction, ping});
      toast.success(t(successKey));
      if (response.data?.rating) onUpdated?.(response.data.rating);
    } catch (error) {
      toast.error(error?.response?.data?.error || t('rating.detailPopup.errors.discordThread'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {prompt && (
        <DiscordThreadPingPopup
          action={action}
          onClose={() => setPrompt(false)}
          onConfirm={(ping) => {
            setPrompt(false);
            run(action, ping);
          }}
        />
      )}
      <div className="rating-discord-thread-slot">
        {closed && url && (
          <a
            className="rating-discord-thread-link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DiscordIcon size={16} color="currentColor" />
            <span>{t('rating.detailPopup.buttons.discordThreadClosed')}</span>
          </a>
        )}
        <button type="button" className="rating-discord-thread" onClick={() => setPrompt(true)} disabled={busy}>
          <DiscordIcon size={16} color="currentColor" />
          <span>{busy ? t('buttons.saving', { ns: 'common' }) : t(labelKey)}</span>
        </button>
      </div>
    </>
  );
};

export default RatingDiscordThreadButton;

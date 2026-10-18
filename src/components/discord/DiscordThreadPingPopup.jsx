import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell/PopupShell';
import { ratingThreadConfirmMessage } from './ratingThread';
import './discordThreadPing.css';

const DiscordThreadPingPopup = ({ action, onClose, onConfirm }) => {
  const { t } = useTranslation('components');
  const [ping, setPing] = useState(false);
  const title = t(action === 'close'
    ? 'discordThread.titleClose'
    : action === 'reopen'
      ? 'discordThread.titleReopen'
      : 'discordThread.titleCreate');

  const continueAction = () => {
    if (!window.confirm(ratingThreadConfirmMessage(t, {action, ping}))) return;
    onConfirm(ping);
  };

  return (
    <PopupShell onClose={onClose} panelClassName="discord-thread-ping" ariaLabel={title}>
      <h2>{title}</h2>
      <label className="discord-thread-ping__option">
        <input
          type="checkbox"
          checked={ping}
          onChange={(event) => setPing(event.target.checked)}
        />
        <span>{t('discordThread.pingLabel')}</span>
      </label>
      <div className="discord-thread-ping__actions">
        <button type="button" className="btn-fill-neutral-dark" onClick={onClose}>
          {t('buttons.cancel', {ns: 'common'})}
        </button>
        <button type="button" className="btn-fill-primary" onClick={continueAction}>
          {t('discordThread.continue')}
        </button>
      </div>
    </PopupShell>
  );
};

export default DiscordThreadPingPopup;

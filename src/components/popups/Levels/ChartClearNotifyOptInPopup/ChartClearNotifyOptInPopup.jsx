// tuf-search: #ChartClearNotifyOptInPopup #chartClearNotifyOptInPopup #popups #levels
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import './chartclearnotifyoptinpopup.css';

const ChartClearNotifyOptInPopup = ({ busy = false, onEnable, onDismiss }) => {
  const { t } = useTranslation('pages');

  return (
    <PopupShell
      onClose={onDismiss}
      closeDisabled={busy}
      overlayClassName="chart-clear-notify-opt-in"
      panelClassName="chart-clear-notify-opt-in__content"
    >
        <h3>{t('levelSubmission.chartClearNotify.title')}</h3>
        <p className="chart-clear-notify-opt-in__body">
          {t('levelSubmission.chartClearNotify.body')}
        </p>
        <div className="chart-clear-notify-opt-in__actions">
          <button
            type="button"
            className="chart-clear-notify-opt-in__dismiss"
            onClick={onDismiss}
            disabled={busy}
          >
            {t('levelSubmission.chartClearNotify.dismiss')}
          </button>
          <button
            type="button"
            className="chart-clear-notify-opt-in__enable"
            onClick={onEnable}
            disabled={busy}
          >
            {t('levelSubmission.chartClearNotify.enable')}
          </button>
        </div>
    </PopupShell>
  );
};

export default ChartClearNotifyOptInPopup;

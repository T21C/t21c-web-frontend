import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckmarkIcon, CrossIcon, TUFHelperLiteIcon } from '@/components/common/icons';
import {
  connectTufHelperLiteIntegration,
  dismissTufHelperLiteBannerForSession,
  hideTufHelperLiteIntegration,
  initializeTufHelperLiteIntegration,
  useTufHelperLiteIntegration,
} from '@/hooks/useTufHelperLiteIpc';
import './tufHelperLiteConnectBanner.css';

const TUFHELPER_LITE_URL = 'https://github.com/KGH1113/TUFHelperLite/releases/latest';
const ADOFAI_IPC_URL = 'https://github.com/KGH1113/adofai-ipc/releases/latest';
const SUPPORTED_PATH = /^\/(levels|packs)(\/|$)/;

export const TufHelperLiteConnectBanner = () => {
  const { t } = useTranslation('components');
  const location = useLocation();
  const integration = useTufHelperLiteIntegration();
  const [isRetrying, setIsRetrying] = useState(false);
  const isConnecting = integration.state === 'connecting';
  const isUnavailable = integration.state === 'unavailable';
  const showUnavailable = isUnavailable || isRetrying;
  const errorCode = integration.errorCode;
  const requiresIpcUpdate = errorCode === 'namespace_status_unavailable';
  const namespaceInitializing = errorCode === 'namespace_initializing' || errorCode === 'TIMEOUT';
  const namespaceFailed = errorCode === 'namespace_error';
  const canShow = integration.state === 'prompt' || integration.state === 'unavailable';
  const isVisible =
    SUPPORTED_PATH.test(location.pathname) &&
    canShow &&
    !integration.isSessionDismissed;

  useEffect(() => {
    void initializeTufHelperLiteIntegration();
  }, []);

  if (!isVisible) return null;

  const title = requiresIpcUpdate
    ? t('level.tufHelperLiteBanner.ipcUpdateTitle')
    : namespaceInitializing
      ? t('level.tufHelperLiteBanner.initializingTitle')
      : namespaceFailed
        ? t('level.tufHelperLiteBanner.initializationFailedTitle')
        : showUnavailable
          ? t('level.tufHelperLiteBanner.unavailableTitle')
          : t('level.tufHelperLiteBanner.title');
  const description = requiresIpcUpdate
    ? t('level.tufHelperLiteBanner.ipcUpdateDescription')
    : namespaceInitializing
      ? t('level.tufHelperLiteBanner.initializingDescription')
      : namespaceFailed
        ? t('level.tufHelperLiteBanner.initializationFailedDescription')
        : showUnavailable
          ? t('level.tufHelperLiteBanner.unavailableDescription')
          : t('level.tufHelperLiteBanner.description');
  const helpUrl = requiresIpcUpdate ? ADOFAI_IPC_URL : TUFHELPER_LITE_URL;

  const handleConnect = async () => {
    const retrying = integration.state === 'unavailable';
    if (retrying) setIsRetrying(true);

    try {
      await connectTufHelperLiteIntegration();
    } finally {
      if (retrying) setIsRetrying(false);
    }
  };

  return (
    <aside
      className={`tufhelperlite-connect-banner${showUnavailable ? ' is-unavailable' : ''}`}
      aria-labelledby="tufhelperlite-connect-title"
      aria-describedby="tufhelperlite-connect-description"
    >
      <div className="tufhelperlite-connect-banner__content">
        <div className="tufhelperlite-connect-banner__icon" aria-hidden="true">
          <TUFHelperLiteIcon size={46} />
        </div>

        <div className="tufhelperlite-connect-banner__copy" aria-live="polite">
          <strong id="tufhelperlite-connect-title" className="tufhelperlite-connect-banner__title">
            {title}
          </strong>
          <span id="tufhelperlite-connect-description" className="tufhelperlite-connect-banner__description">
            {description}
          </span>
        </div>
      </div>

      <div className="tufhelperlite-connect-banner__actions">
        <a
          className="tufhelperlite-connect-banner__link"
          href={helpUrl}
          target="_blank"
          rel="noreferrer"
        >
          {requiresIpcUpdate
            ? t('level.tufHelperLiteBanner.downloadIpc')
            : t('level.tufHelperLiteBanner.learnMore')}
        </a>
        <button
          type="button"
          className="tufhelperlite-connect-banner__connect"
          onClick={() => void handleConnect()}
          disabled={isConnecting}
        >
          {isConnecting
            ? t('level.tufHelperLiteBanner.connecting')
            : showUnavailable
              ? t('level.tufHelperLiteBanner.retry')
              : t('level.tufHelperLiteBanner.connect')}
        </button>
      </div>

      <label className={`tufhelperlite-connect-banner__preference${isConnecting ? ' is-disabled' : ''}`}>
        <input
          type="checkbox"
          onChange={(event) => {
            if (event.target.checked) hideTufHelperLiteIntegration();
          }}
          disabled={isConnecting}
        />
        <span className="tufhelperlite-connect-banner__checkbox" aria-hidden="true">
          <CheckmarkIcon size={12} />
        </span>
        <span>{t('level.tufHelperLiteBanner.neverShow')}</span>
      </label>

      <button
        type="button"
        className="tufhelperlite-connect-banner__dismiss"
        onClick={dismissTufHelperLiteBannerForSession}
        disabled={isConnecting}
        aria-label={t('level.tufHelperLiteBanner.dismiss')}
      >
        <CrossIcon size={16} />
      </button>
    </aside>
  );
};

export default TufHelperLiteConnectBanner;

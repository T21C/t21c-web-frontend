import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { DownloadIcon, GearIcon, InfoIcon } from '@/components/common/icons';
import {
  useTufHelperLiteSettings,
  useTufHelperLiteStorage,
  useTufHelperLiteBatch,
  useTufHelperLiteJobs,
  setTufHelperLiteTempDownloadMode,
  flushTufHelperLiteTemp,
} from '@/hooks/useTufHelperLiteIpc';
import TufHelperLiteStorageSettings from './TufHelperLiteStorageSettings';
import './tufHelperLiteDownloadManager.css';

const activeStorage = new Set(['copying', 'verifying', 'switching', 'cleaning', 'cleanup_pending']);
const activeBatch = new Set(['preparing', 'checking', 'updating', 'cancelling']);
const activeJob = new Set(['queued', 'running', 'waiting_selection']);
const field = (value, name) => value?.[name] ?? value?.[name.charAt(0).toUpperCase() + name.slice(1)];

export const TufHelperLiteSettings = ({ onClose, onManageDownloads, health }) => {
  const { t } = useTranslation('components');
  const flushRef = useRef(null);
  const cancelFlushRef = useRef(null);
  const settings = useTufHelperLiteSettings();
  const storage = useTufHelperLiteStorage();
  const batch = useTufHelperLiteBatch();
  const { jobs } = useTufHelperLiteJobs();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [flushed, setFlushed] = useState(false);
  const [confirmFlush, setConfirmFlush] = useState(false);
  const supported = health.capabilities.includes('temp-download-mode-v1');
  const tempMode = Boolean(field(settings, 'tempDownloadMode'));
  const working = activeStorage.has(String(field(storage, 'state')).toLowerCase())
    || activeBatch.has(String(field(batch, 'state')).toLowerCase())
    || jobs.some((job) => activeJob.has(String(field(job, 'status')).toLowerCase()));
  const disabled = !health.isAvailable || !settings || Boolean(busy);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (confirmFlush) {
        setConfirmFlush(false);
        flushRef.current?.focus();
      } else onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmFlush, onClose]);
  useEffect(() => {
    if (confirmFlush) cancelFlushRef.current?.focus();
  }, [confirmFlush]);
  useEffect(() => {
    setError(null);
    setFlushed(false);
    setConfirmFlush(false);
  }, [tempMode]);
  useEffect(() => {
    if (!flushed || busy) return undefined;
    const frame = window.requestAnimationFrame(() => flushRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [busy, flushed]);

  const run = async (action, callback) => {
    setBusy(action);
    setError(null);
    setFlushed(false);
    try {
      await callback();
      if (action === 'flush') {
        setConfirmFlush(false);
        setFlushed(true);
      }
    } catch (nextError) {
      setError(t(`level.tufHelperLiteSettings.errors.${nextError?.code}`, {
        defaultValue: nextError?.message || t('level.tufHelperLiteSettings.failed'),
      }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
        <CloseButton
          variant="floating"
          size={10}
          className="tufhelper-download-manager__close"
          onClick={onClose}
          aria-label={t('level.tufHelperLiteSettings.close')}
        />
        <header className="tufhelper-download-manager__header">
          <div className="tufhelper-download-manager__mark" aria-hidden="true"><GearIcon size={24} /></div>
          <h2 id="tufhelper-settings-title">{t('level.tufHelperLiteSettings.title')}</h2>
        </header>

        {!health.isAvailable ? (
          <p className="tufhelper-download-manager__notice" role="status">{t('level.tufHelperLiteSettings.disconnected')}</p>
        ) : null}

        <section className="tufhelper-settings__section" aria-labelledby="tufhelper-temp-title">
          <label className="tufhelper-settings__toggle">
            <div>
              <strong id="tufhelper-temp-title">{t('level.tufHelperLiteSettings.tempMode')}</strong>
              <p id="tufhelper-temp-description">{t('level.tufHelperLiteSettings.tempDescription')}</p>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={tempMode}
              aria-labelledby="tufhelper-temp-title"
              aria-describedby="tufhelper-temp-description"
              disabled={disabled || !supported || working}
              onChange={(event) => void run('mode', () => setTufHelperLiteTempDownloadMode(event.target.checked))}
            />
          </label>
          {!supported ? <p className="tufhelper-download-manager__notice">{t('level.tufHelperLiteSettings.updateRequired')}</p> : null}
          {working ? <p className="tufhelper-settings__hint">{t('level.tufHelperLiteSettings.busy')}</p> : null}
          {tempMode ? (
            <div className="tufhelper-settings__temp">
              <code>{field(settings, 'tempDirectory')}</code>
              <div className="tufhelper-settings__flush">
                <button
                  ref={flushRef}
                  type="button"
                  onClick={() => setConfirmFlush(true)}
                  disabled={disabled || working}
                  aria-expanded={confirmFlush}
                >
                  {t(`level.tufHelperLiteSettings.${busy === 'flush' ? 'flushing' : 'flush'}`)}
                </button>
                <span className="tufhelper-settings__info">
                  <button
                    type="button"
                    className="tufhelper-settings__info-button"
                    aria-label={t('level.tufHelperLiteSettings.flushInfo')}
                    aria-describedby="tufhelper-temp-tooltip"
                  >
                    <InfoIcon size={17} aria-hidden="true" />
                  </button>
                  <span id="tufhelper-temp-tooltip" role="tooltip">{t('level.tufHelperLiteSettings.flushTooltip')}</span>
                </span>
              </div>
              {confirmFlush ? (
                <div
                  className="tufhelper-download-manager__confirmation"
                  role="alertdialog"
                  aria-modal="true"
                  aria-label={t('level.tufHelperLiteSettings.flush')}
                  aria-describedby="tufhelper-flush-warning"
                >
                  <p id="tufhelper-flush-warning">{t('level.tufHelperLiteSettings.flushWarning')}</p>
                  <div className="tufhelper-download-manager__actions">
                    <button
                      ref={cancelFlushRef}
                      type="button"
                      className="is-quiet"
                      disabled={Boolean(busy)}
                      onClick={() => { setConfirmFlush(false); flushRef.current?.focus(); }}
                    >{t('level.tufHelperLiteDownloadManager.cancel')}</button>
                    <button
                      type="button"
                      className="is-danger"
                      disabled={disabled || working}
                      onClick={() => void run('flush', flushTufHelperLiteTemp)}
                    >{t('level.tufHelperLiteSettings.flush')}</button>
                  </div>
                </div>
              ) : null}
              {flushed ? <p className="tufhelper-settings__hint" role="status">{t('level.tufHelperLiteSettings.flushed')}</p> : null}
            </div>
          ) : null}
        </section>

        {settings && !tempMode ? (
          <>
            <TufHelperLiteStorageSettings health={health} disabled={disabled} />
            <section className="tufhelper-settings__downloads" aria-labelledby="tufhelper-downloads-title">
              <h3 id="tufhelper-downloads-title" className="tufhelper-settings__downloads-label">
                <DownloadIcon size={17} aria-hidden="true" />
                {t('level.tufHelperLiteDownloadManager.libraryTitle')}
              </h3>
              <button
                type="button"
                className="tufhelper-settings__manage"
                onClick={onManageDownloads}
                disabled={disabled}
              >
                <span className="tufhelper-settings__manage-label">{t('level.tufHelperLiteDownloadManager.open')}</span>
                <span className="tufhelper-settings__manage-arrow" aria-hidden="true">›</span>
              </button>
            </section>
          </>
        ) : null}
        {error ? <p className="tufhelper-download-manager__error" role="alert">{error}</p> : null}
    </>
  );
};

export default TufHelperLiteSettings;

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderIcon, RefreshIcon, ResetIcon, WarningIcon } from '@/components/common/icons';
import MarqueeText from '@/components/common/display/MarqueeText/MarqueeText';
import {
  useTufHelperLiteStorage,
  useTufHelperLiteBatch,
  waitForTufHelperLiteFolderSelection,
  retryTufHelperLiteStorageChange,
  retryTufHelperLiteStorageMigration,
  startTufHelperLiteFolderPicker,
  startTufHelperLiteStorageChange,
  startTufHelperLiteStorageMigration,
  cancelTufHelperLiteStorageChange,
} from '@/hooks/useTufHelperLiteIpc';

const ACTIVE_STATES = new Set(['copying', 'verifying', 'switching', 'cleaning']);
const BATCH_ACTIVE_STATES = new Set(['preparing', 'checking', 'updating', 'cancelling']);
const field = (value, name) => value?.[name] ?? value?.[name.charAt(0).toLowerCase() + name.slice(1)];
const FOLDER_ERROR_PREFIXES = ['storage_target_', 'selection_token_', 'folder_picker_'];

const toUiError = (value, fallbackMessage) => ({
  code: field(value, 'ErrorCode') || value?.code || null,
  message: field(value, 'Message') || value?.message || fallbackMessage,
});

const isFolderError = (value) => (
  !!value?.code && FOLDER_ERROR_PREFIXES.some((prefix) => value.code.startsWith(prefix))
);

const formatBytes = (bytes, locale) => {
  const value = Number(bytes) || 0;
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: unit ? 1 : 0 }).format(value / (1024 ** unit))} ${units[unit]}`;
};


export const TufHelperLiteStorageSettings = ({ health, disabled = false }) => {
  const { t, i18n } = useTranslation('components');
  const observedStorage = useTufHelperLiteStorage();
  const batch = useTufHelperLiteBatch();
  const [storage, setStorage] = useState(observedStorage);
  const [selection, setSelection] = useState(null);
  const [working, setBusy] = useState(false);
  const busy = working || disabled;
  const [error, setError] = useState(null);
  const supported = health.supportsStorageMigration;
  const reconnectSupported = health.supportsStorageReconnect;
  const state = String(field(storage, 'State') || 'idle').toLowerCase();
  const migrationActive = ACTIVE_STATES.has(state);
  const batchActive = BATCH_ACTIVE_STATES.has(String(field(batch, 'State') || 'idle').toLowerCase());
  const currentDirectory = field(storage, 'CurrentDirectory') || field(storage, 'SourceDirectory');
  const directorySplit = Math.max(currentDirectory?.lastIndexOf('/') ?? -1, currentDirectory?.lastIndexOf('\\') ?? -1);
  const directoryParent = directorySplit >= 0 ? currentDirectory.slice(0, directorySplit + 1) : '';
  const directoryName = currentDirectory?.slice(directorySplit + 1) || '—';
  const targetDirectory = field(selection, 'Directory') || field(storage, 'TargetDirectory');
  const selectionKind = String(field(selection, 'SelectionKind') || 'migration').toLowerCase();
  const bytesProcessed = Number(field(storage, 'BytesProcessed')) || 0;
  const bytesTotal = Number(field(storage, 'BytesTotal')) || 0;
  const progress = bytesTotal > 0 ? Math.min(1, bytesProcessed / bytesTotal) : 0;
  const storageError = state === 'failed'
    ? toUiError(storage, t('level.tufHelperLiteDownloadManager.errors.startFailed'))
    : null;
  const effectiveError = error || storageError;
  const folderError = isFolderError(effectiveError) ? effectiveError : null;
  const migrationError = effectiveError && !folderError ? effectiveError : null;

  useEffect(() => { setStorage(observedStorage); }, [observedStorage]);

  const localizedError = useCallback((value) => {
    if (!value) return null;
    if (!value.code) return value.message;
    return t(`level.tufHelperLiteDownloadManager.folderErrors.${value.code}`, {
      defaultValue: value.message,
    });
  }, [t]);

  const receiveFolderSelection = useCallback(async (started) => {
    const result = field(started, 'State') === 'picking'
      ? await waitForTufHelperLiteFolderSelection(field(started, 'OperationId'))
      : started;
    const state = String(field(result, 'State')).toLowerCase();
    if (state === 'selected') setSelection(result);
    else if (state === 'failed') throw Object.assign(new Error(field(result, 'Message') || t('level.tufHelperLiteDownloadManager.errors.pickFailed')), { code: field(result, 'ErrorCode') });
  }, [t]);

  const chooseFolder = async () => {
    setBusy(true);
    setError(null);
    try {
      const started = await startTufHelperLiteFolderPicker({ allowExisting: reconnectSupported });
      await receiveFolderSelection(started);
    } catch (nextError) {
      setError(toUiError(nextError, t('level.tufHelperLiteDownloadManager.errors.pickFailed')));
    } finally {
      setBusy(false);
    }
  };

  const startMigration = async ({ useDefault = false } = {}) => {
    setBusy(true);
    setError(null);
    try {
      const startStorageOperation = reconnectSupported
        ? startTufHelperLiteStorageChange
        : startTufHelperLiteStorageMigration;
      const result = await startStorageOperation({
        selectionToken: useDefault ? null : field(selection, 'SelectionToken'),
        useDefault,
      });
      if (String(field(result, 'State')).toLowerCase() === 'failed') {
        setError(toUiError(result, t('level.tufHelperLiteDownloadManager.errors.startFailed')));
        return;
      }
      setStorage(result);
      setSelection(null);
    } catch (nextError) {
      setError(toUiError(nextError, t('level.tufHelperLiteDownloadManager.errors.startFailed')));
    } finally {
      setBusy(false);
    }
  };

  const retryMigration = async () => {
    setBusy(true);
    try {
      setStorage(await (reconnectSupported
        ? retryTufHelperLiteStorageChange()
        : retryTufHelperLiteStorageMigration()));
      setError(null);
    } catch (nextError) {
      setError(toUiError(nextError, t('level.tufHelperLiteDownloadManager.errors.retryFailed')));
    } finally {
      setBusy(false);
    }
  };

  const cancelStorageChange = async () => {
    setBusy(true);
    try {
      setStorage(await cancelTufHelperLiteStorageChange());
      setError(null);
    } catch (nextError) {
      setError(toUiError(nextError, t('level.tufHelperLiteDownloadManager.errors.cancelFailed')));
    } finally {
      setBusy(false);
    }
  };

  const statusLabel = useMemo(
    () => t(`level.tufHelperLiteDownloadManager.states.${state}`, { defaultValue: state }),
    [state, t],
  );

  return (
        <section className="tufhelper-download-manager__storage tufhelper-settings__storage" aria-labelledby="tufhelper-storage-title">
          <div className="tufhelper-download-manager__section-heading">
            <h3 id="tufhelper-storage-title">{t('level.tufHelperLiteDownloadManager.storageTitle')}</h3>
          </div>

          {!supported ? (
            <div className="tufhelper-download-manager__notice is-warning">
              <WarningIcon size={20} color="currentColor" />
              <p>{t('level.tufHelperLiteDownloadManager.updateRequired')}</p>
            </div>
          ) : (
            <>
              <div className="tufhelper-settings__folder-field">
                <div className="tufhelper-settings__storage-path" tabIndex={0} aria-label={currentDirectory || '—'}>
                  <FolderIcon size={17} aria-hidden="true" />
                  <span className="tufhelper-settings__path-text" aria-hidden="true">
                    <span className="tufhelper-settings__path-parent">{directoryParent}</span>
                    <span className="tufhelper-settings__path-name">{directoryName}</span>
                  </span>
                  <span className="tufhelper-settings__full-path" aria-hidden="true">{currentDirectory || '—'}</span>
                </div>
                <button
                  type="button"
                  className="tufhelper-settings__change-folder"
                  onClick={chooseFolder}
                  aria-label={t('level.tufHelperLiteDownloadManager.chooseFolder')}
                  disabled={busy || migrationActive || batchActive}
                >
                  {t(`level.tufHelperLiteDownloadManager.${busy ? 'choosing' : 'changeFolder'}`)}
                </button>
              </div>
              {storage && !field(storage, 'IsDefault') && !selection && !migrationActive ? (
                <button
                  type="button"
                  className="tufhelper-settings__restore"
                  onClick={() => void startMigration({ useDefault: true })}
                  disabled={busy}
                >
                  <ResetIcon size={14} color="currentColor" aria-hidden="true" />
                  {t('level.tufHelperLiteDownloadManager.restoreDefault')}
                </button>
              ) : null}

              {folderError ? (
                <div className="tufhelper-download-manager__folder-error" role="alert">
                  <WarningIcon size={16} color="currentColor" aria-hidden="true" />
                  <span>{localizedError(folderError)}</span>
                </div>
              ) : null}

              {selection ? (
                <div className="tufhelper-download-manager__confirmation">
                  <div className="tufhelper-download-manager__target">
                    <span>{t('level.tufHelperLiteDownloadManager.newFolder')}</span>
                    <MarqueeText as="code" title={targetDirectory}>{targetDirectory}</MarqueeText>
                  </div>
                  <div className="tufhelper-download-manager__notice is-warning">
                    <WarningIcon size={20} color="currentColor" />
                    <p>{t(`level.tufHelperLiteDownloadManager.${selectionKind === 'merge_reconnect' ? 'reconnectWarning' : 'warning'}`)}</p>
                  </div>
                  <div className="tufhelper-download-manager__actions">
                    <button
                      type="button"
                      className="is-quiet"
                      onClick={() => {
                        setSelection(null);
                        setError(null);
                      }}
                      disabled={busy}
                    >
                      {t('level.tufHelperLiteDownloadManager.cancel')}
                    </button>
                    <button type="button" className="is-primary" onClick={() => void startMigration()} disabled={busy}>
                      {t(`level.tufHelperLiteDownloadManager.${selectionKind === 'merge_reconnect' ? 'startReconnect' : 'startMigration'}`)}
                    </button>
                  </div>
                </div>
              ) : null}

              {(migrationActive || state === 'cleanup_pending') ? (
                <div className="tufhelper-download-manager__progress" aria-live="polite">
                  <div className="tufhelper-download-manager__progress-copy">
                    <strong>{statusLabel}</strong>
                    <span>{field(storage, 'Message')}</span>
                  </div>
                  <div className="tufhelper-download-manager__progress-track" aria-hidden="true">
                    <span style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                  <div className="tufhelper-download-manager__progress-meta">
                    <span>{field(storage, 'FilesProcessed') || 0} / {field(storage, 'FilesTotal') || 0}</span>
                    <span>{formatBytes(bytesProcessed, i18n.language)} / {formatBytes(bytesTotal, i18n.language)}</span>
                  </div>
                  {reconnectSupported && field(storage, 'OperationKind') === 'merge_reconnect' &&
                  !['switching', 'cleaning'].includes(String(field(storage, 'Phase')).toLowerCase()) ? (
                    <button type="button" className="is-quiet" onClick={() => void cancelStorageChange()} disabled={busy}>
                      {t('level.tufHelperLiteDownloadManager.cancel')}
                    </button>
                    ) : null}
                </div>
              ) : null}

              {(state === 'failed' && !folderError) || state === 'cleanup_pending' ? (
                <button type="button" className="tufhelper-download-manager__retry" onClick={retryMigration} disabled={busy}>
                  <RefreshIcon size={16} color="currentColor" />
                  {t('level.tufHelperLiteDownloadManager.retry')}
                </button>
              ) : null}

            </>
          )}

          {migrationError ? (
            <p className="tufhelper-download-manager__error" role="alert">
              {localizedError(migrationError)}
            </p>
          ) : null}
        </section>
  );
};

export default TufHelperLiteStorageSettings;

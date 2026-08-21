import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import { FolderIcon, RefreshIcon, ResetIcon, WarningIcon } from '@/components/common/icons';
import MarqueeText from '@/components/common/display/MarqueeText/MarqueeText';
import { getPortalRoot } from '@/utils/portalRoot';
import {
  getTufHelperLiteFolderPickerStatus,
  getTufHelperLiteStorageMigrationStatus,
  retryTufHelperLiteStorageChange,
  retryTufHelperLiteStorageMigration,
  startTufHelperLiteFolderPicker,
  startTufHelperLiteStorageChange,
  startTufHelperLiteStorageMigration,
  cancelTufHelperLiteStorageChange,
  checkTufHelperLiteLevelUpdate,
  startTufHelperLiteLevelUpdate,
  getTufHelperLiteLevelJobStatus,
  startTufHelperLiteBatchUpdateCheck,
  getTufHelperLiteBatchUpdateCheckStatus,
  cancelTufHelperLiteBatchUpdateCheck,
} from '@/hooks/useTufHelperLiteIpc';
import DownloadedLevelList from './DownloadedLevelList';
import useDownloadedLevelWindow from './useDownloadedLevelWindow';
import './tufHelperLiteDownloadManager.css';

const ACTIVE_STATES = new Set(['copying', 'verifying', 'switching', 'cleaning']);
const BATCH_ACTIVE_STATES = new Set(['preparing', 'checking', 'cancelling']);
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

export const TufHelperLiteDownloadManager = ({
  onClose,
  health,
  onStorageChange,
}) => {
  const { t, i18n } = useTranslation('components');
  const dialogRef = useRef(null);
  const updatePollsRef = useRef(new Map());
  const [storage, setStorage] = useState(null);
  const [selection, setSelection] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [updateStates, setUpdateStates] = useState({});
  const [batch, setBatch] = useState(null);
  const [batchError, setBatchError] = useState(null);
  const [showBatchConfirmation, setShowBatchConfirmation] = useState(false);
  const supported = health.supportsStorageMigration;
  const librarySupported = health.supportsDownloadedLibrary;
  const updateSupported = health.supportsDownloadedLevelUpdate;
  const batchSupported = health.supportsBatchUpdateCheck;
  const reconnectSupported = health.supportsStorageReconnect;
  const library = useDownloadedLevelWindow(librarySupported);
  const { patchLevel, refreshSummary, reload: reloadLibrary } = library;
  const state = String(field(storage, 'State') || 'idle').toLowerCase();
  const migrationActive = ACTIVE_STATES.has(state);
  const batchState = String(field(batch, 'State') || 'idle').toLowerCase();
  const batchActive = BATCH_ACTIVE_STATES.has(batchState);
  const currentDirectory = field(storage, 'CurrentDirectory') || field(storage, 'SourceDirectory');
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

  const localizedError = useCallback((value) => {
    if (!value) return null;
    if (!value.code) return value.message;
    return t(`level.tufHelperLiteDownloadManager.folderErrors.${value.code}`, {
      defaultValue: value.message,
    });
  }, [t]);

  const refreshStorage = useCallback(async () => {
    if (!supported) return;
    try {
      setStorage(await getTufHelperLiteStorageMigrationStatus());
      setError(null);
    } catch (nextError) {
      setError(toUiError(nextError, t('level.tufHelperLiteDownloadManager.errors.unavailable')));
    }
  }, [supported, t]);

  const refreshBatch = useCallback(async () => {
    if (!batchSupported) return;
    try {
      setBatch(await getTufHelperLiteBatchUpdateCheckStatus());
    } catch {
      // Connection health owns global connection-loss feedback.
    }
  }, [batchSupported]);

  useEffect(() => {
    dialogRef.current?.focus();
    void refreshStorage();
    void refreshBatch();
  }, [refreshBatch, refreshStorage]);

  useEffect(() => {
    const roots = Array.from(new Set([
      getPortalRoot(),
      document.documentElement,
      document.body,
    ].filter(Boolean)));
    const previous = roots.map((root) => ({
      root,
      overflow: root.style.overflow,
      overscrollBehavior: root.style.overscrollBehavior,
      scrollbarGutter: root.style.scrollbarGutter,
    }));

    roots.forEach((root) => {
      root.style.overflow = 'hidden';
      root.style.overscrollBehavior = 'none';
      root.style.scrollbarGutter = 'stable';
    });

    return () => {
      previous.forEach(({ root, overflow, overscrollBehavior, scrollbarGutter }) => {
        root.style.overflow = overflow;
        root.style.overscrollBehavior = overscrollBehavior;
        root.style.scrollbarGutter = scrollbarGutter;
      });
    };
  }, []);

  useEffect(() => {
    onStorageChange?.(storage);
  }, [onStorageChange, storage]);

  useEffect(() => {
    if (!supported || !migrationActive) return undefined;
    const timer = window.setInterval(refreshStorage, 750);
    return () => window.clearInterval(timer);
  }, [migrationActive, refreshStorage, supported]);

  useEffect(() => {
    if (!batchSupported || !batchActive) return undefined;
    const timer = window.setInterval(refreshBatch, 500);
    return () => window.clearInterval(timer);
  }, [batchActive, batchSupported, refreshBatch]);

  useEffect(() => {
    if (batchState !== 'completed') return;
    void reloadLibrary();
  }, [batchState, reloadLibrary]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => () => {
    updatePollsRef.current.forEach((poll) => {
      poll.cancelled = true;
      if (poll.timer) window.clearTimeout(poll.timer);
      poll.resolve?.();
    });
    updatePollsRef.current.clear();
  }, []);

  useEffect(() => {
    const retainedIds = new Set(library.levels.map((level) => level.id));
    updatePollsRef.current.forEach((poll, id) => {
      if (!retainedIds.has(id)) {
        poll.cancelled = true;
        if (poll.timer) window.clearTimeout(poll.timer);
        poll.resolve?.();
        updatePollsRef.current.delete(id);
      }
    });
    setUpdateStates((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([id]) => retainedIds.has(Number(id))),
      );
      library.levels.forEach((level) => {
        if (!next[level.id] && level.updateState === 'update_available') {
          next[level.id] = { state: 'update_available', progress: 1 };
        }
      });
      return next;
    });
  }, [library.levels]);

  const waitForPoll = useCallback((poll, delay = 450) => new Promise((resolve) => {
    poll.resolve = resolve;
    poll.timer = window.setTimeout(() => {
      poll.timer = null;
      poll.resolve = null;
      resolve();
    }, delay);
  }), []);

  const checkForUpdate = useCallback(async (level) => {
    if (!updateSupported || batchActive || updatePollsRef.current.has(level.id)) return;
    const currentState = updateStates[level.id]?.state || level.updateState || 'idle';
    const isUpdating = currentState === 'update_available';
    const poll = { cancelled: false, timer: null, resolve: null };
    updatePollsRef.current.set(level.id, poll);
    setUpdateStates((current) => ({
      ...current,
      [level.id]: { state: isUpdating ? 'updating' : 'checking', progress: -1, stage: 'queued' },
    }));

    try {
      let snapshot = isUpdating
        ? await startTufHelperLiteLevelUpdate(level.id)
        : await checkTufHelperLiteLevelUpdate(level.id);
      const jobId = field(snapshot, 'JobId');
      while (!poll.cancelled && !field(snapshot, 'Done')) {
        setUpdateStates((current) => ({
          ...current,
          [level.id]: {
            state: isUpdating ? 'updating' : 'checking',
            progress: Number(field(snapshot, 'Progress')),
            stage: field(snapshot, 'Stage'),
          },
        }));
        await waitForPoll(poll);
        if (!poll.cancelled) snapshot = await getTufHelperLiteLevelJobStatus(jobId);
      }
      if (poll.cancelled) return;
      if (String(field(snapshot, 'Status')).toLowerCase() === 'failed') {
        const nextError = new Error(field(snapshot, 'Error') || field(snapshot, 'Message'));
        nextError.code = field(snapshot, 'ErrorCode');
        throw nextError;
      }

      const nextState = String(field(snapshot, 'UpdateState') || 'up_to_date').toLowerCase();
      setUpdateStates((current) => ({
        ...current,
        [level.id]: { state: nextState, progress: 1 },
      }));
      patchLevel(level.id, {
        updateState: nextState,
        levelName: field(snapshot, 'Song') || level.levelName,
        artist: field(snapshot, 'Artist') || level.artist,
        creator: field(snapshot, 'Creator') || level.creator,
        diffId: Number(field(snapshot, 'DifficultyId')) || level.diffId,
        sizeBytes: Number(field(snapshot, 'SizeBytes')) || level.sizeBytes,
      });
      if (isUpdating) void refreshSummary();
    } catch (nextError) {
      if (!poll.cancelled) {
        setUpdateStates((current) => ({
          ...current,
          [level.id]: {
            state: 'failed',
            progress: -1,
            error: nextError?.message,
            errorCode: nextError?.code,
          },
        }));
      }
    } finally {
      if (poll.timer) window.clearTimeout(poll.timer);
      poll.resolve?.();
      updatePollsRef.current.delete(level.id);
    }
  }, [batchActive, patchLevel, refreshSummary, updateStates, updateSupported, waitForPoll]);

  const startBatchCheck = async () => {
    setBusy(true);
    setBatchError(null);
    try {
      setBatch(await startTufHelperLiteBatchUpdateCheck());
      setShowBatchConfirmation(false);
    } catch (nextError) {
      setBatchError(toUiError(nextError, t('level.tufHelperLiteDownloadManager.batchFailed')));
    } finally {
      setBusy(false);
    }
  };

  const cancelBatchCheck = async () => {
    try {
      setBatchError(null);
      setBatch(await cancelTufHelperLiteBatchUpdateCheck());
    } catch (nextError) {
      setBatchError(toUiError(nextError, t('level.tufHelperLiteDownloadManager.batchFailed')));
    }
  };

  const pollPicker = useCallback(async (operationId) => {
    for (;;) {
      const result = await getTufHelperLiteFolderPickerStatus(operationId);
      const pickerState = String(field(result, 'State') || '').toLowerCase();
      if (pickerState === 'selected') {
        setSelection(result);
        return;
      }
      if (pickerState === 'cancelled') return;
      if (pickerState === 'failed') {
        const pickerError = new Error(
          field(result, 'Message') || t('level.tufHelperLiteDownloadManager.errors.pickFailed'),
        );
        pickerError.code = field(result, 'ErrorCode') || 'folder_picker_failed';
        throw pickerError;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
  }, [t]);

  const chooseFolder = async () => {
    setBusy(true);
    setError(null);
    try {
      const started = await startTufHelperLiteFolderPicker({ allowExisting: reconnectSupported });
      await pollPicker(field(started, 'OperationId'));
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
    <div
      className="tufhelper-download-manager__overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="tufhelper-download-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tufhelper-download-manager-title"
        tabIndex={-1}
      >
        <CloseButton
          variant="floating"
          size={10}
          className="tufhelper-download-manager__close"
          onClick={onClose}
          aria-label={t('level.tufHelperLiteDownloadManager.close')}
        />

        <header className="tufhelper-download-manager__header">
          <div className="tufhelper-download-manager__mark" aria-hidden="true">
            <FolderIcon size={24} />
          </div>
          <div>
            <h2 id="tufhelper-download-manager-title">
              {t('level.tufHelperLiteDownloadManager.title')}
            </h2>
            <p>{t('level.tufHelperLiteDownloadManager.subtitle')}</p>
          </div>
        </header>

        <section className="tufhelper-download-manager__library" aria-labelledby="tufhelper-library-title">
          <div className="tufhelper-download-manager__section-heading">
            <h3 id="tufhelper-library-title">{t('level.tufHelperLiteDownloadManager.libraryTitle')}</h3>
            <div className="tufhelper-download-manager__library-actions">
              <span className="tufhelper-download-manager__library-summary" aria-live="polite">
                {library.summary?.state === 'ready'
                  ? `${t('level.tufHelperLiteDownloadManager.libraryCount', { count: library.summary.levelCount })} · ${formatBytes(library.summary.totalSizeBytes, i18n.language)}`
                  : library.summary?.state === 'failed'
                    ? t('level.tufHelperLiteDownloadManager.summaryFailed')
                    : t('level.tufHelperLiteDownloadManager.calculatingSummary')}
              </span>
              {batchSupported ? (
                <button
                  type="button"
                  className="tufhelper-download-manager__check-all"
                  onClick={() => batchActive ? void cancelBatchCheck() : setShowBatchConfirmation(true)}
                  disabled={busy || migrationActive}
                >
                  {batchActive
                    ? <span className="tufhelper-download-manager__cancel-glyph" aria-hidden="true">×</span>
                    : <RefreshIcon size={15} color="currentColor" aria-hidden="true" />}
                  {batchActive
                    ? t('level.tufHelperLiteDownloadManager.checkingAll', {
                      processed: field(batch, 'LevelsProcessed') || 0,
                      total: field(batch, 'LevelsTotal') || 0,
                    })
                    : batchState === 'completed' && Number(field(batch, 'UpdatesAvailable')) > 0
                      ? t('level.tufHelperLiteDownloadManager.updatesFound', { count: field(batch, 'UpdatesAvailable') })
                      : t('level.tufHelperLiteDownloadManager.checkAll')}
                </button>
              ) : null}
            </div>
          </div>
          {showBatchConfirmation ? (
            <div className="tufhelper-download-manager__batch-confirmation">
              <div className="tufhelper-download-manager__notice is-warning">
                <WarningIcon size={20} color="currentColor" />
                <p>{t('level.tufHelperLiteDownloadManager.batchWarning')}</p>
              </div>
              <div className="tufhelper-download-manager__actions">
                <button type="button" className="is-quiet" onClick={() => setShowBatchConfirmation(false)}>
                  {t('level.tufHelperLiteDownloadManager.cancel')}
                </button>
                <button type="button" className="is-primary" onClick={() => void startBatchCheck()} disabled={busy}>
                  {t('level.tufHelperLiteDownloadManager.startCheckAll')}
                </button>
              </div>
            </div>
          ) : null}
          {batchError || batchState === 'failed' ? (
            <p className="tufhelper-download-manager__error" role="alert">
              {batchError?.message || field(batch, 'Message') || t('level.tufHelperLiteDownloadManager.batchFailed')}
            </p>
          ) : null}
          {!librarySupported ? (
            <div className="tufhelper-download-manager__notice is-warning">
              <WarningIcon size={20} color="currentColor" />
              <p>{t('level.tufHelperLiteDownloadManager.libraryUpdateRequired')}</p>
            </div>
          ) : (
            <DownloadedLevelList
              {...library}
              updateStates={updateStates}
              onCheckForUpdate={checkForUpdate}
              updateSupported={updateSupported}
              updateLocked={batchActive}
              t={t}
              locale={i18n.language}
            />
          )}
        </section>

        <section className="tufhelper-download-manager__storage" aria-labelledby="tufhelper-storage-title">
          <div className="tufhelper-download-manager__section-heading">
            <h3 id="tufhelper-storage-title">{t('level.tufHelperLiteDownloadManager.storageTitle')}</h3>
            {supported && storage ? <span className={`is-${state}`}>{statusLabel}</span> : null}
          </div>

          {!supported ? (
            <div className="tufhelper-download-manager__notice is-warning">
              <WarningIcon size={20} color="currentColor" />
              <p>{t('level.tufHelperLiteDownloadManager.updateRequired')}</p>
            </div>
          ) : (
            <>
              <div className="tufhelper-download-manager__path-row">
                <div className="tufhelper-download-manager__current-path">
                  <span>{t('level.tufHelperLiteDownloadManager.currentFolder')}</span>
                  <MarqueeText as="code" title={currentDirectory}>
                    {currentDirectory || '—'}
                  </MarqueeText>
                </div>
                <div className="tufhelper-download-manager__path-actions">
                  {storage && !field(storage, 'IsDefault') && !selection && !migrationActive ? (
                    <button
                      type="button"
                      className="tufhelper-download-manager__reset"
                      onClick={() => void startMigration({ useDefault: true })}
                      disabled={busy}
                    >
                      <ResetIcon size={16} color="currentColor" aria-hidden="true" />
                      {t('level.tufHelperLiteDownloadManager.restoreDefault')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="tufhelper-download-manager__choose"
                    onClick={chooseFolder}
                    disabled={busy || migrationActive || batchActive}
                  >
                    <FolderIcon size={17} aria-hidden="true" />
                    {busy
                      ? t('level.tufHelperLiteDownloadManager.choosing')
                      : t('level.tufHelperLiteDownloadManager.chooseFolder')}
                  </button>
                </div>
              </div>

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
      </div>
    </div>
  );
};

export default TufHelperLiteDownloadManager;

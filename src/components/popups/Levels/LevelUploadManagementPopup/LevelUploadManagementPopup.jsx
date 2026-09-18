import { routes } from '@/api/routes';
// tuf-search: #LevelUploadManagementPopup #levelUploadManagementPopup #popups #levels #levelUploadManagement
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import api from '@/utils/api';
import './leveluploadmanagementpopup.css';
import { useTranslation } from 'react-i18next';
import { ChunkedUploadClient } from '@/utils/upload/ChunkedUploadClient';
import { waitForJobCompletion } from '@/utils/jobs/waitForJobCompletion';
import { formatJobFailureMessage } from '@/utils/jobs/formatJobFailureMessage';
import { toastError, toastSuccess } from '@/utils/toastMessage';
import { isCdnUrl } from '@/utils/Utility';
import { CrossIcon } from '@/components/common/icons';
import { CloseButton } from '@/components/common/buttons';
import { PopupShell } from '@/components/common/PopupShell';
import { useJobProgressStream } from '@/hooks/useJobProgressStream';
import ZipLevelFilesList from '@/components/popups/Levels/ZipLevelFilesList/ZipLevelFilesList';
import { ARCHIVE_ACCEPT_ATTR, isAcceptedArchiveFile } from '@/utils/zipUtils';

/** Discord CDN attachments expire; rewrite to the Hyonsu proxy when prefilling from level data. */
function rewriteDiscordCdnHost(url) {
  if (typeof url !== 'string' || url === '') return url;
  return url.replace(/cdn\.discordapp\.com/gi, 'fixcdn.hyonsu.com');
}

/** Pseudo UUID v4-shaped id (hex from Date.now + Math.random; non-crypto). */
function createUploadJobId() {
  const timeHex = Date.now().toString(16).padStart(12, '0').slice(-12);
  let randHex = '';
  while (randHex.length < 20) {
    randHex += Math.floor(Math.random() * 0x100000000)
      .toString(16)
      .padStart(8, '0');
  }
  const chars = (timeHex + randHex.slice(0, 20)).split('');
  chars[12] = '4';
  chars[16] = ((parseInt(chars[16], 16) & 0x3) | 0x8).toString(16);
  const h = chars.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function zipTargetChunkedMeta(zipTarget) {
  return zipTarget.kind === 'submission'
    ? { submissionId: zipTarget.id }
    : { levelId: zipTarget.id };
}

function zipTargetUploadUrl(zipTarget) {
  return zipTarget.kind === 'submission'
    ? routes.admin.submissions.levelUpload(zipTarget.id)
    : routes.levelsV3.upload(zipTarget.id);
}

function zipTargetUploadFromUrl(zipTarget) {
  return zipTarget.kind === 'submission'
    ? routes.admin.submissions.levelUploadFromUrl(zipTarget.id)
    : routes.levelsV3.uploadFromUrl(zipTarget.id);
}

function zipTargetSelectLevelUrl(zipTarget) {
  return zipTarget.kind === 'submission'
    ? routes.admin.submissions.levelSelectLevel(zipTarget.id)
    : routes.levelsV3.selectLevel(zipTarget.id);
}

function zipTargetReparseUrl(zipTarget) {
  return zipTarget.kind === 'submission'
    ? routes.admin.submissions.levelReparseChart(zipTarget.id)
    : routes.levelsV3.reparseChart(zipTarget.id);
}

function dlLinkFromUploadResponse(data) {
  return (
    data?.dlLink ||
    data?.directDL ||
    data?.level?.dlLink ||
    data?.submission?.directDL ||
    null
  );
}

const LevelUploadManagementPopup = ({
  zipTarget,
  onDlLinkChange,
  onLevelRefresh,
  onClose,
  isSuperAdmin = false,
  allowDelete = true,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cdnJobId, setCdnJobId] = useState(null);
  const [urlImportPanelOpen, setUrlImportPanelOpen] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [levelFiles, setLevelFiles] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isReparsing, setIsReparsing] = useState(false);
  const [targetLevel, setTargetLevel] = useState(null);
  const [originalZip, setOriginalZip] = useState(null);
  const [songFiles, setSongFiles] = useState({});
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const uploadFailureHandledRef = useRef(false);
  const dragCounterRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { t } = useTranslation(['components', 'common']);

  /** Prefer API `error` + `code`; append HTTP code when helpful for admins. */
  const formatAxiosLevelError = (err, fallbackMessage) => {
    const data = err.response?.data;
    const status = err.response?.status;
    const msg = typeof data?.error === 'string' ? data.error.trim() : '';
    const code =
      typeof data?.code === 'number' ? data.code : typeof status === 'number' ? status : null;
    if (msg && code != null && !/\(HTTP\s*\d+\)/i.test(msg) && !/\bHTTP\s*\d{3}\b/i.test(msg)) {
      return `${msg} (HTTP ${code})`;
    }
    if (msg) {
      return msg;
    }
    if (code != null) {
      return `${fallbackMessage} (HTTP ${code})`;
    }
    return fallbackMessage;
  };

  /** Job failures (CDN ingest etc.) expose `message`; HTTP errors use API `error` fields. */
  const resolveUserMessage = (err, fallbackMessage) => {
    if (err?.job) {
      return formatJobFailureMessage(err, fallbackMessage);
    }
    return formatAxiosLevelError(err, fallbackMessage);
  };

  const notifyError = (message) => {
    toastError(message);
  };

  const resetUploadUi = useCallback(() => {
    setIsUploading(false);
    setCdnJobId(null);
    setUploadProgress(0);
    abortControllerRef.current = null;
  }, []);

  const { job: cdnJob } = useJobProgressStream(cdnJobId, Boolean(isUploading && cdnJobId));

  /** SSE delivers `failed` before poll-based wait returns — toast and reset immediately. */
  useLayoutEffect(() => {
    if (!isUploading || !cdnJob || cdnJob.phase !== 'failed') {
      return;
    }
    if (uploadFailureHandledRef.current) {
      return;
    }
    uploadFailureHandledRef.current = true;

    const fallbackKey =
      cdnJob?.meta?.source === 'upload_from_url'
        ? 'levelUploadManagement.errors.importFailed'
        : 'levelUploadManagement.errors.uploadFailed';
    notifyError(formatJobFailureMessage({ job: cdnJob }, t(fallbackKey)));

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    resetUploadUi();
  }, [isUploading, cdnJob, t, resetUploadUi]);

  /** Orphan assembled session or zip missing on server — safe to retry once with `forceNew` on /init. */
  const isRecoverableStaleAssembledUpload = (err) => {
    const status = err?.response?.status;
    const msg = typeof err?.response?.data?.error === 'string' ? err.response.data.error : '';
    if (status === 409) {
      return /fresh|missing|readable|workspace|ENOENT|disk|sync|chunked upload/i.test(msg);
    }
    if (status === 500 && /ENOENT|assembled zip not readable|not readable at/i.test(msg)) {
      return true;
    }
    return false;
  };

  /**
   * Load LEVELZIP file list from the search API (proxies CDN metadata).
   * @param {string} [dlLinkOverride] — When set (e.g. right after upload), use this URL instead of
   *   `zipTarget.dlLink`. Required because parent state does not update the closure until the next
   *   render; calling without an override immediately after upload would still request the old file id.
   */
  const fetchLevelFiles = useCallback(async (dlLinkOverride) => {
    const dlLink = dlLinkOverride ?? zipTarget.dlLink;
    if (dlLink && dlLink !== 'removed' && isCdnUrl(dlLink)) {
      try {
        const fileId = dlLink.split('/').pop();
        const response = await api.get(`${routes.database.levels.root()}/cdn-zip-metadata/${fileId}`);
        const data = response.data;
        
        if (data.metadata) {
          const allLevelFiles = Array.isArray(data.metadata.allLevelFiles) ? data.metadata.allLevelFiles : [];
          const levelFilesMap = data.metadata.levelFiles || {};

          const files = allLevelFiles.length > 0
            ? allLevelFiles.map((file) => {
                const relativePath = file.relativePath || file.name;
                return {
                  ...file,
                  fullPath: relativePath,
                  storagePath: file.path || levelFilesMap[relativePath]?.path,
                };
              })
            : Object.entries(levelFilesMap).map(([key, file]) => ({
                ...file,
                fullPath: file.relativePath || key,
                storagePath: file.path,
              }));
          setLevelFiles(files);

          // Set song files
          setSongFiles(data.metadata.songFiles);

          // Set original zip info
          setOriginalZip(data.metadata.originalZip);

          // Set target level as canonical relative/full path for reliable matching.
          const targetPath =
            data.metadata.targetLevelRelativePath ||
            files.find((f) => f.storagePath === data.metadata.targetLevel)?.fullPath ||
            data.metadata.targetLevel ||
            null;
          setTargetLevel(targetPath);
        }
      } catch (error) {
        console.error('Error fetching level files:', error);
        notifyError(t('levelUploadManagement.errors.fetchFailed'));
      }
    } else {
      setLevelFiles([]);
      setSongFiles({});
      setOriginalZip(null);
      setTargetLevel(null);
    }
  }, [zipTarget.dlLink, t]);

  useEffect(() => {
    void fetchLevelFiles();
  }, [fetchLevelFiles]);

  const refreshLevelMetadata = async (dlLinkHint) => {
    if (zipTarget.kind !== 'level' || !onLevelRefresh) {
      return;
    }
    try {
      const response = await api.get(`${routes.database.levels.root()}/${zipTarget.id}`);
      const fullLevel = response?.data?.level ?? response?.data?.data?.level ?? response?.data ?? null;
      if (!fullLevel) return;

      const hint =
        dlLinkHint != null && dlLinkHint !== '' && dlLinkHint !== 'removed' && isCdnUrl(String(dlLinkHint))
          ? String(dlLinkHint)
          : null;

      onLevelRefresh(fullLevel, hint);
    } catch (error) {
      // Non-fatal: upload/select already succeeded; this is just metadata refresh.
      console.warn('[LevelUploadManagementPopup] Failed to refresh level metadata:', error);
    }
  };

  useEffect(() => {
    const v = zipTarget?.dlLink;
    const ws = typeof zipTarget?.workshopLink === 'string' ? zipTarget.workshopLink.trim() : '';
    if (!v || v === 'removed') {
      setImportUrl(ws || '');
    } else {
      setImportUrl(rewriteDiscordCdnHost(String(v)));
    }
  }, [zipTarget?.id, zipTarget?.kind, zipTarget?.dlLink, zipTarget?.workshopLink]);

  useEffect(() => {
    setUrlImportPanelOpen(false);
  }, [zipTarget?.id, zipTarget?.kind]);

  const closeUrlImportPanel = () => {
    if (isUploading) {
      return;
    }
    setUrlImportPanelOpen(false);
  };

  // Cleanup: Cancel any ongoing requests when component unmounts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const applySuccessfulLevelUpload = (newDlLink, { closeUrlPanel = false } = {}) => {
    if (onDlLinkChange && newDlLink) {
      onDlLinkChange(newDlLink);
    }
    if (newDlLink) {
      setImportUrl(String(newDlLink));
    }
    setUploadProgress(100);
    if (closeUrlPanel) {
      setUrlImportPanelOpen(false);
    }
    void fetchLevelFiles(newDlLink);
    void refreshLevelMetadata(newDlLink);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading) return;
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (isUploading) return;

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    if (!isAcceptedArchiveFile(file)) {
      notifyError(t('levelUploadManagement.errors.invalidZip'));
      return;
    }
    void processZipUpload(file);
  };

  const processZipUpload = async (file) => {
    if (!file) return;

    // Create abort controller for this upload
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      uploadFailureHandledRef.current = false;
      dragCounterRef.current = 0;
      setIsDragOver(false);
      setIsUploading(true);
      setUploadProgress(0);

      const maxAttempts = 2;
      let lastError = null;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const jobId = createUploadJobId();
        setCdnJobId(jobId);
        const forceNew = attempt > 0;

        try {
          const client = new ChunkedUploadClient({ kind: 'level-zip' });
          const { session: uploadSession } = await client.upload(file, {
            meta: zipTargetChunkedMeta(zipTarget),
            signal,
            forceNew,
            onProgress: ({ phase, percent }) => {
              const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
              if (phase === 'hashing') setUploadProgress(Math.round(clamped * 0.15));
              else if (phase === 'uploading') setUploadProgress(15 + Math.round(clamped * 0.8));
              else if (phase === 'completing') setUploadProgress(95 + Math.round(clamped * 0.05));
            },
          });

          if (signal.aborted) return;

          const response = await api.post(
            zipTargetUploadUrl(zipTarget),
            {
              sessionId: uploadSession.id,
              uploadJobId: jobId,
            },
            {
              signal,
              timeout: 120 * 60 * 1000,
            },
          );

          if (signal.aborted) {
            return;
          }

          if (response.status === 202) {
            const job = await waitForJobCompletion(jobId, { signal, timeoutMs: 120 * 60 * 1000 });
            const newId = job?.newFileId ?? job?.meta?.newFileId;
            if (!newId || typeof newId !== 'string') {
              throw new Error('Upload finished but server did not return a file id');
            }
            const base = String(import.meta.env.VITE_CDN_URL || '').replace(/\/$/, '');
            const newDlLink = `${base}/${newId}`;
            applySuccessfulLevelUpload(newDlLink, { closeUrlPanel: false });
            toastSuccess(t('levelUploadManagement.upload.success'));
            return;
          }

          if (response.data.success) {
            const newDlLink = dlLinkFromUploadResponse(response.data);
            if (!newDlLink) {
              throw new Error('Upload finished but server did not return a file id');
            }
            applySuccessfulLevelUpload(newDlLink, { closeUrlPanel: false });
            toastSuccess(t('levelUploadManagement.upload.success'));
            return;
          }

          lastError = new Error('Upload response was not successful');
        } catch (err) {
          lastError = err;
          const retry =
            attempt < maxAttempts - 1 &&
            !signal.aborted &&
            !(api.isCancel && api.isCancel(err)) &&
            err?.name !== 'AbortError' &&
            err?.name !== 'CanceledError' &&
            isRecoverableStaleAssembledUpload(err);
          if (retry) {
            setUploadProgress(0);
            continue;
          }
          throw err;
        }
      }
      throw lastError || new Error('Upload failed');
    } catch (error) {
      // Don't show error if request was cancelled (user closed popup or navigated away)
      if (api.isCancel && api.isCancel(error)) {
        return;
      }
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return;
      }
      if (!uploadFailureHandledRef.current) {
        notifyError(resolveUserMessage(error, t('levelUploadManagement.errors.uploadFailed')));
      }
      console.error('Error uploading level:', error);
    } finally {
      if (!uploadFailureHandledRef.current) {
        resetUploadUi();
      }
      uploadFailureHandledRef.current = false;
    }
  };

  const handleZipUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processZipUpload(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadFromUrl = async () => {
    const trimmed = importUrl.trim();
    if (!trimmed) {
      notifyError(t('levelUploadManagement.errors.missingUrl'));
      return;
    }
    if (isCdnUrl(trimmed)) {
      notifyError(t('levelUploadManagement.errors.cdnNotAllowed'));
      return;
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      uploadFailureHandledRef.current = false;
      setIsUploading(true);
      setUploadProgress(0);
      const jobId = createUploadJobId();
      setCdnJobId(jobId);

      const response = await api.post(
        zipTargetUploadFromUrl(zipTarget),
        { url: trimmed, uploadJobId: jobId },
        {
          signal,
          timeout: 120 * 60 * 1000,
        },
      );

      if (signal.aborted) {
        return;
      }

      if (response.status === 202) {
        const job = await waitForJobCompletion(jobId, { signal, timeoutMs: 120 * 60 * 1000 });
        const newId = job?.newFileId ?? job?.meta?.newFileId;
        if (!newId || typeof newId !== 'string') {
          throw new Error('Import finished but server did not return a file id');
        }
        const base = String(import.meta.env.VITE_CDN_URL || '').replace(/\/$/, '');
        const newDlLink = `${base}/${newId}`;
        applySuccessfulLevelUpload(newDlLink, { closeUrlPanel: true });
        toastSuccess(t('levelUploadManagement.upload.importSuccess'));
        return;
      }

      if (response.data.success) {
        const newDlLink = dlLinkFromUploadResponse(response.data);
        if (!newDlLink) {
          throw new Error('Import finished but server did not return a file id');
        }
        applySuccessfulLevelUpload(newDlLink, { closeUrlPanel: true });
        toastSuccess(t('levelUploadManagement.upload.importSuccess'));
      }
    } catch (err) {
      if (api.isCancel && api.isCancel(err)) {
        return;
      }
      if (err.name === 'AbortError' || err.name === 'CanceledError') {
        return;
      }
      if (!uploadFailureHandledRef.current) {
        notifyError(resolveUserMessage(err, t('levelUploadManagement.errors.importFailed')));
      }
      console.error('Error importing level from URL:', err);
    } finally {
      if (!uploadFailureHandledRef.current) {
        resetUploadUi();
      }
      uploadFailureHandledRef.current = false;
    }
  };

  const handleLevelSelect = async () => {
    if (!selectedLevel || isSelecting || isReparsing || selectedLevel === targetLevel) return;

    try {
      setIsSelecting(true);
      const result = await api.post(zipTargetSelectLevelUrl(zipTarget), {
        selectedLevel,
      });

      if (result.data.success) {
        setTargetLevel(selectedLevel);
        fetchLevelFiles();
        void refreshLevelMetadata();
        toastSuccess(t('levelUploadManagement.select.success'));
      } else {
        notifyError(result.data.error || t('levelUploadManagement.errors.selectFailed'));
      }
    } catch (error) {
      notifyError(resolveUserMessage(error, t('levelUploadManagement.errors.selectFailed')));
    } finally {
      setIsSelecting(false);
    }
  };

  const handleReparseChart = async () => {
    if (!originalZip || !targetLevel || isUploading || isSelecting || isReparsing) return;

    try {
      setIsReparsing(true);
      const result = await api.post(zipTargetReparseUrl(zipTarget));

      if (result.data.success) {
        void refreshLevelMetadata();
        toastSuccess(t('levelUploadManagement.reparse.success'));
      } else {
        notifyError(result.data.error || t('levelUploadManagement.errors.reparseFailed'));
      }
    } catch (error) {
      notifyError(resolveUserMessage(error, t('levelUploadManagement.errors.reparseFailed')));
    } finally {
      setIsReparsing(false);
    }
  };

  const handleDelete = async () => {
    if (!allowDelete || zipTarget.kind !== 'level') {
      return;
    }
    if (!window.confirm(t('levelUploadManagement.confirmDelete'))) {
      return;
    }

    try {
      const response = await api.delete(routes.levelsV3.upload(zipTarget.id));
      if (response.data && response.data.success) {
        if (onDlLinkChange) {
          onDlLinkChange('removed');
        }
        
        setLevelFiles([]);
        setSongFiles({});
        setOriginalZip(null);
        setTargetLevel(null);
        setSelectedLevel(null);
        
        onClose();
      }
    } catch (error) {
      notifyError(resolveUserMessage(error, t('levelUploadManagement.errors.deleteFailed')));
    }
  };

  const handleClose = () => {
    // Prevent closing during upload
    if (isUploading) {
      const confirmed = window.confirm(t('levelUploadManagement.confirmCloseDuringUpload') || 'Upload in progress. Are you sure you want to cancel?');
      if (!confirmed) {
        return;
      }
      // Cancel the upload
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
    onClose();
  };

  const streamPct = typeof cdnJob?.percent === 'number' ? cdnJob.percent : 0;
  const fillPct = Math.min(100, Math.max(uploadProgress, streamPct));
  const showUploadProgress = isUploading && cdnJob?.phase !== 'failed';
  const progressJob = showUploadProgress ? cdnJob : null;
  const isUrlImportProgress = progressJob?.meta?.source === 'upload_from_url';
  const progressLine =
    isUrlImportProgress && progressJob?.phase === 'downloading_remote'
      ? `${t('levelUploadManagement.upload.urlStageDownload')}: ${progressJob.message || '…'} · ${streamPct.toFixed(0)}%`
      : isUrlImportProgress && progressJob?.phase && progressJob.phase !== 'downloading_remote'
        ? `${t('levelUploadManagement.upload.urlStageCdn')}: ${progressJob.message || '…'} · ${streamPct.toFixed(0)}%`
        : progressJob?.message
          ? `${progressJob.message} · ${fillPct.toFixed(0)}%`
          : t('levelUploadManagement.upload.progress', { progress: uploadProgress.toFixed(2) });

  const showDropOverlay = isDragOver && !isUploading;

  return (
    <PopupShell
      onClose={handleClose}
      overlayClassName="level-upload-management-popup"
      panelClassName={`level-upload-management-content${showDropOverlay ? ' is-drop-target' : ''}`}
      overlayProps={{
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
      }}
    >
        {showDropOverlay && (
          <div className="level-upload-drop-zone" aria-live="polite">
            <p className="level-upload-drop-zone__message">
              {t('levelUploadManagement.dropToUpload')}
            </p>
          </div>
        )}
        <div
          className="level-upload-management-body"
          aria-hidden={showDropOverlay}
        >
        <div className="level-upload-management-header">
          <h2>{t('levelUploadManagement.title')}</h2>
          <CloseButton
            variant="inline"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            disabled={showUploadProgress}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
        </div>

        {showUploadProgress ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <div className="progress-text">{progressLine}</div>
            <button
              className="cancel-upload-button btn-fill-danger"
              onClick={() => {
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort();
                }
                resetUploadUi();
              }}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
          </div>
        ) : (
          <>
            {originalZip && (
          <div className="level-selection">
            <h3>{t('levelUploadManagement.sections.levelSelection.title')}</h3>
              <div className="original-zip-info">
                <div className="zip-name">{t('levelUploadManagement.sections.levelSelection.originalZip.title', { name: originalZip.name })}</div>
                <div className="zip-size">{t('levelUploadManagement.sections.levelSelection.originalZip.size', { size: (originalZip.size / 1024 / 1024).toFixed(2) })}</div>
              </div>
            {songFiles && Object.keys(songFiles).length > 0 && (
              <div className="song-files-info">
                <h4>{t('levelUploadManagement.sections.levelSelection.songFiles.title')}</h4>
                {songFiles && Object.entries(songFiles).map(([filename, file]) => (
                  <div key={filename} className="song-file">
                    <span className="song-name">{file.name}</span>
                    <span className="song-size">{t('levelUploadManagement.sections.levelSelection.songFiles.size', { size: (file.size / 1024 / 1024).toFixed(2) })}</span>
                  </div>
                ))}
              </div>
            )}
            {targetLevel && (
              <div className="current-target">
                {t('levelUploadManagement.sections.levelSelection.currentTarget', { name: targetLevel })}
              </div>
            )}
            <ZipLevelFilesList
              levelFiles={levelFiles}
              selectedKey={selectedLevel}
              onSelectKey={(key) => {
                setSelectedLevel(key);
              }}
              targetKey={targetLevel}
            />
            {(originalZip && targetLevel) || (selectedLevel && levelFiles.length > 0) ? (
              <div className="level-file-actions">
                {selectedLevel && levelFiles.length > 0 && (
                  <button
                    type="button"
                    className={`select-button btn-fill-primary ${isSelecting ? 'is-selecting' : ''}`}
                    onClick={handleLevelSelect}
                    disabled={!selectedLevel || selectedLevel === targetLevel || isSelecting || isReparsing || isUploading}
                  >
                    {isSelecting
                      ? `${t('levelUploadManagement.buttons.select')}...`
                      : selectedLevel === targetLevel
                        ? t('levelUploadManagement.buttons.currentlySelected')
                        : t('levelUploadManagement.buttons.select')}
                  </button>
                )}
                {originalZip && targetLevel && (
                  <button
                    type="button"
                    className={`reparse-button btn-fill-secondary ${isReparsing ? 'is-reparsing' : ''}`}
                    onClick={handleReparseChart}
                    disabled={isUploading || isSelecting || isReparsing}
                  >
                    {isReparsing
                      ? `${t('levelUploadManagement.buttons.reparse')}...`
                      : t('levelUploadManagement.buttons.reparse')}
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}
          <div className="upload-actions">
            <input
              type="file"
              accept={ARCHIVE_ACCEPT_ATTR}
              onChange={handleZipUpload}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <div className="upload-actions-primary">
              {isSuperAdmin ? (
                urlImportPanelOpen ? (
                  <div className="upload-from-url-panel">
                    <div className="upload-from-url-panel-header">
                      <h3 className="upload-from-url-title">
                        {t('levelUploadManagement.uploadFromUrl.title')}
                      </h3>
                      <button
                        type="button"
                        className="upload-from-url-panel-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          closeUrlImportPanel();
                        }}
                        disabled={isUploading}
                        aria-label={t('levelUploadManagement.uploadFromUrl.closePanelAria')}
                      >
                        <CrossIcon color="#fff" size="20px" />
                      </button>
                    </div>
                    <div className="upload-from-url-row">
                      <input
                        type="url"
                        className="upload-from-url-input"
                        value={importUrl}
                        onChange={(e) => {
                          setImportUrl(e.target.value);
                        }}
                        placeholder={t('levelUploadManagement.uploadFromUrl.placeholder')}
                        disabled={isUploading}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="upload-from-url-submit btn-fill-primary"
                        onClick={handleUploadFromUrl}
                        disabled={isUploading || !importUrl.trim()}
                      >
                        {t('levelUploadManagement.uploadFromUrl.submit')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="upload-actions-inline">
                    <button
                      type="button"
                      className="upload-button btn-fill-primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {t('levelUploadManagement.buttons.uploadNew')}
                    </button>
                    <button
                      type="button"
                      className="upload-import-button"
                      onClick={() => {
                        const ws =
                          typeof zipTarget?.workshopLink === 'string' ? zipTarget.workshopLink.trim() : '';
                        if (ws) {
                          setImportUrl(ws);
                        }
                        setUrlImportPanelOpen(true);
                      }}
                      disabled={isUploading}
                    >
                      {t('levelUploadManagement.buttons.import')}
                    </button>
                  </div>
                )
              ) : (
                <button
                  type="button"
                  className="upload-button upload-button--full btn-fill-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {t('levelUploadManagement.buttons.uploadNew')}
                </button>
              )}
            </div>
            {allowDelete && isCdnUrl(zipTarget.dlLink) && (
              <button
                type="button"
                className="delete-button btn-fill-danger"
                onClick={handleDelete}
                disabled={isUploading}
              >
                {t('levelUploadManagement.buttons.deleteCurrent')}
              </button>
            )}
          </div>
          </>
        )}
        </div>
    </PopupShell>
  );
};

export default LevelUploadManagementPopup; 
// tuf-search: #PackDownloadPopup #packDownloadPopup #popups #packs #packDownload
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useJobProgressStream } from '@/hooks/useJobProgressStream';
import './PackDownloadPopup.css';
import { formatEstimatedSize } from '@/utils/packDownloadUtils';
import { CloseButton } from '@/components/common/buttons';

const DEFAULT_SIZE_SUMMARY = { totalBytes: 0, missingCount: 0, levelCount: 0 };

const PackDownloadPopup = ({
  isOpen,
  onClose,
  contextName,
  sizeSummary = DEFAULT_SIZE_SUMMARY,
  onRequestDownload
}) => {
  const { t } = useTranslation(['components', 'common']);
  const popupRef = useRef(null);
  const [step, setStep] = useState('confirm');
  const [error, setError] = useState(null);
  const [downloadData, setDownloadData] = useState(null);
  const [trimFolderNames, setTrimFolderNames] = useState(false);
  const [packJobId, setPackJobId] = useState(null);

  const { job: packJob } = useJobProgressStream(
    packJobId,
    Boolean(isOpen && step === 'processing' && packJobId)
  );

  const MAX_DOWNLOAD_SIZE_BYTES = 15 * 1024 * 1024 * 1024; // 15GB
  const exceedsSizeLimit = (sizeSummary?.totalBytes || 0) > MAX_DOWNLOAD_SIZE_BYTES;

  const resetState = useCallback(() => {
    setStep('confirm');
    setError(null);
    setDownloadData(null);
    setPackJobId(null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen || step !== 'processing' || !packJobId || !packJob) {
      return;
    }

    if (packJob.phase === 'failed') {
      const msg = packJob.error || packJob.message || t('packPopups.downloadPack.errors.generateFailed');
      setError(msg);
      setStep('confirm');
      setPackJobId(null);
      return;
    }

    if (packJob.phase === 'completed') {
      const url = packJob?.meta?.url;
      if (typeof url === 'string' && url.length > 0) {
        setDownloadData({
          url,
          zipName: packJob?.meta?.zipName,
          cacheKey: packJob?.meta?.cacheKey,
          expiresAt: packJob?.meta?.expiresAt,
        });
        setStep('ready');
      } else {
        setError(t('packPopups.downloadPack.errors.noUrl'));
        setStep('confirm');
        setPackJobId(null);
      }
    }
  }, [isOpen, step, packJobId, packJob, t]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);


  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (!onRequestDownload || step === 'processing' || exceedsSizeLimit) {
      return;
    }

    setError(null);
    setStep('processing');

    const downloadId = crypto.randomUUID();
    setPackJobId(downloadId);

    try {
      const response = await onRequestDownload(downloadId, { trimFolderNames });
      if (response?.url) {
        setDownloadData(response);
        setStep('ready');
      }
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        t('packPopups.downloadPack.errors.generateFailed');
      setError(message);
      setStep('confirm');
      setPackJobId(null);
    }
  };

  const handleDownload = () => {
    if (!downloadData?.url) return;
    window.open(downloadData.url, '_blank', 'noopener,noreferrer');
  };

  const { sizeLabel, missingCount } = formatEstimatedSize(sizeSummary || DEFAULT_SIZE_SUMMARY);

  return (
    <div className="pack-download-popup__overlay">
      <div className="pack-download-popup" ref={popupRef}>
        <CloseButton
          variant="floating"
          className="pack-download-popup__close-btn"
          onClick={onClose}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="pack-download-popup__content">
          <h2 className="pack-download-popup__title">
            {t('packPopups.downloadPack.title', {
              contextName: contextName || t('packPopups.downloadPack.defaultContextName'),
            })}
          </h2>

          {step === 'confirm' && (
            <div className="pack-download-popup__step pack-download-popup__step--confirm">
              {!exceedsSizeLimit && (<p className="pack-download-popup__description">
                {contextName ? (
                  <Trans
                    ns="components"
                    i18nKey="packPopups.downloadPack.description"
                    values={{ contextName }}
                    components={{ strong: <strong /> }}
                  />
                ) : (
                  t('packPopups.downloadPack.descriptionFallback')
                )}
              </p> )}
              <div className="pack-download-popup__estimate-container">
                <span className="pack-download-popup__estimate-label">{t('packPopups.downloadPack.estimatedSize')} </span>
                <span className={`pack-download-popup__estimate-value ${exceedsSizeLimit ? 'exceeded' : ''}`}>
                  {sizeLabel}
                  {missingCount > 0 && (
                    <span className="pack-download-popup__estimate-value-estimated">
                      {t('packPopups.downloadPack.estimatedSuffix', { count: missingCount })}
                    </span>
                  )}
                </span>
              </div>
              {exceedsSizeLimit && (
                <div className="pack-download-popup__error" role="alert">
                  {t('packPopups.downloadPack.sizeExceeded')}
                </div>
              )}
              {missingCount > 0 && !exceedsSizeLimit && (
                <p className="pack-download-popup__notice">
                  {t('packPopups.downloadPack.estimatedMayBeLarger')}
                </p>
              )}
              {error && (
                <div className="pack-download-popup__error" role="alert">
                  {error}
                </div>
              )}
              <label className="pack-download-popup__checkbox-label">
                <input
                  type="checkbox"
                  checked={trimFolderNames}
                  onChange={(e) => setTrimFolderNames(e.target.checked)}
                  className="pack-download-popup__checkbox"
                />
                {t('packPopups.downloadPack.trimFolderNames')}
              </label>
              <div className="pack-download-popup__actions">
                <button
                  className="pack-download-popup__secondary-btn"
                  onClick={onClose}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  className="pack-download-popup__primary-btn"
                  onClick={handleConfirm}
                  disabled={exceedsSizeLimit}
                >
                  {t('packPopups.downloadPack.generateDownload')}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="pack-download-popup__step pack-download-popup__step--processing">
              <div className="spinner spinner-large pack-download-popup__spinner" />
              <p>{t('packPopups.downloadPack.processing')}</p>
              {packJob && typeof packJob.percent === 'number' && (
                <div className="pack-download-popup__progress-container">
                  <div className="pack-download-popup__progress-bar">
                    <div
                      className="pack-download-popup__progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, packJob.percent))}%` }}
                    />
                  </div>
                  <div className="pack-download-popup__progress-text">{packJob.percent}%</div>
                </div>
              )}
              <p className="pack-download-popup__subtext">
                {packJob?.message || t('packPopups.downloadPack.processingSubtext')}
              </p>
            </div>
          )}

          {step === 'ready' && downloadData && (
            <div className="pack-download-popup__step pack-download-popup__step--ready">
              <p>
                {t('packPopups.downloadPack.ready')}
              </p>
              <p className="pack-download-popup__subtext">
                {downloadData.expiresAt
                  ? t('packPopups.downloadPack.readySubtext', { expiresAt: new Date(downloadData.expiresAt).toLocaleString() })
                  : t('packPopups.downloadPack.readySubtextFallback')}
              </p>
              <div className="pack-download-popup__actions">
                <button
                  className="pack-download-popup__secondary-btn"
                  onClick={onClose}
                >
                  {t('packPopups.downloadPack.close')}
                </button>
                <button
                  className="pack-download-popup__primary-btn"
                  disabled={exceedsSizeLimit}
                  onClick={handleDownload}
                >
                  {t('packPopups.downloadPack.download')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PackDownloadPopup;

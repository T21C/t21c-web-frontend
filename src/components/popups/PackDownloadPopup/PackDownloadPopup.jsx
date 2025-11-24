import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './PackDownloadPopup.css';
import { formatEstimatedSize } from '@/utils/packDownloadUtils';

const DEFAULT_SIZE_SUMMARY = { totalBytes: 0, missingCount: 0, levelCount: 0 };

const PackDownloadPopup = ({
  isOpen,
  onClose,
  contextName,
  sizeSummary = DEFAULT_SIZE_SUMMARY,
  onRequestDownload
}) => {
  const { t } = useTranslation('components');
  const tPopup = (key, params = {}) => t(`packPopups.downloadPack.${key}`, params) || key;
  const popupRef = useRef(null);
  const [step, setStep] = useState('confirm');
  const [error, setError] = useState(null);
  const [downloadData, setDownloadData] = useState(null);

  const MAX_DOWNLOAD_SIZE_BYTES = 15 * 1024 * 1024 * 1024; // 15GB
  const exceedsSizeLimit = (sizeSummary?.totalBytes || 0) > MAX_DOWNLOAD_SIZE_BYTES;

  const resetState = useCallback(() => {
    setStep('confirm');
    setError(null);
    setDownloadData(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      return undefined;
    }

    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

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

    try {
      const response = await onRequestDownload();
      if (!response || !response.url) {
        throw new Error('Download link was not returned by the server.');
      }
      setDownloadData(response);
      setStep('ready');
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to generate download link.';
      setError(message);
      setStep('confirm');
    }
  };

  const handleDownload = () => {
    if (!downloadData?.url) return;
    window.open(downloadData.url, '_blank', 'noopener,noreferrer');
  };

  const { sizeLabel, isEstimated } = formatEstimatedSize(sizeSummary || DEFAULT_SIZE_SUMMARY);

  return (
    <div className="pack-download-popup__overlay">
      <div className="pack-download-popup" ref={popupRef}>
        <button
          className="pack-download-popup__close-btn"
          onClick={onClose}
          aria-label="Close pack download popup"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 6L18 18M6 18L18 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="pack-download-popup__content">
          <h2 className="pack-download-popup__title">
            {tPopup('title', { contextName: contextName || 'Pack' })}
          </h2>

          {step === 'confirm' && (
            <div className="pack-download-popup__step pack-download-popup__step--confirm">
              {!exceedsSizeLimit && (<p className="pack-download-popup__description">
                {contextName 
                  ? (() => {
                      const desc = tPopup('description', { contextName: 'PLACEHOLDER' });
                      const parts = desc.split('PLACEHOLDER');
                      return (
                        <>
                          {parts[0]}
                          <strong>{contextName}</strong>
                          {parts[1]}
                        </>
                      );
                    })()
                  : tPopup('descriptionFallback')
                }
              </p> )}
              <div className="pack-download-popup__estimate-container">
                <span className="pack-download-popup__estimate-label">{tPopup('estimatedSize')} </span>
                <span className={`pack-download-popup__estimate-value ${exceedsSizeLimit ? 'exceeded' : ''}`}>
                  {sizeLabel} 
                <span className="pack-download-popup__estimate-value-estimated">{isEstimated}</span></span>
              </div>
              {exceedsSizeLimit && (
                <div className="pack-download-popup__error" role="alert">
                  {tPopup('sizeExceeded')}
                </div>
              )}
              {isEstimated && !exceedsSizeLimit && (
                <p className="pack-download-popup__notice">
                  Some levels are missing size metadata. The final download may
                  be larger than estimated.
                </p>
              )}
              {error && (
                <div className="pack-download-popup__error" role="alert">
                  {error}
                </div>
              )}
              <div className="pack-download-popup__actions">
                <button
                  className="pack-download-popup__secondary-btn"
                  onClick={onClose}
                >
                  {tPopup('cancel')}
                </button>
                <button
                  className="pack-download-popup__primary-btn"
                  onClick={handleConfirm}
                  disabled={exceedsSizeLimit}
                >
                  {tPopup('generateDownload')}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="pack-download-popup__step pack-download-popup__step--processing">
              <div className="pack-download-popup__spinner" />
              <p>{tPopup('processing')}</p>
              <p className="pack-download-popup__subtext">
                {tPopup('processingSubtext')}
              </p>
            </div>
          )}

          {step === 'ready' && downloadData && (
            <div className="pack-download-popup__step pack-download-popup__step--ready">
              <p>
                {tPopup('ready')}
              </p>
              <p className="pack-download-popup__subtext">
                {downloadData.expiresAt
                  ? tPopup('readySubtext', { expiresAt: new Date(downloadData.expiresAt).toLocaleString() })
                  : tPopup('readySubtextFallback')}
              </p>
              <div className="pack-download-popup__actions">
                <button
                  className="pack-download-popup__secondary-btn"
                  onClick={onClose}
                >
                  {tPopup('close')}
                </button>
                <button
                  className="pack-download-popup__primary-btn"
                  disabled={exceedsSizeLimit}
                  onClick={handleDownload}
                >
                  {tPopup('download')}
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


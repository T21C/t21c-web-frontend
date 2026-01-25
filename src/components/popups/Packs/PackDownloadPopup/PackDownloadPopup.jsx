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
  const eventSourceRef = useRef(null);
  const downloadDataRef = useRef(null);
  const [step, setStep] = useState('confirm');
  const [error, setError] = useState(null);
  const [downloadData, setDownloadData] = useState(null);
  const [progress, setProgress] = useState(null);
  
  // Track the pre-generated downloadId for SSE subscription
  const [preDownloadId, setPreDownloadId] = useState(null);

  const MAX_DOWNLOAD_SIZE_BYTES = 15 * 1024 * 1024 * 1024; // 15GB
  const exceedsSizeLimit = (sizeSummary?.totalBytes || 0) > MAX_DOWNLOAD_SIZE_BYTES;

  const resetState = useCallback(() => {
    setStep('confirm');
    setError(null);
    setDownloadData(null);
    setProgress(null);
    setPreDownloadId(null);
  }, []);

  // Clean up SSE when popup closes
  useEffect(() => {
    if (!isOpen) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      resetState();
    }
  }, [isOpen, resetState]);

  // Set up SSE connection when we have a preDownloadId (before API call)
  useEffect(() => {
    if (!preDownloadId) {
      return;
    }

    // Connect to SSE endpoint with specific source for this download BEFORE API call
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const source = `packDownload:${preDownloadId}`;
    const eventSource = new EventSource(`${apiUrl}/events?source=${encodeURIComponent(source)}`, {
      withCredentials: true
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.debug('SSE connected for pack download:', preDownloadId);
    };

    eventSource.onerror = (error) => {
      console.debug('SSE error:', error);
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Only handle packDownloadProgress events
        if (message.type !== 'packDownloadProgress') {
          return;
        }
        
        const data = message.data;
        console.debug('Pack download progress:', data);
        setProgress(data);
        
        // Handle status transitions
        if (data.status === 'failed') {
          setError(data.error || 'Pack generation failed');
          setStep('confirm');
          setProgress(null);
        }
      } catch (e) {
        // Ignore parse errors for non-JSON messages (like keepalive)
      }
    };

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [preDownloadId]);

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
    setProgress(null); // Reset progress

    // Generate a downloadId upfront so we can subscribe to SSE before calling API
    const downloadId = crypto.randomUUID();
    setPreDownloadId(downloadId);

    // Small delay to ensure SSE connection is established before API call starts
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      // Pass the pre-generated downloadId to the API
      const response = await onRequestDownload(downloadId);
      if (!response || !response.url) {
        throw new Error('Download link was not returned by the server.');
      }
      
      setDownloadData(response);
      
      // The API waits for generation to complete before returning a response with a URL.
      // Once we have the URL, the download is ready.
      setStep('ready');
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to generate download link.';
      setError(message);
      setStep('confirm');
      setProgress(null);
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
              <div className="spinner spinner-large pack-download-popup__spinner" />
              <p>{tPopup('processing')}</p>
              
              {progress && (
                <>
                  <div className="pack-download-popup__progress-container">
                    <div className="pack-download-popup__progress-bar">
                      <div 
                        className="pack-download-popup__progress-fill"
                        style={{ width: `${progress.progressPercent || 0}%` }}
                      />
                    </div>
                    <div className="pack-download-popup__progress-text">
                      {progress.progressPercent || 0}%
                    </div>
                  </div>
                  
                  {progress.status === 'processing' && progress.currentLevel && (
                    <p className="pack-download-popup__subtext">
                      Unpacking: {progress.currentLevel}
                      {progress.totalLevels > 0 && (
                        <> ({progress.processedLevels} / {progress.totalLevels})</>
                      )}
                    </p>
                  )}
                  
                  {progress.status === 'zipping' && (
                    <p className="pack-download-popup__subtext">
                      Creating zip file...
                    </p>
                  )}
                  
                  {progress.status === 'uploading' && (
                    <p className="pack-download-popup__subtext">
                      Uploading to storage...
                    </p>
                  )}
                  
                  {!progress.currentLevel && progress.status === 'processing' && (
                    <p className="pack-download-popup__subtext">
                      {tPopup('processingSubtext')}
                    </p>
                  )}
                </>
              )}
              
              {!progress && (
                <p className="pack-download-popup__subtext">
                  {tPopup('processingSubtext')}
                </p>
              )}
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


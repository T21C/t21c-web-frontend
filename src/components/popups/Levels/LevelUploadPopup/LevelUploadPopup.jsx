import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './LevelUploadPopup.css';

const LevelUploadPopup = ({
  isOpen,
  onClose,
  fileName,
  uploadId,
  uploadProgress,
  onUploadComplete
}) => {
  const { t } = useTranslation('components');
  const popupRef = useRef(null);
  const eventSourceRef = useRef(null);
  const [step, setStep] = useState('uploading');
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  const resetState = () => {
    setStep('uploading');
    setError(null);
    setProgress(null);
  };

  // Clean up SSE when popup closes
  useEffect(() => {
    if (!isOpen) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      resetState();
    }
  }, [isOpen]);

  // Set up SSE connection when we have an uploadId
  useEffect(() => {
    if (!uploadId || !isOpen) {
      return;
    }

    // Connect to SSE endpoint with specific source for this upload
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const source = `levelUpload:${uploadId}`;
    const eventSource = new EventSource(`${apiUrl}/events?source=${encodeURIComponent(source)}`, {
      withCredentials: true
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.debug('SSE connected for level upload:', uploadId);
    };

    eventSource.onerror = (error) => {
      console.debug('SSE error:', error);
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Only handle levelUploadProgress events
        if (message.type !== 'levelUploadProgress') {
          return;
        }
        
        const data = message.data;
        console.debug('Level upload progress:', data);
        setProgress(data);
        
        // Handle status transitions
        if (data.status === 'completed') {
          setStep('completed');
          if (onUploadComplete) {
            onUploadComplete();
          }
        } else if (data.status === 'failed') {
          setError(data.error || 'Upload failed');
          setStep('error');
        } else {
          setStep(data.status || 'uploading');
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
  }, [uploadId, isOpen, onUploadComplete]);

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
      if (event.key === 'Escape' && step === 'completed') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && step === 'completed') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, step]);

  // Reset state when uploadId changes
  useEffect(() => {
    if (uploadId) {
      setStep('uploading');
      setError(null);
      setProgress(null);
    }
  }, [uploadId]);

  if (!isOpen) {
    return null;
  }

  const getStatusText = () => {
    if (error) return t('levelUploadPopup.error');
    if (step === 'completed') return t('levelUploadPopup.completed');
    if (step === 'uploading') return t('levelUploadPopup.uploading');
    if (step === 'processing') return t('levelUploadPopup.processing');
    if (step === 'caching') return t('levelUploadPopup.caching');
    return t('levelUploadPopup.processing');
  };

  const getStatusSubtext = () => {
    if (progress?.currentStep) {
      return progress.currentStep;
    }
    if (step === 'uploading') return t('levelUploadPopup.uploadingSubtext');
    if (step === 'processing') return t('levelUploadPopup.processingSubtext');
    if (step === 'caching') return t('levelUploadPopup.cachingSubtext');
    return t('levelUploadPopup.processingSubtext');
  };

  // During file transfer use uploadProgress; after that use server-sent progress
  const effectiveProgressPercent =
    step === 'uploading' && typeof uploadProgress === 'number'
      ? uploadProgress
      : (progress?.progressPercent ?? null);
  const showProgressBar =
    (step === 'uploading' || step === 'processing' || step === 'caching') &&
    effectiveProgressPercent !== null;

  return (
    <div className="level-upload-popup__overlay">
      <div className="level-upload-popup" ref={popupRef}>
        {step === 'completed' && (
          <button
            className="level-upload-popup__close-btn"
            onClick={onClose}
            aria-label="Close level upload popup"
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
        )}

        <div className="level-upload-popup__content">
          <h2 className="level-upload-popup__title">
            {t('levelUploadPopup.title')}
          </h2>

          {fileName && (
            <p className="level-upload-popup__filename">
              {fileName}
            </p>
          )}

          {(step === 'uploading' || step === 'processing' || step === 'caching') && (
            <div className="level-upload-popup__step level-upload-popup__step--processing">
              <div className="spinner spinner-large" />
              <p>{getStatusText()}</p>
              
              {showProgressBar && (
                <>
                  <div className="level-upload-popup__progress-container">
                    <div className="level-upload-popup__progress-bar">
                      <div 
                        className="level-upload-popup__progress-fill"
                        style={{ width: `${effectiveProgressPercent ?? 0}%` }}
                      />
                    </div>
                    <div className="level-upload-popup__progress-text">
                      {effectiveProgressPercent ?? 0}%
                    </div>
                  </div>
                  
                  <p className="level-upload-popup__subtext">
                    {getStatusSubtext()}
                  </p>
                </>
              )}
              
              {!showProgressBar && (
                <p className="level-upload-popup__subtext">
                  {getStatusSubtext()}
                </p>
              )}
            </div>
          )}

          {step === 'completed' && (
            <div className="level-upload-popup__step level-upload-popup__step--completed">
              <div className="level-upload-popup__success-icon">✓</div>
              <p>{t('levelUploadPopup.completed')}</p>
              <p className="level-upload-popup__subtext">
                {t('levelUploadPopup.completedSubtext')}
              </p>
            </div>
          )}

          {step === 'error' && error && (
            <div className="level-upload-popup__step level-upload-popup__step--error">
              <div className="level-upload-popup__error" role="alert">
                {error}
              </div>
              <div className="level-upload-popup__actions">
                <button
                  className="level-upload-popup__primary-btn"
                  onClick={onClose}
                >
                  {t('levelUploadPopup.close')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LevelUploadPopup;

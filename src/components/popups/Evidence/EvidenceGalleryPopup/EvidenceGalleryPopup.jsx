import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './evidenceGalleryPopup.css';

export const EvidenceGalleryPopup = ({ evidence, onClose, onDelete = null, canDelete = false }) => {
  const { t } = useTranslation('components');
  const tGallery = (key, params = {}) => t(`evidenceGallery.${key}`, params) || key;
  const popupRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const evidenceList = Array.isArray(evidence) ? evidence : [];

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (isZoomed) {
          setIsZoomed(false);
        } else {
          onClose();
        }
      }
    };

    const handleKeyNavigation = (event) => {
      if (event.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (event.key === 'ArrowRight' && currentIndex < evidenceList.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('keydown', handleKeyNavigation);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('keydown', handleKeyNavigation);
    };
  }, [onClose, isZoomed, currentIndex, evidenceList.length]);

  useEffect(() => {
    document.body.classList.add('body-scroll-lock');
    return () => document.body.classList.remove('body-scroll-lock');
  }, []);

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      if (isZoomed) {
        setIsZoomed(false);
      } else {
        onClose();
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isZoomed]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < evidenceList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDelete = async (evidenceId, index) => {
    if (!onDelete || !canDelete) return;
    
    if (window.confirm(tGallery('confirmDelete'))) {
      try {
        await onDelete(evidenceId);
        // If we deleted the current image, adjust index
        if (index === currentIndex && currentIndex >= evidenceList.length - 1) {
          setCurrentIndex(Math.max(0, currentIndex - 1));
        }
      } catch (error) {
        console.error('Error deleting evidence:', error);
      }
    }
  };

  if (evidenceList.length === 0) {
    return (
      <div className="evidence-gallery-popup-overlay" onClick={onClose}>
        <div className="evidence-gallery-popup" ref={popupRef} onClick={(e) => e.stopPropagation()}>
          <div className="popup-header">
            <h2>{tGallery('title')}</h2>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <div className="popup-content">
            <p className="no-evidence">{tGallery('noEvidence')}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentEvidence = evidenceList[currentIndex];

  return (
    <div className="evidence-gallery-popup-overlay" onClick={onClose}>
      <div className={`evidence-gallery-popup ${isZoomed ? 'zoomed' : ''}`} ref={popupRef} onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>
            {tGallery('title')} ({currentIndex + 1}/{evidenceList.length})
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="evidence-image-container">
            {evidenceList.length > 1 && (
              <>
                <button
                  className="nav-button prev-button"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  aria-label={tGallery('previous')}
                >
                  ‹
                </button>
                <button
                  className="nav-button next-button"
                  onClick={handleNext}
                  disabled={currentIndex === evidenceList.length - 1}
                  aria-label={tGallery('next')}
                >
                  ›
                </button>
              </>
            )}

            <div className="evidence-image-wrapper" onClick={() => setIsZoomed(!isZoomed)}>
              <img
                src={currentEvidence.link}
                alt={`Evidence ${currentIndex + 1}`}
                className={`evidence-image ${isZoomed ? 'zoomed' : ''}`}
              />
            </div>

            {canDelete && onDelete && (
              <button
                className="delete-evidence-button"
                onClick={() => handleDelete(currentEvidence.id, currentIndex)}
                title={tGallery('delete')}
              >
                🗑️
              </button>
            )}
          </div>

          {evidenceList.length > 1 && (
            <div className="evidence-thumbnails">
              {evidenceList.map((item, index) => (
                <div
                  key={item.id || index}
                  className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                >
                  <img src={item.link} alt={`Thumbnail ${index + 1}`} />
                </div>
              ))}
            </div>
          )}

          {currentEvidence.type && (
            <div className="evidence-info">
              <span className="evidence-type">{tGallery('type')}: {currentEvidence.type}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvidenceGalleryPopup;

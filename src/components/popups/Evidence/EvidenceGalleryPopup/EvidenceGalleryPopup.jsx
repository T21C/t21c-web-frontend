import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './evidenceGalleryPopup.css';

export const EvidenceGalleryPopup = ({ evidence, onClose, onDelete = null, canDelete = false }) => {
  const { t } = useTranslation('components');
  const tGallery = (key, params = {}) => t(`evidenceGallery.${key}`, params) || key;
  const popupRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const evidenceList = Array.isArray(evidence) ? evidence : [];

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (zoom > 1) {
          setZoom(1);
          setPosition({ x: 0, y: 0 });
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
  }, [onClose, zoom, currentIndex, evidenceList.length]);

  useEffect(() => {
    document.body.classList.add('body-scroll-lock');
    return () => document.body.classList.remove('body-scroll-lock');
  }, []);

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!containerRef.current || !imageRef.current) return;
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(1, Math.min(5, zoom + delta));
    
    // Get container and image dimensions
    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    // Mouse position relative to container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Calculate zoom towards mouse position
    const scale = newZoom / zoom;
    
    // Container center
    const containerCenterX = containerRect.width / 2;
    const containerCenterY = containerRect.height / 2;
    
    // Current mouse position relative to the image center (accounting for current position)
    const imageCenterX = containerCenterX + position.x;
    const imageCenterY = containerCenterY + position.y;
    const relativeX = mouseX - imageCenterX;
    const relativeY = mouseY - imageCenterY;
    
    // Calculate new position to keep mouse at same point on image
    let newX = position.x - (relativeX * (scale - 1));
    let newY = position.y - (relativeY * (scale - 1));
    
    // Calculate bounds - only constrain if image would go beyond container edges
    const scaledImageWidth = imageRect.width * newZoom;
    const scaledImageHeight = imageRect.height * newZoom;
    const maxX = scaledImageWidth > containerRect.width ? (scaledImageWidth - containerRect.width) / 2 : 0;
    const maxY = scaledImageHeight > containerRect.height ? (scaledImageHeight - containerRect.height) / 2 : 0;
    
    // Only constrain when reaching edges
    let constrainedX = newX;
    let constrainedY = newY;
    
    if (maxX > 0) {
      constrainedX = Math.max(-maxX, Math.min(maxX, newX));
    } else {
      constrainedX = 0; // If image fits, center it
    }
    
    if (maxY > 0) {
      constrainedY = Math.max(-maxY, Math.min(maxY, newY));
    } else {
      constrainedY = 0; // If image fits, center it
    }
    
    setZoom(newZoom);
    setPosition({
      x: constrainedX,
      y: constrainedY
    });
  };

  const handleMouseDown = (e) => {
    if (zoom > 1 && e.button === 0) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Constrain dragging within container bounds
      if (containerRef.current && imageRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const imageRect = imageRef.current.getBoundingClientRect();
        
        const scaledImageWidth = imageRect.width * zoom;
        const scaledImageHeight = imageRect.height * zoom;
        const maxX = Math.max(0, (scaledImageWidth - containerRect.width) / 2);
        const maxY = Math.max(0, (scaledImageHeight - containerRect.height) / 2);
        
        setPosition({
          x: Math.max(-maxX, Math.min(maxX, newX)),
          y: Math.max(-maxY, Math.min(maxY, newY))
        });
      } else {
        setPosition({ x: newX, y: newY });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(2);
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
      <div className="evidence-gallery-popup" ref={popupRef} onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>
            {tGallery('title')} ({currentIndex + 1}/{evidenceList.length})
          </h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div 
            className="evidence-image-container"
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ 
              cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
              overflow: zoom > 1 ? 'hidden' : 'hidden'
            }}
          >
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

            <div 
              className="evidence-image-wrapper"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <img
                ref={imageRef}
                src={currentEvidence.link}
                alt={`Evidence ${currentIndex + 1}`}
                className="evidence-image"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                onDoubleClick={handleDoubleClick}
                draggable={false}
              />
            </div>

            {zoom > 1 && (
              <div className="zoom-controls">
                <button
                  className="zoom-reset-button"
                  onClick={() => {
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                  }}
                  title={tGallery('resetZoom')}
                >
                  Reset
                </button>
                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              </div>
            )}

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

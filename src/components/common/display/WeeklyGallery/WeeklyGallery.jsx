import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './WeeklyGallery.css';
import { ArrowIcon } from '../../icons';

const WeeklyGallery = ({ 
  curations = [], 
  autoScroll = false, 
  autoScrollInterval = 5000,
  onCurationClick = null,
  className = ''
}) => {
  const { t } = useTranslation('components');
  const tGallery = (key, params = {}) => t(`weeklyGallery.${key}`, params);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(autoScroll);
  const autoScrollRef = useRef(null);
  const containerRef = useRef(null);
  
  // Handle auto-scroll
  useEffect(() => {
    if (isAutoScrolling && curations.length > 1) {
      autoScrollRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % curations.length);
      }, autoScrollInterval);
    } else if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current);
      autoScrollRef.current = null;
    }

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [isAutoScrolling, curations.length, autoScrollInterval]);

  // Update auto-scroll state when prop changes
  useEffect(() => {
    setIsAutoScrolling(autoScroll);
  }, [autoScroll]);

  // Pause auto-scroll on user interaction
  const pauseAutoScroll = useCallback(() => {
    if (isAutoScrolling) {
      setIsAutoScrolling(false);
      // Resume after 10 seconds of inactivity
      setTimeout(() => setIsAutoScrolling(true), 10000);
    }
  }, [isAutoScrolling]);

  const goToIndex = useCallback((index) => {
    setCurrentIndex(index);
    pauseAutoScroll();
  }, [pauseAutoScroll]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % curations.length);
    pauseAutoScroll();
  }, [curations.length, pauseAutoScroll]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + curations.length) % curations.length);
    pauseAutoScroll();
  }, [curations.length, pauseAutoScroll]);

  // Calculate positions for each curation
  const getCurationPosition = (index) => {
    const totalItems = curations.length;
    if (totalItems === 0) return { zIndex: 0, opacity: 0, transform: 'translateX(0)' };
    
    const relativeIndex = (index - currentIndex + totalItems) % totalItems;
    
    // Center item (current)
    if (relativeIndex === 0) {
      return {
        zIndex: 10,
        opacity: 1,
        transform: 'translateX(0) scale(1)',
        filter: 'brightness(1)'
      };
    }
    
    // Left side items (up to 2) - now move right when going to previous
    if (relativeIndex <= 2) {
      const rightOffset = 120 + (relativeIndex - 1) * 80;
      const scale = 1 - (relativeIndex * 0.15);
      const opacity = 1 - (relativeIndex * 0.3);
      return {
        zIndex: 5 - relativeIndex,
        opacity: Math.max(0.3, opacity),
        transform: `translateX(${rightOffset}px) scale(${scale})`,
        filter: `brightness(${0.7 - (relativeIndex * 0.2)})`
      };
    }
    
    // Right side items (up to 2) - now move left when going to next
    if (relativeIndex >= totalItems - 2) {
      const leftRelativeIndex = totalItems - relativeIndex;
      const leftOffset = -120 - (leftRelativeIndex - 1) * 80;
      const scale = 1 - (leftRelativeIndex * 0.15);
      const opacity = 1 - (leftRelativeIndex * 0.3);
      return {
        zIndex: 5 - leftRelativeIndex,
        opacity: Math.max(0.3, opacity),
        transform: `translateX(${leftOffset}px) scale(${scale})`,
        filter: `brightness(${0.7 - (leftRelativeIndex * 0.2)})`
      };
    }
    
    // Hidden items
    return {
      zIndex: 0,
      opacity: 0,
      transform: 'translateX(0) scale(0.5)',
      filter: 'brightness(0.3)'
    };
  };

  if (curations.length === 0) {
    return (
      <div className={`weekly-gallery ${className}`}>
        <div className="weekly-gallery__empty">
          <div className="weekly-gallery__empty-icon">🎵</div>
          <p>{tGallery('empty')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`weekly-gallery ${className}`} ref={containerRef}>
      {/* Gallery Container */}
      <div className="weekly-gallery__container">
        {/* Navigation Arrows */}
        {curations.length > 1 && (
          <>
            <button 
              className="weekly-gallery__arrow weekly-gallery__arrow--left"
              onClick={goToPrevious}
              aria-label={tGallery('navigation.previous')}
            >
              <ArrowIcon style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button 
              className="weekly-gallery__arrow weekly-gallery__arrow--right"
              onClick={goToNext}
              aria-label={tGallery('navigation.next')}
            >
              <ArrowIcon />
            </button>
          </>
        )}

        {/* Curations */}
        <div className="weekly-gallery__items">
          {curations.map((curation, index) => {
            const position = getCurationPosition(index);
            return (
              <div
                key={curation.id}
                className={`weekly-gallery__item ${position.zIndex === 0 ? 'active' : ''}`}
                style={{
                  zIndex: position.zIndex,
                  opacity: position.opacity,
                  transform: position.transform,
                  filter: position.filter,
                  pointerEvents: position.opacity === 1 ? 'auto' : 'none'
                }}
                onClick={() => onCurationClick?.(curation)}
              >
                <div className="weekly-gallery__item-preview">
                  {curation.previewLink ? (
                    <img 
                      src={curation.previewLink} 
                      alt={`${curation.level?.song || 'Unknown'} thumbnail`}
                      className="weekly-gallery__thumbnail"
                    />
                  ) : (
                    <div className="weekly-gallery__no-thumbnail">
                      🎵
                    </div>
                  )}
                </div>
                
                <div className="weekly-gallery__item-overlay">
                  <div className="weekly-gallery__item-info">
                    <h3 className="weekly-gallery__item-title">
                      {curation.level?.song || 'Unknown Song'}
                    </h3>
                    <p className="weekly-gallery__item-artist">
                      {curation.level?.artist || 'Unknown Artist'}
                    </p>
                    <div 
                      className="weekly-gallery__item-type"
                      style={{ 
                        backgroundColor: curation.type?.color + '80' || '#60606080'
                      }}
                    >
                      {curation.type?.name || 'Unknown Type'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dots Navigation */}
        {curations.length > 1 && (
          <div className="weekly-gallery__dots">
            {curations.map((_, index) => (
              <button
                key={index}
                className={`weekly-gallery__dot ${index === currentIndex ? 'weekly-gallery__dot--active' : ''}`}
                onClick={() => goToIndex(index)}
                aria-label={tGallery('navigation.goTo', { position: index + 1 })}
              />
            ))}
          </div>
        )}

        {/* Auto-scroll indicator */}
        {isAutoScrolling && curations.length > 1 && (
          <div className="weekly-gallery__auto-scroll-indicator">
            <div className="weekly-gallery__auto-scroll-dot" />
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyGallery;

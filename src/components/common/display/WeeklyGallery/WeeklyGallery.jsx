import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import './WeeklyGallery.css';
import { ArrowIcon } from '../../icons';
import { formatCreatorDisplay } from '@/utils/Utility';
import { NavLink } from 'react-router-dom';

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const autoScrollRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
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
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }
    };
  }, [isAutoScrolling, curations.length, autoScrollInterval]);

  // Update auto-scroll state when prop changes
  useEffect(() => {
    setIsAutoScrolling(autoScroll);
  }, [autoScroll]);

  // Handle window resize for responsive positioning
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Unified pause mechanism to prevent race conditions
  const pauseWithTimeout = useCallback(() => {
    if (!autoScroll || curations.length <= 1) return;
    
    // Clear any existing timeout
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    
    // Pause auto-scrolling
    setIsAutoScrolling(false);
    
    // Resume after 10 seconds
    pauseTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(true);
      pauseTimeoutRef.current = null;
    }, 10000);
  }, [autoScroll, curations.length]);

  // Pause auto-scroll on user interaction
  const pauseAutoScroll = useCallback(() => {
    if (isAutoScrolling) {
      pauseWithTimeout();
    }
  }, [isAutoScrolling, pauseWithTimeout]);

  // Handle hover to pause auto-scroll
  const handleMouseEnter = useCallback(() => {
    if (autoScroll && curations.length > 1) {
      // Clear any existing timeout and pause immediately
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
      setIsAutoScrolling(false);
    }
  }, [autoScroll, curations.length]);

  const handleMouseLeave = useCallback(() => {
    if (autoScroll && curations.length > 1) {
      pauseWithTimeout();
    }
  }, [autoScroll, curations.length, pauseWithTimeout]);

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
    
    // Get viewport width for responsive positioning
    const isMobile = windowWidth <= 768;
    const isSmallPhone = windowWidth <= 480;
    
    // Responsive offsets and scales
    const baseOffset = isSmallPhone ? 80 : isMobile ? 120 : 160;
    const offsetIncrement = isSmallPhone ? 60 : isMobile ? 90 : 120;
    const scaleReduction = isSmallPhone ? 0.1 : isMobile ? 0.12 : 0.15;
    const opacityReduction = isSmallPhone ? 0.25 : isMobile ? 0.28 : 0.3;
    
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
      const rightOffset = baseOffset + (relativeIndex - 1) * offsetIncrement;
      const scale = 1 - (relativeIndex * scaleReduction);
      const opacity = 1 - (relativeIndex * opacityReduction);
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
      const leftOffset = -baseOffset - (leftRelativeIndex - 1) * offsetIncrement;
      const scale = 1 - (leftRelativeIndex * scaleReduction);
      const opacity = 1 - (leftRelativeIndex * opacityReduction);
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


  const getThumbnailUrl = (level) => {
    if (level.videoLink) {
      const videoId = level.videoLink.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/videos\/)|youtube-nocookie\.com\/(?:embed\/|v\/)|youtube\.com\/(?:v\/|e\/|embed\/|user\/[^/]+\/u\/[0-9]+\/)|watch\?v=)([^#\&\?]*)/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }
    return null;
  };
  return (
    <div 
      className={`weekly-gallery ${className}`} 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
              <NavLink
                to={`/levels/${curation.scheduledCuration?.level?.id || curation.level?.id}`}
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
                
                    <img 
                      src={curation.previewLink || getThumbnailUrl(curation.level)}
                      alt={`${curation.level?.song || 'Unknown'} thumbnail`}
                      className="weekly-gallery__thumbnail"
                    />
                  
                </div>
                
                <div className="weekly-gallery__item-overlay">
                  {/* Top Left: Level Info */}
                  <div className="weekly-gallery__item-info-top-left">
                    <div className="weekly-gallery__level-id-container">
                      <div className="weekly-gallery__level-id">#{curation.scheduledCuration?.level?.id || curation.level?.id || '?'} </div>
                      <div className="weekly-gallery__charter-name">By {formatCreatorDisplay(curation.scheduledCuration?.level || curation.level)}</div>
                    </div>
                    <div className="weekly-gallery__song-title">{curation.scheduledCuration?.level?.song || curation.level?.song || 'Unknown Song'}</div>
                    <div className="weekly-gallery__artist-name">{curation.scheduledCuration?.level?.artist || curation.level?.artist || 'Unknown Artist'}</div>
                    
                  </div>

                  {/* Top Right: Icons */}
                  <div className="weekly-gallery__item-icons-top-right">
                    {/* Curation Type Icon */}
                    <div className="weekly-gallery__curation-icon">
                      {(curation.scheduledCuration?.type?.icon || curation.type?.icon) ? (
                        <img 
                          src={curation.scheduledCuration?.type?.icon || curation.type?.icon} 
                          alt={curation.scheduledCuration?.type?.name || curation.type?.name || 'Curation Type'} 
                          className="weekly-gallery__type-icon"
                        />
                      ) : (
                        <div className="weekly-gallery__type-icon-placeholder">🎵</div>
                      )}
                    </div>
                    
                    {/* Difficulty Icon */}
                    <div className="weekly-gallery__difficulty-icon">
                      {(curation.scheduledCuration?.level?.difficulty?.icon || curation.level?.difficulty?.icon) ? (
                        <img 
                          src={curation.scheduledCuration?.level?.difficulty?.icon || curation.level?.difficulty?.icon} 
                          alt={curation.scheduledCuration?.level?.difficulty?.name || curation.level?.difficulty?.name || 'Difficulty'} 
                          className="weekly-gallery__difficulty-icon-img"
                        />
                      ) : (
                        <div className="weekly-gallery__difficulty-icon-placeholder">?</div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Center: Short Description */}
                  <div className="weekly-gallery__item-short-description">
                    {(curation.scheduledCuration?.shortDescription || curation.shortDescription) && (
                      <p className="weekly-gallery__short-description-text">
                        {curation.scheduledCuration?.shortDescription || curation.shortDescription}
                      </p>
                    )}
                  </div>
                </div>
              </NavLink>
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

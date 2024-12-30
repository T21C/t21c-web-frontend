import React, { useEffect, useRef } from 'react';
import './ratinghelppopup.css';
import { useTranslation } from 'react-i18next';

export const RatingHelpPopup = ({ onClose }) => {
  const { t } = useTranslation('components');
  const tHelp = (key) => t(`rating.helpPopup.${key}`);
  const popupRef = useRef(null);

  useEffect(() => {
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
  }, [onClose]);

  return (
    <div className="rating-help-popup-overlay">
      <div className="rating-help-popup" ref={popupRef}>
        <button 
          className="close-popup-btn"
          onClick={onClose}
          aria-label={tHelp('closeButton')}
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

        <div className="help-content">
          <h2>{tHelp('title')}</h2>

          <section>
            <h3>{tHelp('sections.rating.title')}</h3>
            <p>{tHelp('sections.rating.description')}</p>
            <div className="examples">
              <h4>{tHelp('sections.rating.examples.title')}</h4>
              <ul>
                <li><b><code>G12</code></b> - {tHelp('sections.rating.examples.simple')}</li>
                <li><b><code>U12~U14</code></b> - {tHelp('sections.rating.examples.range')}</li>
                <li><b><code>P12-14</code></b> - {tHelp('sections.rating.examples.shortRange')}</li>
                <li><b><code>U12~-2</code> / <code>U12--21</code></b> - {tHelp('sections.rating.examples.special')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{tHelp('sections.averaging.title')}</h3>
            <p>{tHelp('sections.averaging.description')}</p>
            <ul>
              <li>{tHelp('sections.averaging.points.special')}</li>
              <li>{tHelp('sections.averaging.points.ranges')}</li>
              <li>{tHelp('sections.averaging.points.order')}</li>
            </ul>
          </section>

          <section>
            <h3>{tHelp('sections.filters.title')}</h3>
            <ul>
              <li><strong>{tHelp('sections.filters.hideRated')}:</strong> {tHelp('sections.filters.hideRatedDesc')}</li>
              <li><strong>{tHelp('sections.filters.lowDiff')}:</strong> {tHelp('sections.filters.lowDiffDesc')}</li>
              <li><strong>{tHelp('sections.filters.fourVote')}:</strong> {tHelp('sections.filters.fourVoteDesc')}</li>
            </ul>
          </section>

          <section>
            <h3>{tHelp('sections.requirements.title')}</h3>
            <ul>
              <li>{tHelp('sections.requirements.points.comment')}</li>
              <li>{tHelp('sections.requirements.points.format')}</li>
              <li>{tHelp('sections.requirements.points.special')}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}; 
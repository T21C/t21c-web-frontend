import React, { useEffect, useRef } from 'react';
import './ratinghelppopup.css';
import { useTranslation } from 'react-i18next';
import { CommentFormatter, KeyCombo, KeyDisplay } from '@/components/misc';

export const RatingHelpPopup = ({ onClose }) => {
  const { t } = useTranslation('components');
  const tHelp = (key, options = {}) => t(`rating.helpPopup.${key}`, options) || key;
  const popupRef = useRef(null);

  useEffect(() => {
    // Store original body style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Lock scrolling
    document.body.style.overflow = 'hidden';

    // Capture and stop propagation of keyboard events
    const handleKeyEvents = (event) => {
      // Only stop propagation if the event originated within the popup
      if (popupRef.current?.contains(event.target)) {
        event.stopPropagation();
      }
    };

    // Add capture phase event listeners for all keyboard events
    document.addEventListener('keydown', handleKeyEvents, true);
    document.addEventListener('keyup', handleKeyEvents, true);
    document.addEventListener('keypress', handleKeyEvents, true);

    // Cleanup function
    return () => {
      document.body.style.overflow = originalStyle;
      document.removeEventListener('keydown', handleKeyEvents, true);
      document.removeEventListener('keyup', handleKeyEvents, true);
      document.removeEventListener('keypress', handleKeyEvents, true);
    };
  }, []); // Empty dependency array since we only want this on mount/unmount

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation(); // Prevent other listeners from handling Escape
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey, true); // Use capture phase
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey, true);
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
          
          <section>
            <h3>{tHelp('sections.extras.title')}</h3>
            <div className="features">
              {tHelp('sections.extras.features', { returnObjects: true }).map((feature, index) => (
                <div key={index} className="feature-item">
                  <h4>{feature.title}</h4>
                  <CommentFormatter prefix={"idPrefixDontChange:"}>{feature.description}</CommentFormatter>
                  {feature.example && (
                    <div className="feature-example">
                      <code>{feature.example}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3>{tHelp('sections.shortcuts.title')}</h3>
            <ul className="shortcuts">
              <li className='keycombo'>
                <KeyCombo 
                  keys={["Ctrl", "Enter"]} 
                  actualKeys={["Control", "Enter"]}
                  onComboTriggered={() => console.log("Save changes triggered")}
                />
                <span className="shortcut-description">
                  {tHelp('sections.shortcuts.points.submit')}
                </span>
              </li>
              
              <li className='keycombo'>
                <KeyCombo 
                  keys={["Esc"]} 
                  actualKeys={["Escape"]}
                  onComboTriggered={() => console.log("Close popup triggered")}
                />
                <span className="shortcut-description">
                  {tHelp('sections.shortcuts.points.close')}
                </span>
              </li>
              
              <li className='keycombo'>
                <KeyCombo 
                  keys={['Ctrl', 'Alt', 'R']} 
                  actualKeys={['Control', 'Alt', 'r']}
                  onComboTriggered={() => console.log("Reset ratings triggered")}
                />
                <span className="shortcut-description">
                  {tHelp('sections.shortcuts.points.reset')}
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}; 
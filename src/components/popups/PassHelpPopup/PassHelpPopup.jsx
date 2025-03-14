import React, { useEffect, useRef } from 'react';
import './passhelppopup.css';
import { useTranslation } from 'react-i18next';

export const PassHelpPopup = ({ onClose }) => {
  const { t } = useTranslation(['components']);
  const tHelp = (key) => t(`pass.helpPopup.${key}`) || key;
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
    <div className="pass-help-popup-overlay">
      <div className="pass-help-popup" ref={popupRef}>
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
            <h3>{tHelp('sections.search.title')}</h3>
            <p>{tHelp('sections.search.description')}</p>
            <div className="examples">
              <h4>{tHelp('sections.search.examples.title')}</h4>
              <ul>
                <li><b><code>player:Name</code></b> - {tHelp('sections.search.examples.playerField')}</li>
                <li><b><code>video:Link</code></b> - {tHelp('sections.search.examples.videoField')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{tHelp('sections.operators.title')}</h3>
            <p>{tHelp('sections.operators.description')}</p>
            <div className="examples">
              <h4>{tHelp('sections.operators.examples.title')}</h4>
              <ul>
                <li><b><code>player:Name, video:Link</code></b> - {tHelp('sections.operators.examples.and')}</li>
                <li><b><code>player=Exact | player:Partial</code></b> - {tHelp('sections.operators.examples.or')}</li>
                <li><b><code>player:Name, video:Link | player=Exact</code></b> - {tHelp('sections.operators.examples.complex')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{tHelp('sections.tips.title')}</h3>
            <ul>
              <li>{tHelp('sections.tips.points.caseSensitive')}</li>
              <li>{tHelp('sections.tips.points.partial')}</li>
              <li>{tHelp('sections.tips.points.spaces')}</li>
              <li>{tHelp('sections.tips.points.order')}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}; 
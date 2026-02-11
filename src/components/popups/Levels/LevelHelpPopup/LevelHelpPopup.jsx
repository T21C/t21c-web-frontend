import React, { useEffect, useRef } from 'react';
import './levelhelppopup.css';
import { useTranslation } from 'react-i18next';

export const LevelHelpPopup = ({ onClose }) => {
  const { t } = useTranslation(['components']);
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
    <div className="level-help-popup-overlay">
      <div className="level-help-popup" ref={popupRef}>
        <button 
          className="close-popup-btn"
          onClick={onClose}
          aria-label={t('level.helpPopup.closeButton')}
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
          <h2>{t('level.helpPopup.title')}</h2>

          <section>
            <h3>{t('level.helpPopup.sections.search.title')}</h3>
            <p>{t('level.helpPopup.sections.search.description')}</p>
            <div className="examples">
              <h4>{t('level.helpPopup.sections.search.examples.title')}</h4>
              <ul>
                <li><b><code>song:Example</code></b> - {t('level.helpPopup.sections.search.examples.songField')}</li>
                <li><b><code>artist:Artist</code></b> - {t('level.helpPopup.sections.search.examples.artistField')}</li>
                <li><b><code>charter:Charter</code></b> - {t('level.helpPopup.sections.search.examples.charterField')}</li>
                <li><b><code>vfxer:Vfxer</code></b> - {t('level.helpPopup.sections.search.examples.vfxerField')}</li>
                <li><b><code>creator:Creator</code></b> - {t('level.helpPopup.sections.search.examples.creatorField')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{t('level.helpPopup.sections.operators.title')}</h3>
            <p>{t('level.helpPopup.sections.operators.description')}</p>
            <div className="examples">
              <h4>{t('level.helpPopup.sections.operators.examples.title')}</h4>
              <ul>
                <li><b><code>song:hello, artist:camellia</code></b> - {t('level.helpPopup.sections.operators.examples.and')}</li>
                <li><b><code>song=goTe | song:xnor</code></b> - {t('level.helpPopup.sections.operators.examples.or')}</li>
                <li><b><code>charter:gazizi, song:onus | artist=ludicin</code></b> - {t('level.helpPopup.sections.operators.examples.complex')}</li>
                <li><b><code>song:onus, \!nerfed</code></b> - {t('level.helpPopup.sections.operators.examples.not')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{t('level.helpPopup.sections.tips.title')}</h3>
            <ul>
              <li>{t('level.helpPopup.sections.tips.points.caseSensitive')}</li>
              <li>{t('level.helpPopup.sections.tips.points.partial')}</li>
              <li>{t('level.helpPopup.sections.tips.points.spaces')}</li>
              <li>{t('level.helpPopup.sections.tips.points.order')}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}; 
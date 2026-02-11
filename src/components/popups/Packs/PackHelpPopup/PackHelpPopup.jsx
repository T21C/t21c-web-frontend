import React, { useEffect, useRef } from 'react';
import './packhelppopup.css';
import { useTranslation } from 'react-i18next';

/**
 * PackHelpPopup - A help popup component that displays information about pack search functionality
 * 
 * @param {Function} onClose - Callback function to close the popup
 * 
 * Usage example:
 * ```jsx
 * const [showHelpPopup, setShowHelpPopup] = useState(false);
 * 
 * return (
 *   <>
 *     <button onClick={() => setShowHelpPopup(true)}>
 *       Search Help
 *     </button>
 *     {showHelpPopup && (
 *       <PackHelpPopup onClose={() => setShowHelpPopup(false)} />
 *     )}
 *   </>
 * );
 * ```
 */
export const PackHelpPopup = ({ onClose }) => {
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
    <div className="pack-help-popup-overlay">
      <div className="pack-help-popup" ref={popupRef}>
        <button 
          className="close-popup-btn"
          onClick={onClose}
          aria-label={t('packHelpPopup.closeButton')}
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
          <h2>{t('packHelpPopup.title')}</h2>

          <section>
            <h3>{t('packHelpPopup.sections.search.title')}</h3>
            <p>{t('packHelpPopup.sections.search.description')}</p>
            <div className="examples">
              <h4>{t('packHelpPopup.sections.search.examples.title')}</h4>
              <ul>
                <li><b><code>name:My Pack</code></b> - {t('packHelpPopup.sections.search.examples.nameField')}</li>
                <li><b><code>owner:v0w4n</code></b> - {t('packHelpPopup.sections.search.examples.ownerField')}</li>
                <li><b><code>levelId:123</code></b> - {t('packHelpPopup.sections.search.examples.levelIdField')}</li>
                <li><b><code>viewMode:0</code></b> - {t('packHelpPopup.sections.search.examples.viewModeField')}</li>
                <li><b><code>pinned:true</code></b> - {t('packHelpPopup.sections.search.examples.pinnedField')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{t('packHelpPopup.sections.operators.title')}</h3>
            <p>{t('packHelpPopup.sections.operators.description')}</p>
            <div className="examples">
              <h4>{t('packHelpPopup.sections.operators.examples.title')}</h4>
              <ul>
                <li><b><code>name:my pack, owner:v0w4n</code></b> - {t('packHelpPopup.sections.operators.examples.and')}</li>
                <li><b><code>name=My Pack | name:cool pack</code></b> - {t('packHelpPopup.sections.operators.examples.or')}</li>
                <li><b><code>owner:teo_72, pinned:true | owner:v0w4n</code></b> - {t('packHelpPopup.sections.operators.examples.complex')}</li>
                <li><b><code>name:cool, \!pinned</code></b> - {t('packHelpPopup.sections.operators.examples.not')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{t('packHelpPopup.sections.viewModes.title')}</h3>
            <p>{t('packHelpPopup.sections.viewModes.description')}</p>
            <div className="examples">
              <h4>{t('packHelpPopup.sections.viewModes.examples.title')}</h4>
              <ul>
                <li><b><code>viewMode:0</code></b> - {t('packHelpPopup.sections.viewModes.examples.public')}</li>
                <li><b><code>viewMode:1</code></b> - {t('packHelpPopup.sections.viewModes.examples.linkOnly')}</li>
                <li><b><code>viewMode:2</code></b> - {t('packHelpPopup.sections.viewModes.examples.private')}</li>
                <li><b><code>viewMode:3</code></b> - {t('packHelpPopup.sections.viewModes.examples.forcedPrivate')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{t('packHelpPopup.sections.tips.title')}</h3>
            <ul>
              <li>{t('packHelpPopup.sections.tips.points.caseSensitive')}</li>
              <li>{t('packHelpPopup.sections.tips.points.partial')}</li>
              <li>{t('packHelpPopup.sections.tips.points.spaces')}</li>
              <li>{t('packHelpPopup.sections.tips.points.order')}</li>
              <li>{t('packHelpPopup.sections.tips.points.boolean')}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

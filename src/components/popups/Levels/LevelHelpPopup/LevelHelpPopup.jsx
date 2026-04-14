import React, { useEffect, useRef } from 'react';
import './levelhelppopup.css';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';

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
        <CloseButton
          variant="floating"
          onClick={onClose}
          aria-label={t('level.helpPopup.closeButton')}
        />

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
            <h3>{t('level.helpPopup.sections.numeric.title')}</h3>
            <p>{t('level.helpPopup.sections.numeric.description')}</p>
            <div className="examples">
              <h4>{t('level.helpPopup.sections.numeric.examples.title')}</h4>
              <ul>
                <li><b><code>bpm:180</code></b> — {t('level.helpPopup.sections.numeric.examples.bpmExact')}</li>
                <li><b><code>tilecount:500</code></b> — {t('level.helpPopup.sections.numeric.examples.tilesExact')}</li>
                <li><b><code>bpm:&gt;100, bpm:&lt;200</code></b> — {t('level.helpPopup.sections.numeric.examples.bpmRange')}</li>
                <li><b><code>tilecount:&gt;=1000</code></b> — {t('level.helpPopup.sections.numeric.examples.tilesMin')}</li>
                <li>{t('level.helpPopup.sections.numeric.examples.combine')}</li>
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
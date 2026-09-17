// tuf-search: #RatingHelpPopup #ratingHelpPopup #popups #rating #ratingHelp
import React, { useEffect, useRef } from 'react';
import './ratinghelppopup.css';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import { CommentFormatter, KeyCombo, KeyDisplay } from '@/components/misc';

export const RatingHelpPopup = ({ onClose }) => {
  const { t } = useTranslation('components');
  const popupRef = useRef(null);

  useEffect(() => {
    const handleKeyEvents = (event) => {
      if (popupRef.current?.contains(event.target)) {
        event.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleKeyEvents, true);
    document.addEventListener('keyup', handleKeyEvents, true);
    document.addEventListener('keypress', handleKeyEvents, true);

    return () => {
      document.removeEventListener('keydown', handleKeyEvents, true);
      document.removeEventListener('keyup', handleKeyEvents, true);
      document.removeEventListener('keypress', handleKeyEvents, true);
    };
  }, []);

  return (
    <PopupShell
      onClose={onClose}
      dismissOnEscape
      overlayClassName="rating-help-popup-overlay"
      panelClassName="rating-help-popup"
      panelProps={{ ref: popupRef }}
    >
        <CloseButton
          variant="floating"
          onClick={onClose}
          aria-label={t('rating.helpPopup.closeButton')}
        />

        <div className="help-content">
          <h2>{t('rating.helpPopup.title')}</h2>

          <section>
            <h3>{t('rating.helpPopup.sections.rating.title')}</h3>
            <p>{t('rating.helpPopup.sections.rating.description')}</p>
            <div className="examples">
              <h4>{t('rating.helpPopup.sections.rating.examples.title')}</h4>
              <ul>
                <li><b><code>G12</code></b> - {t('rating.helpPopup.sections.rating.examples.simple')}</li>
                <li><b><code>U12~U14</code></b> - {t('rating.helpPopup.sections.rating.examples.range')}</li>
                <li><b><code>P12-14</code></b> - {t('rating.helpPopup.sections.rating.examples.shortRange')}</li>
                <li><b><code>U12~-2</code> / <code>U12--21</code></b> - {t('rating.helpPopup.sections.rating.examples.special')}</li>
              </ul>
            </div>
          </section>

          <section>
            <h3>{t('rating.helpPopup.sections.averaging.title')}</h3>
            <p>{t('rating.helpPopup.sections.averaging.description')}</p>
            <ul>
              <li>{t('rating.helpPopup.sections.averaging.points.special')}</li>
              <li>{t('rating.helpPopup.sections.averaging.points.ranges')}</li>
              <li>{t('rating.helpPopup.sections.averaging.points.order')}</li>
            </ul>
          </section>

          <section>
            <h3>{t('rating.helpPopup.sections.accuracy.title')}</h3>
            <p>{t('rating.helpPopup.sections.accuracy.description')}</p>
            <ul>
              <li>{t('rating.helpPopup.sections.accuracy.points.q')}</li>
              <li>{t('rating.helpPopup.sections.accuracy.points.rank')}</li>
              <li>{t('rating.helpPopup.sections.accuracy.points.ranges')}</li>
              <li>{t('rating.helpPopup.sections.accuracy.points.freeze')}</li>
              <li>{t('rating.helpPopup.sections.accuracy.points.sort')}</li>
            </ul>
          </section>

          <section>
            <h3>{t('rating.helpPopup.sections.filters.title')}</h3>
            <ul>
              <li><strong>{t('rating.helpPopup.sections.filters.myRated')}:</strong> {t('rating.helpPopup.sections.filters.myRatedDesc')}</li>
              <li><strong>{t('rating.helpPopup.sections.filters.requestBands')}:</strong> {t('rating.helpPopup.sections.filters.requestBandsDesc')}</li>
              <li><strong>{t('rating.helpPopup.sections.filters.fourVote')}:</strong> {t('rating.helpPopup.sections.filters.fourVoteDesc')}</li>
            </ul>
          </section>

          <section>
            <h3>{t('rating.helpPopup.sections.requirements.title')}</h3>
            <ul>
              <li>{t('rating.helpPopup.sections.requirements.points.comment')}</li>
              <li>{t('rating.helpPopup.sections.requirements.points.format')}</li>
              <li>{t('rating.helpPopup.sections.requirements.points.special')}</li>
            </ul>
          </section>
          
          <section>
            <h3>{t('rating.helpPopup.sections.extras.title')}</h3>
            <div className="features">
              {t('rating.helpPopup.sections.extras.features', { returnObjects: true }).map((feature, index) => (
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
            <h3>{t('rating.helpPopup.sections.shortcuts.title')}</h3>
            <ul className="shortcuts">
              <li className='keycombo'>
                <KeyCombo 
                  keys={["Ctrl", "Enter"]} 
                  actualKeys={["Control", "Enter"]}
                />
                <span className="shortcut-description">
                  {t('rating.helpPopup.sections.shortcuts.points.submit')}
                </span>
              </li>
              
              <li className='keycombo'>
                <KeyCombo 
                  keys={["Esc"]} 
                  actualKeys={["Escape"]}
                />
                <span className="shortcut-description">
                  {t('rating.helpPopup.sections.shortcuts.points.close')}
                </span>
              </li>
              
              <li className='keycombo'>
                <KeyCombo 
                  keys={['Ctrl', 'Alt', 'F']} 
                  actualKeys={['Control', 'Alt', 'f']}
                />
                <span className="shortcut-description">
                  {t('rating.helpPopup.sections.shortcuts.points.reset')}
                </span>
              </li>
            </ul>
          </section>
        </div>
    </PopupShell>
  );
}; 
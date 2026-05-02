import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './levelhelppopup.css';
import { Trans, useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';

export const LevelHelpPopup = ({ onClose }) => {
  const { t } = useTranslation(['components']);
  const popupRef = useRef(null);
  const baseId = useId().replace(/:/g, '');
  const [openSection, setOpenSection] = useState('basics');

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

  const sections = useMemo(
    () => [
      {
        id: 'basics',
        titleKey: 'level.helpPopup.v2.groups.basics.title',
        introKey: 'level.helpPopup.v2.groups.basics.intro',
        fields: [
          { token: ':', titleKey: 'level.helpPopup.v2.fields.operatorColon.title', descKey: 'level.helpPopup.v2.fields.operatorColon.desc' },
          { token: '=', titleKey: 'level.helpPopup.v2.fields.operatorEquals.title', descKey: 'level.helpPopup.v2.fields.operatorEquals.desc' },
          { token: ',', titleKey: 'level.helpPopup.v2.fields.operatorComma.title', descKey: 'level.helpPopup.v2.fields.operatorComma.desc' },
          { token: '|', titleKey: 'level.helpPopup.v2.fields.operatorPipe.title', descKey: 'level.helpPopup.v2.fields.operatorPipe.desc' },
          { token: '\\!', titleKey: 'level.helpPopup.v2.fields.operatorNot.title', descKey: 'level.helpPopup.v2.fields.operatorNot.desc' },
        ],
        examples: [
          'level.helpPopup.v2.groups.basics.examples.and',
          'level.helpPopup.v2.groups.basics.examples.or',
          'level.helpPopup.v2.groups.basics.examples.not',
        ],
      },
      {
        id: 'text',
        titleKey: 'level.helpPopup.v2.groups.text.title',
        introKey: 'level.helpPopup.v2.groups.text.intro',
        fields: [
          { token: 'song', titleKey: 'level.helpPopup.v2.fields.song.title', descKey: 'level.helpPopup.v2.fields.song.desc' },
          { token: 'artist', titleKey: 'level.helpPopup.v2.fields.artist.title', descKey: 'level.helpPopup.v2.fields.artist.desc' },
          { token: 'creator', titleKey: 'level.helpPopup.v2.fields.creator.title', descKey: 'level.helpPopup.v2.fields.creator.desc' },
          { token: 'charter', titleKey: 'level.helpPopup.v2.fields.charter.title', descKey: 'level.helpPopup.v2.fields.charter.desc' },
          { token: 'vfxer', titleKey: 'level.helpPopup.v2.fields.vfxer.title', descKey: 'level.helpPopup.v2.fields.vfxer.desc' },
          { token: 'team', titleKey: 'level.helpPopup.v2.fields.team.title', descKey: 'level.helpPopup.v2.fields.team.desc' },
        ],
        examples: [
          'level.helpPopup.v2.groups.text.examples.partialVsExact',
          'level.helpPopup.v2.groups.text.examples.multiWord',
          'level.helpPopup.v2.groups.text.examples.mixTextAndNumeric',
        ],
      },
      {
        id: 'numeric',
        titleKey: 'level.helpPopup.v2.groups.numeric.title',
        introKey: 'level.helpPopup.v2.groups.numeric.intro',
        fields: [
          { token: 'bpm', titleKey: 'level.helpPopup.v2.fields.bpm.title', descKey: 'level.helpPopup.v2.fields.bpm.desc' },
          { token: 'tilecount', titleKey: 'level.helpPopup.v2.fields.tilecount.title', descKey: 'level.helpPopup.v2.fields.tilecount.desc' },
          { token: 'time', titleKey: 'level.helpPopup.v2.fields.time.title', descKey: 'level.helpPopup.v2.fields.time.desc' },
        ],
        examples: [
          'level.helpPopup.v2.groups.numeric.examples.bpmRange',
          'level.helpPopup.v2.groups.numeric.examples.tilesMin',
          'level.helpPopup.v2.groups.numeric.examples.timeUnits',
          'level.helpPopup.v2.groups.numeric.examples.timeMsPlain',
        ],
      },
      {
        id: 'idsAndLinks',
        titleKey: 'level.helpPopup.v2.groups.idsAndLinks.title',
        introKey: 'level.helpPopup.v2.groups.idsAndLinks.intro',
        fields: [
          { token: 'id', titleKey: 'level.helpPopup.v2.fields.id.title', descKey: 'level.helpPopup.v2.fields.id.desc' },
          { token: '#', titleKey: 'level.helpPopup.v2.fields.hashtag.title', descKey: 'level.helpPopup.v2.fields.hashtag.desc' },
          { token: 'dlLink', titleKey: 'level.helpPopup.v2.fields.dlLink.title', descKey: 'level.helpPopup.v2.fields.dlLink.desc' },
          { token: 'workshopLink', titleKey: 'level.helpPopup.v2.fields.workshopLink.title', descKey: 'level.helpPopup.v2.fields.workshopLink.desc' },
          { token: 'legacyDllink', titleKey: 'level.helpPopup.v2.fields.legacyDllink.title', descKey: 'level.helpPopup.v2.fields.legacyDllink.desc' },
          { token: 'videolink', titleKey: 'level.helpPopup.v2.fields.videolink.title', descKey: 'level.helpPopup.v2.fields.videolink.desc' },
        ],
        examples: [
          'level.helpPopup.v2.groups.idsAndLinks.examples.idExact',
          'level.helpPopup.v2.groups.idsAndLinks.examples.linkMatch',
        ],
      },
      {
        id: 'tips',
        titleKey: 'level.helpPopup.v2.groups.tips.title',
        introKey: 'level.helpPopup.v2.groups.tips.intro',
        bullets: [
          'level.helpPopup.v2.groups.tips.bullets.caseInsensitive',
          'level.helpPopup.v2.groups.tips.bullets.spacesAllowed',
          'level.helpPopup.v2.groups.tips.bullets.orderDoesNotMatter',
          'level.helpPopup.v2.groups.tips.bullets.aliasesMayMatch',
          'level.helpPopup.v2.groups.tips.bullets.groupingMentalModel',
        ],
      },
    ],
    []
  );

  const toggle = (id) => {
    setOpenSection((cur) => (cur === id ? '' : id));
  };

  return (
    <div className="level-help-popup-overlay">
      <div className="level-help-popup" ref={popupRef}>
        <CloseButton
          variant="floating"
          onClick={onClose}
          aria-label={t('level.helpPopup.closeButton')}
        />

        <div className="level-help-popup__content">
          <h2 className="level-help-popup__title">{t('level.helpPopup.title')}</h2>
          <p className="level-help-popup__subtitle">{t('level.helpPopup.v2.subtitle')}</p>

          <div className="level-help-popup__accordion">
            {sections.map((sec) => {
              const isOpen = openSection === sec.id;
              const panelId = `level-help-${baseId}-${sec.id}`;
              const buttonId = `level-help-${baseId}-${sec.id}-btn`;

              return (
                <div key={sec.id} className={`level-help-popup__section ${isOpen ? 'is-open' : ''}`}>
                  <button
                    id={buttonId}
                    type="button"
                    className="level-help-popup__section-header"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggle(sec.id)}
                  >
                    <span className="level-help-popup__section-title">{t(sec.titleKey)}</span>
                    <span className="level-help-popup__chevron" aria-hidden>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </button>

                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={`level-help-popup__section-panel ${isOpen ? 'open' : ''}`}
                  >
                    {sec.introKey && <p className="level-help-popup__intro">{t(sec.introKey)}</p>}

                    {sec.fields && (
                      <div className="level-help-popup__field-list">
                        {sec.fields.map((f) => (
                          <div key={`${sec.id}-${f.token}`} className="level-help-popup__field-row">
                            <span className="level-help-popup__token">
                              <code>{f.token}</code>
                            </span>
                            <div className="level-help-popup__field-body">
                              <div className="level-help-popup__field-title">{t(f.titleKey)}</div>
                              <div className="level-help-popup__field-desc">
                                <Trans
                                  ns="components"
                                  i18nKey={f.descKey}
                                  components={{ code: <code />, b: <b />, br: <br /> }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {sec.examples && (
                      <div className="level-help-popup__examples">
                        <div className="level-help-popup__examples-title">
                          {t('level.helpPopup.v2.examplesTitle')}
                        </div>
                        <ul className="level-help-popup__examples-list">
                          {sec.examples.map((key) => (
                            <li key={key}>
                              <Trans
                                ns="components"
                                i18nKey={key}
                                components={{ code: <code />, b: <b />, br: <br /> }}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {sec.bullets && (
                      <ul className="level-help-popup__bullets">
                        {sec.bullets.map((key) => (
                          <li key={key}>
                            <Trans
                              ns="components"
                              i18nKey={key}
                              components={{ code: <code />, b: <b />, br: <br /> }}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
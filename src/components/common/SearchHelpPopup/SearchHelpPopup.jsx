// tuf-search: #SearchHelpPopup #searchHelpPopup #common
import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './searchhelppopup.css';
import { Trans, useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/common/Collapsible';
import { SearchHelpCode } from './searchHelpTransUtils.jsx';

const TRANS_COMPONENTS = { code: <SearchHelpCode />, b: <b />, br: <br /> };

function SearchHelpSectionBody({
  section,
  translationNs,
  examplesTitleKey,
  t,
}) {
  const sec = section;

  return (
    <div className="search-help-popup__section-panel">
      {sec.introKey && (
        <p className="search-help-popup__intro">{t(sec.introKey)}</p>
      )}

      {sec.htmlKey && (
        <div className="search-help-popup__html">
          <Trans
            ns={translationNs}
            i18nKey={sec.htmlKey}
            components={TRANS_COMPONENTS}
          />
        </div>
      )}

      {sec.content}

      {sec.fields && (
        <div className="search-help-popup__field-list">
          {sec.fields.map((f) => (
            <div
              key={`${sec.id}-${f.token}`}
              className="search-help-popup__field-row"
            >
              <span className="search-help-popup__token">
                <code>{f.token}</code>
              </span>
              <div className="search-help-popup__field-body">
                <div className="search-help-popup__field-title">{t(f.titleKey)}</div>
                <div className="search-help-popup__field-desc">
                  <Trans
                    ns={translationNs}
                    i18nKey={f.descKey}
                    components={TRANS_COMPONENTS}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {sec.examples && examplesTitleKey && (
        <div className="search-help-popup__examples">
          <div className="search-help-popup__examples-title">
            {t(examplesTitleKey)}
          </div>
          <ul className="search-help-popup__examples-list">
            {sec.examples.map((key) => (
              <li key={key}>
                <Trans
                  ns={translationNs}
                  i18nKey={key}
                  components={TRANS_COMPONENTS}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {sec.bullets && (
        <ul className="search-help-popup__bullets">
          {sec.bullets.map((key) => (
            <li key={key}>
              <Trans
                ns={translationNs}
                i18nKey={key}
                components={TRANS_COMPONENTS}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const SearchHelpPopup = ({
  onClose,
  titleKey,
  subtitleKey,
  closeButtonKey,
  examplesTitleKey,
  sections,
  defaultOpenSection = '',
  translationNs = 'components',
}) => {
  const { t } = useTranslation([translationNs]);
  const popupRef = useRef(null);
  const [openSection, setOpenSection] = useState(defaultOpenSection);

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
    <div className="search-help-popup-overlay">
      <div className="search-help-popup" ref={popupRef}>
        <CloseButton
          variant="floating"
          onClick={onClose}
          aria-label={t(closeButtonKey)}
        />

        <div className="search-help-popup__content">
          <h2 className="search-help-popup__title">{t(titleKey)}</h2>
          {subtitleKey && (
            <p className="search-help-popup__subtitle">{t(subtitleKey)}</p>
          )}

          <div className="search-help-popup__accordion">
            {sections.map((sec) => {
              const isOpen = openSection === sec.id;

              return (
                <div
                  key={sec.id}
                  className={`search-help-popup__section ${isOpen ? 'is-open' : ''}`}
                >
                  <Collapsible
                    open={isOpen}
                    onOpenChange={(open) => {
                      if (open) setOpenSection(sec.id);
                      else if (openSection === sec.id) setOpenSection('');
                    }}
                    fade={false}
                    duration="0.4s"
                    className="search-help-popup__collapsible"
                  >
                    <CollapsibleTrigger
                      preset="chevron"
                      className="search-help-popup__section-header"
                    >
                      <span className="search-help-popup__section-title">
                        {t(sec.titleKey)}
                      </span>
                    </CollapsibleTrigger>

                    <CollapsibleContent
                      className="search-help-popup__section-region"
                      clipClassName="search-help-popup__section-clip"
                    >
                      <SearchHelpSectionBody
                        section={sec}
                        translationNs={translationNs}
                        examplesTitleKey={examplesTitleKey}
                        t={t}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

SearchHelpPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
  titleKey: PropTypes.string.isRequired,
  subtitleKey: PropTypes.string,
  closeButtonKey: PropTypes.string.isRequired,
  examplesTitleKey: PropTypes.string,
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      titleKey: PropTypes.string.isRequired,
      introKey: PropTypes.string,
      fields: PropTypes.arrayOf(
        PropTypes.shape({
          token: PropTypes.string.isRequired,
          titleKey: PropTypes.string.isRequired,
          descKey: PropTypes.string.isRequired,
        }),
      ),
      examples: PropTypes.arrayOf(PropTypes.string),
      bullets: PropTypes.arrayOf(PropTypes.string),
      content: PropTypes.node,
      htmlKey: PropTypes.string,
    }),
  ).isRequired,
  defaultOpenSection: PropTypes.string,
  translationNs: PropTypes.string,
};

export default SearchHelpPopup;

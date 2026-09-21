// tuf-search: #ReferencesButton #referencesButton #buttons
import React, { useState } from 'react';
import './referencesbutton.css';
import { ReferencesPopup } from '@/components/popups/Difficulties';
import { Portal } from '@/components/common/Portal';
import { getFloatChromeRoot } from '@/utils/portalRoot';
import { useTranslation } from 'react-i18next';

/** RatingPage stays mounted on `/rating` and `/rating/:id`; do not hide the FAB. */
function hideReferencesButtonOnNavigate(pathname, mountPathname) {
  const isRatingPagePath = (path) => path === '/rating' || /^\/rating\/\d+$/.test(path);
  if (isRatingPagePath(mountPathname) && isRatingPagePath(pathname)) {
    return false;
  }
  return pathname !== mountPathname;
}

const ReferencesButton = ({ onClick, ...props }) => {
  const [showPopup, setShowPopup] = useState(false);
  const { t } = useTranslation('components');
  const chromeRoot = typeof document !== 'undefined' ? getFloatChromeRoot() : null;

  return (
    <>
      <Portal root={chromeRoot} hideOnNavigate={hideReferencesButtonOnNavigate}>
      <button
        className="references-button visible"
        aria-label={t('references.button.label')}
        {...props}
        onClick={(event) => {
          setShowPopup(true);
          onClick?.(event);
        }}
      >
        <span className="button-content">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="#ffffff" >
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <g id="SVGRepo_iconCarrier">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.105 4.561l-3.43 3.427-1.134-1.12 2.07-2.08h-4.8a2.4 2.4 0 1 0 0 4.8h.89v1.6h-.88a4 4 0 0 1 0-7.991h4.8L6.54 1.13 7.675 0l3.43 3.432v1.13zM16.62 24h-9.6l-.8-.8V10.412l.8-.8h9.6l.8.8V23.2l-.8.8zm-8.8-1.6h8V11.212h-8V22.4zm5.6-20.798h9.6l.8.8v12.786l-.8.8h-4v-1.6h3.2V3.2h-8v4.787h-1.6V2.401l.8-.8zm.8 11.186h-4.8v1.6h4.8v-1.6zm-4.8 3.2h4.8v1.6h-4.8v-1.6zm4.8 3.2h-4.8v1.6h4.8v-1.6zm1.6-14.4h4.8v1.6h-4.8v-1.6zm4.8 6.4h-1.6v1.6h1.6v-1.6zm-3.338-3.176v-.024h3.338v1.6h-1.762l-1.576-1.576z"></path>
            </g>
          </svg>
          <span className="button-text">{t('references.button.text')}</span>
        </span>
      </button>
      </Portal>
      {showPopup && <ReferencesPopup onClose={() => setShowPopup(false)} />}
    </>
  );
};

export default ReferencesButton;

// tuf-search: #PackAddLevelsConfirmPopup #packAddLevelsConfirmPopup #popups #packs
import React, { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CloseButton } from '@/components/common/buttons';
import './PackAddLevelsConfirmPopup.css';

const REASON_ORDER = ['not_found', 'already_in_pack', 'quota_exceeded'];

const PackAddLevelsConfirmPopup = ({
  isOpen,
  invalid = [],
  validCount = 0,
  onConfirm,
  onCancel,
  submitting = false,
  allInvalid = false,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const popupRef = useRef(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && !submitting) {
        onCancel?.();
      }
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && !submitting) {
        onCancel?.();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel, submitting]);

  const groupedInvalid = useMemo(() => {
    const groups = new Map();
    for (const entry of invalid) {
      const list = groups.get(entry.reason) ?? [];
      list.push(entry.levelId);
      groups.set(entry.reason, list);
    }
    return REASON_ORDER.filter((reason) => groups.has(reason)).map((reason) => ({
      reason,
      levelIds: groups.get(reason),
    }));
  }, [invalid]);

  if (!isOpen) {
    return null;
  }

  const reasonLabel = (reason) => {
    switch (reason) {
      case 'not_found':
        return t('packPopups.addLevelsConfirm.reasons.notFound');
      case 'already_in_pack':
        return t('packPopups.addLevelsConfirm.reasons.alreadyInPack');
      case 'quota_exceeded':
        return t('packPopups.addLevelsConfirm.reasons.quotaExceeded');
      default:
        return reason;
    }
  };

  return (
    <div className="pack-add-levels-confirm-popup__overlay">
      <div className="pack-add-levels-confirm-popup" ref={popupRef}>
        <CloseButton
          variant="floating"
          className="pack-add-levels-confirm-popup__close-btn"
          onClick={onCancel}
          disabled={submitting}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="pack-add-levels-confirm-popup__content">
          <h2 className="pack-add-levels-confirm-popup__title">
            {allInvalid
              ? t('packPopups.addLevelsConfirm.titleAllInvalid')
              : t('packPopups.addLevelsConfirm.title')}
          </h2>

          <p className="pack-add-levels-confirm-popup__message">
            {allInvalid
              ? t('packPopups.addLevelsConfirm.messageAllInvalid')
              : t('packPopups.addLevelsConfirm.message', { validCount })}
          </p>

          <div className="pack-add-levels-confirm-popup__invalid-section">
            <span className="pack-add-levels-confirm-popup__label">
              {t('packPopups.addLevelsConfirm.invalidHeading', { count: invalid.length })}
            </span>
            <div className="pack-add-levels-confirm-popup__invalid-list">
              {groupedInvalid.map(({ reason, levelIds }) => (
                <div key={reason} className="pack-add-levels-confirm-popup__invalid-group">
                  <span className="pack-add-levels-confirm-popup__invalid-reason">
                    {reasonLabel(reason)}
                  </span>
                  <span className="pack-add-levels-confirm-popup__invalid-ids">
                    {levelIds.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pack-add-levels-confirm-popup__actions">
            <button
              type="button"
              className="pack-add-levels-confirm-popup__secondary-btn"
              onClick={onCancel}
              disabled={submitting}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            {!allInvalid && (
              <button
                type="button"
                className="pack-add-levels-confirm-popup__primary-btn"
                onClick={onConfirm}
                disabled={validCount === 0 || submitting}
              >
                {submitting
                  ? t('packPopups.addLevelsConfirm.submitting')
                  : t('packPopups.addLevelsConfirm.proceed', { count: validCount })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackAddLevelsConfirmPopup;

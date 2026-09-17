// tuf-search: #BulkCreateCurationsConfirmPopup #bulkCreateCurationsConfirmPopup #popups #curations
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PopupShell } from '@/components/common/PopupShell';
import { CloseButton } from '@/components/common/buttons';
import './BulkCreateCurationsConfirmPopup.css';

const REASON_ORDER = ['not_found', 'cannot_manage'];

const BulkCreateCurationsConfirmPopup = ({
  isOpen,
  invalid = [],
  validCount = 0,
  onConfirm,
  onCancel,
  submitting = false,
  allInvalid = false,
}) => {
  const { t } = useTranslation(['components', 'common']);

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
        return t('bulkCreateCurationsConfirmPopup.reasons.notFound');
      case 'cannot_manage':
        return t('bulkCreateCurationsConfirmPopup.reasons.cannotManage');
      default:
        return reason;
    }
  };

  return (
    <PopupShell
      onClose={onCancel}
      closeDisabled={submitting}
      overlayClassName="bulk-create-curations-confirm-popup__overlay"
      panelClassName="bulk-create-curations-confirm-popup"
    >
        <CloseButton
          variant="floating"
          className="bulk-create-curations-confirm-popup__close-btn"
          onClick={onCancel}
          disabled={submitting}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="bulk-create-curations-confirm-popup__content">
          <h2 className="bulk-create-curations-confirm-popup__title">
            {allInvalid
              ? t('bulkCreateCurationsConfirmPopup.titleAllInvalid')
              : t('bulkCreateCurationsConfirmPopup.title')}
          </h2>

          <p className="bulk-create-curations-confirm-popup__message">
            {allInvalid
              ? t('bulkCreateCurationsConfirmPopup.messageAllInvalid')
              : t('bulkCreateCurationsConfirmPopup.message', { validCount })}
          </p>

          <div className="bulk-create-curations-confirm-popup__invalid-section">
            <span className="bulk-create-curations-confirm-popup__label">
              {t('bulkCreateCurationsConfirmPopup.invalidHeading', { count: invalid.length })}
            </span>
            <div className="bulk-create-curations-confirm-popup__invalid-list">
              {groupedInvalid.map(({ reason, levelIds }) => (
                <div key={reason} className="bulk-create-curations-confirm-popup__invalid-group">
                  <span className="bulk-create-curations-confirm-popup__invalid-reason">
                    {reasonLabel(reason)}
                  </span>
                  <span className="bulk-create-curations-confirm-popup__invalid-ids">
                    {levelIds.join(', ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bulk-create-curations-confirm-popup__actions">
            <button
              type="button"
              className="bulk-create-curations-confirm-popup__secondary-btn"
              onClick={onCancel}
              disabled={submitting}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            {!allInvalid && (
              <button
                type="button"
                className="bulk-create-curations-confirm-popup__primary-btn"
                onClick={onConfirm}
                disabled={validCount === 0 || submitting}
              >
                {submitting
                  ? t('bulkCreateCurationsConfirmPopup.submitting')
                  : t('bulkCreateCurationsConfirmPopup.proceed', { count: validCount })}
              </button>
            )}
          </div>
        </div>
    </PopupShell>
  );
};

export default BulkCreateCurationsConfirmPopup;

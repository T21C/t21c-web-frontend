// tuf-search: #BulkCreateCurationsPopup #bulkCreateCurationsPopup #popups #curations
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CloseButton } from '@/components/common/buttons';
import { ItemPickManager } from '@/components/common/selectors';
import { parseLevelIdsInput } from '@/utils/packTreePlacement';
import { canAssignCurationType } from '@/utils/curationTypeUtils';
import { collapseCurationTypeIdsByFamilyTier } from '@/utils/curationTypeFamilies';
import { hasAnyFlag, permissionFlags } from '@/utils/UserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import './BulkCreateCurationsPopup.css';

const BulkCreateCurationsPopup = ({
  isOpen,
  onClose,
  curationTypes = [],
  onSubmit,
  submitting = false,
  /** When true (e.g. confirm overlay open), do not dismiss via Escape / outside click */
  suppressDismiss = false,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const { user } = useAuth();
  const popupRef = useRef(null);
  const [levelIdsInput, setLevelIdsInput] = useState('');
  const [typeIds, setTypeIds] = useState([]);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    setLevelIdsInput('');
    setTypeIds([]);
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const dismissBlocked = submitting || suppressDismiss;

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && !dismissBlocked) {
        onClose?.();
      }
    };

    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target) && !dismissBlocked) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, submitting, suppressDismiss]);

  const isElevatedCurationUser =
    user && hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR]);

  const curationTypePoolFilter = useCallback(
    (type) =>
      !user ||
      isElevatedCurationUser ||
      canAssignCurationType(user.permissionFlags, type.abilities),
    [user, isElevatedCurationUser]
  );

  const curationPickLabels = useMemo(
    () => ({
      sectionCurrent: t('bulkCreateCurationsPopup.typesCurrent'),
      sectionAdd: t('bulkCreateCurationsPopup.typesAdd'),
      searchPlaceholder: t('bulkCreateCurationsPopup.typesSearchPlaceholder'),
      emptySelected: t('bulkCreateCurationsPopup.typesNoneSelected'),
      emptyPool: t('bulkCreateCurationsPopup.typesNoneAvailable'),
      noResults: t('bulkCreateCurationsPopup.typesNoResults'),
      removeItem: t('bulkCreateCurationsPopup.removeType'),
      addItem: t('bulkCreateCurationsPopup.addType'),
    }),
    [t]
  );

  const parsedLevelIds = useMemo(() => parseLevelIdsInput(levelIdsInput), [levelIdsInput]);
  const canSubmit =
    parsedLevelIds.length > 0 && typeIds.length > 0 && !submitting;

  const handleTypeIdsChange = useCallback(
    (ids) => {
      setTypeIds(collapseCurationTypeIdsByFamilyTier(ids, curationTypes));
    },
    [curationTypes]
  );

  const handleSubmit = () => {
    if (!canSubmit || !onSubmit) return;
    onSubmit({ levelIds: parsedLevelIds, typeIds });
  };

  if (!isOpen) return null;

  return (
    <div className="bulk-create-curations-popup__overlay">
      <div className="bulk-create-curations-popup" ref={popupRef}>
        <CloseButton
          variant="floating"
          className="bulk-create-curations-popup__close-btn"
          onClick={onClose}
          disabled={submitting || suppressDismiss}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="bulk-create-curations-popup__content">
          <h2 className="bulk-create-curations-popup__title">
            {t('bulkCreateCurationsPopup.title')}
          </h2>

          <label className="bulk-create-curations-popup__field">
            <span className="bulk-create-curations-popup__label">
              {t('bulkCreateCurationsPopup.levelIds')}
            </span>
            <input
              type="text"
              className="bulk-create-curations-popup__input"
              value={levelIdsInput}
              onChange={(e) => setLevelIdsInput(e.target.value)}
              placeholder={t('bulkCreateCurationsPopup.levelIdsPlaceholder')}
              autoFocus
              disabled={submitting}
            />
            <span className="bulk-create-curations-popup__hint">
              {t('bulkCreateCurationsPopup.levelIdsParsed', { count: parsedLevelIds.length })}
            </span>
          </label>

          <div className="bulk-create-curations-popup__field">
            <span className="bulk-create-curations-popup__label">
              {t('bulkCreateCurationsPopup.types')}
            </span>
            <ItemPickManager
              className="bulk-create-curations-popup__item-pick"
              items={curationTypes}
              selectedIds={typeIds}
              onSelectedIdsChange={handleTypeIdsChange}
              poolFilter={curationTypePoolFilter}
              enableGrouping
              fallbackGroupLabel={t('facetQueryBuilder.fallbackGroup')}
              labels={curationPickLabels}
              resetSearchSignal={isOpen}
            />
          </div>

          <div className="bulk-create-curations-popup__actions">
            <button
              type="button"
              className="bulk-create-curations-popup__secondary-btn"
              onClick={onClose}
              disabled={submitting || suppressDismiss}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="button"
              className="bulk-create-curations-popup__primary-btn"
              onClick={handleSubmit}
              disabled={!canSubmit || suppressDismiss}
            >
              {submitting
                ? t('bulkCreateCurationsPopup.submitting')
                : t('bulkCreateCurationsPopup.submit', { count: parsedLevelIds.length })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkCreateCurationsPopup;

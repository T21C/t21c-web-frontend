import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '@/utils/api';
import './curationeditpopup.css';
import toast from 'react-hot-toast';
import ThumbnailUpload from '@/components/common/upload/ThumbnailUpload';
import { hasAbility, canAssignCurationType } from '@/utils/curationTypeUtils';
import { hasAnyFlag, permissionFlags } from '@/utils/UserPermissions';
import { useAuth } from '@/contexts/AuthContext';
import { formatCreatorDisplay } from '@/utils/Utility';
import { ItemPickManager } from '@/components/common/selectors';
import { CloseButton } from '@/components/common/buttons';
import { useDifficultyContext } from '@/contexts/DifficultyContext';

const ABILITY_CUSTOM_CSS = 1n << 0n;
const ABILITY_FORCE_DESCRIPTION = 1n << 11n;
const ABILITY_ALLOW_DESCRIPTION = 1n << 12n;
const ABILITY_CUSTOM_COLOR_THEME = 1n << 14n;

function stateFromCuration(curation) {
  const types = curation?.types || [];
  return {
    id: curation?.id,
    shortDescription: curation?.shortDescription || '',
    description: curation?.description || '',
    customCSS: curation?.customCSS || '',
    customColor: curation?.customColor || '#ffffff',
    previewLink: curation?.previewLink || null,
    typeIds: types.map((t) => t.id),
  };
}

function emptyFormState() {
  return {
    id: undefined,
    shortDescription: '',
    description: '',
    customCSS: '',
    customColor: '#ffffff',
    previewLink: null,
    typeIds: [],
  };
}

const CurationEditPopup = ({
  isOpen,
  onClose,
  levelId,
  level: levelProp,
  curationTypes,
  onUpdate,
  onCurationPatched,
}) => {
  const { t } = useTranslation(['components', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { difficultyDict } = useDifficultyContext();

  const [form, setForm] = useState(emptyFormState);
  const [level, setLevel] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mouseDownOutside, setMouseDownOutside] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  /** Types from last GET curations response — used when an id is not yet in `curationTypes` (stale catalog) */
  const [typesFromApi, setTypesFromApi] = useState([]);
  const modalRef = useRef(null);

  const selectedTypes = useMemo(() => {
    const catalog = curationTypes || [];
    const byCatalogId = new Map(catalog.map((t) => [t.id, t]));
    const byApiId = new Map((typesFromApi || []).map((t) => [t.id, t]));
    return form.typeIds
      .map((id) => byCatalogId.get(id) || byApiId.get(id))
      .filter(Boolean);
  }, [form.typeIds, curationTypes, typesFromApi]);

  const isElevatedCurationUser = user && hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR]);

  const canManageThisCuration = useMemo(() => {
    if (!user) return true;
    if (isElevatedCurationUser) return true;
    if (selectedTypes.length === 0) return true;
    return selectedTypes.every((t) => canAssignCurationType(user.permissionFlags, t.abilities));
  }, [selectedTypes, user, isElevatedCurationUser]);

  /** Add-pool: show every type this user may assign; do not hide the pool when tier gating blocks editing */
  const curationTypePoolFilter = useCallback(
    (type) =>
      !user ||
      isElevatedCurationUser ||
      canAssignCurationType(user.permissionFlags, type.abilities),
    [user, isElevatedCurationUser]
  );

  const curationPickLabels = useMemo(
    () => ({
      sectionCurrent: t('curationEditPopup.form.typesCurrent'),
      sectionAdd: t('curationEditPopup.form.typesAdd'),
      searchPlaceholder: t('curationEditPopup.form.typesSearchPlaceholder'),
      emptySelected: t('curationEditPopup.form.typesNoneSelected'),
      emptyPool: t('curationEditPopup.form.typesNoneAvailable'),
      noResults: t('curationEditPopup.form.typesNoResults'),
      removeItem: t('curationEditPopup.form.removeType'),
      addItem: t('curationEditPopup.form.addType'),
    }),
    [t]
  );

  /** Visual capabilities (OR): any selected type can unlock CSS/color/description for display. */
  const canEditCustomCSS =
    isElevatedCurationUser ||
    (selectedTypes.length > 0 && selectedTypes.some((t) => hasAbility(t, ABILITY_CUSTOM_CSS)));
  const canEditCustomColor =
    isElevatedCurationUser ||
    (selectedTypes.length > 0 && selectedTypes.some((t) => hasAbility(t, ABILITY_CUSTOM_COLOR_THEME)));
  const canEditDescription =
    isElevatedCurationUser ||
    (selectedTypes.length > 0 &&
      selectedTypes.some(
        (t) => hasAbility(t, ABILITY_ALLOW_DESCRIPTION) || hasAbility(t, ABILITY_FORCE_DESCRIPTION)
      ));
  const canUseCustomCSS = canEditCustomCSS;
  const canUseCustomColor = canEditCustomColor;

  const loadForm = useCallback(async () => {
    if (!levelId) return;
    setIsLoading(true);
    try {
      const res = await api.get(`${import.meta.env.VITE_CURATIONS}`, {
        params: { levelId, limit: 200 },
      });
      const list = res.data.curations || [];
      const first = list[0];
      setTypesFromApi(first?.types || []);
      setForm(first ? stateFromCuration(first) : emptyFormState());
      if (first?.level) setLevel(first.level);
      else if (levelProp) setLevel(levelProp);
    } catch (e) {
      console.error(e);
      toast.error(t('curationEditPopup.errors.loadFailed'));
      setTypesFromApi([]);
      setForm(emptyFormState());
    } finally {
      setIsLoading(false);
    }
  }, [levelId, levelProp, t]);

  useEffect(() => {
    if (!isOpen || !levelId) return;
    setLevel(levelProp || null);
    loadForm();
  }, [isOpen, levelId, levelProp, loadForm]);

  useEffect(() => {
    if (location.state?.customCSS !== undefined && previewPending) {
      setForm((prev) => ({ ...prev, customCSS: location.state.customCSS }));
      setPreviewPending(false);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname, previewPending]);

  const handleMouseDown = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      setMouseDownOutside(true);
    }
  };

  const handleMouseUp = (e) => {
    if (mouseDownOutside && modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
    setMouseDownOutside(false);
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, mouseDownOutside]);

  const validate = () => {
    for (const tid of form.typeIds) {
      const type = selectedTypes.find((x) => x.id === tid);
      if (!type) continue;
      if (hasAbility(type, ABILITY_FORCE_DESCRIPTION)) {
        const hasAnyText =
          String(form.shortDescription ?? '').trim() || String(form.description ?? '').trim();
        if (!hasAnyText) {
          toast.error(t('curationEditPopup.form.descriptionRequiredType', { name: type.name }));
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!levelId || !validate()) return;
    if (!canManageThisCuration) {
      toast.error(t('curationEditPopup.errors.cannotManageCuration'));
      return;
    }

    try {
      setIsSaving(true);
      // Omit visual fields the user cannot edit so the API does not treat them as an attempted update (avoids 403 on empty defaults).
      const body = {
        typeIds: form.typeIds,
      };
      if (canEditDescription) {
        body.shortDescription = form.shortDescription;
        body.description = form.description;
      }
      if (canEditCustomCSS) {
        body.customCSS = form.customCSS;
      }
      if (canEditCustomColor) {
        body.customColor = form.customColor;
      }
      const res = await api.put(`${import.meta.env.VITE_CURATIONS}/level/${levelId}`, body);
      toast.success(t('curationEditPopup.notifications.updated'));
      onUpdate({ levelId, curations: res.data.curations, level: res.data.curations[0]?.level });
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.error || t('curationEditPopup.errors.updateFailed')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const displayLevel = level || levelProp;

  if (!isOpen || !levelId) return null;

  return (
    <div className="curation-edit-modal">
      <div className="curation-edit-modal__content" ref={modalRef}>
        <CloseButton
          variant="floating"
          type="button"
          className="curation-edit-modal__close-button"
          onClick={onClose}
          aria-label={t('buttons.close', { ns: 'common' })}
        />

        <div className="curation-edit-modal__header">
          <h2>{t('curationEditPopup.title')}</h2>
          <p>{t('curationEditPopup.descriptionLevel')}</p>
        </div>

        <div className="curation-edit-modal__content-scroll">
          {displayLevel && (
            <div className="curation-edit-modal__level-info">
              <div className="curation-edit-modal__level-card">
                <div className="curation-edit-modal__level-header">
                  <img
                    src={difficultyDict[displayLevel.diffId]?.icon || '/default-difficulty-icon.png'}
                    alt=""
                    className="curation-edit-modal__difficulty-icon"
                  />
                  <div className="curation-edit-modal__level-details">
                    <h3>{displayLevel.song || 'Unknown Level'}</h3>
                    <p className="curation-edit-modal__level-artist">
                      {displayLevel.artist || 'Unknown Artist'}
                    </p>
                    <p className="curation-edit-modal__level-creator">
                      {formatCreatorDisplay(displayLevel)}
                    </p>
                    <p className="curation-edit-modal__level-id">#{levelId}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="curation-edit-modal__loading-inline">
              {t('loading.generic', { ns: 'common' })}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="curation-edit-modal__form">
              <div className="curation-edit-modal__form-group curation-edit-modal__types-tags">
                <ItemPickManager
                  className="curation-edit-modal__item-pick"
                  items={curationTypes || []}
                  selectedIds={form.typeIds}
                  onSelectedIdsChange={(ids) => setForm((p) => ({ ...p, typeIds: ids }))}
                  poolFilter={curationTypePoolFilter}
                  enableGrouping
                  fallbackGroupLabel={t('facetQueryBuilder.fallbackGroup')}
                  labels={curationPickLabels}
                  resetSearchSignal={isOpen}
                />
              </div>

              <div className="curation-edit-modal__form-group">
                <label htmlFor="curation-short">
                  {t('curationEditPopup.form.shortDescription')}
                  {selectedTypes.some((t) => hasAbility(t, ABILITY_FORCE_DESCRIPTION)) && (
                    <span className="required">*</span>
                  )}
                </label>
                <input
                  id="curation-short"
                  type="text"
                  value={form.shortDescription}
                  onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
                  className="curation-edit-modal__input"
                  maxLength={255}
                  disabled={!canManageThisCuration || !canEditDescription}
                />
              </div>

              <div className="curation-edit-modal__form-group">
                <label htmlFor="curation-desc">
                  {t('curationEditPopup.form.description')}
                  {selectedTypes.some((t) => hasAbility(t, ABILITY_FORCE_DESCRIPTION)) && (
                    <span className="required">*</span>
                  )}
                </label>
                <textarea
                  id="curation-desc"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="curation-edit-modal__textarea"
                  rows={3}
                  disabled={!canManageThisCuration || !canEditDescription}
                />
              </div>

              {canUseCustomColor && (
                <div className="curation-edit-modal__form-group">
                  <label htmlFor="curation-color">{t('curationEditPopup.form.customColor')}</label>
                  <div className="curation-edit-modal__color-input">
                    <input
                      id="curation-color"
                      type="color"
                      value={form.customColor}
                      onChange={(e) => setForm((p) => ({ ...p, customColor: e.target.value }))}
                      className="curation-edit-modal__color-picker"
                      disabled={!canManageThisCuration || !canEditCustomColor}
                    />
                    <input
                      type="text"
                      value={form.customColor}
                      onChange={(e) => setForm((p) => ({ ...p, customColor: e.target.value }))}
                      className="curation-edit-modal__color-text"
                      disabled={!canManageThisCuration || !canEditCustomColor}
                    />
                  </div>
                </div>
              )}

              <div className="curation-edit-modal__form-group curation-edit-modal__form-group--custom-css">
                <label htmlFor="curation-css">{t('curationEditPopup.form.customCSS')}</label>
                {!canUseCustomCSS && (
                  <p className="curation-edit-modal__help-text curation-edit-modal__css-unsupported-hint">
                    {t('curationEditPopup.warnings.cssUnsupported')}
                  </p>
                )}
                <textarea
                  id="curation-css"
                  value={form.customCSS}
                  onChange={(e) => setForm((p) => ({ ...p, customCSS: e.target.value }))}
                  className="curation-edit-modal__css-textarea curation-edit-modal__textarea"
                  rows={6}
                  disabled={!canManageThisCuration || !canEditCustomCSS}
                />
                <button
                  type="button"
                  className="curation-edit-modal__preview-button"
                  disabled={!canManageThisCuration || !canEditCustomCSS}
                  onClick={() => {
                    setPreviewPending(true);
                    navigate(`/admin/curations/preview/${levelId}`, {
                      state: { customCSS: form.customCSS },
                    });
                  }}
                >
                  {t('curationEditPopup.form.previewCSS')}
                </button>
              </div>

              {form.id != null && (
                <div className="curation-edit-modal__form-group">
                  <label>{t('curationEditPopup.form.thumbnail')}</label>
                  <ThumbnailUpload
                    disabled={!canManageThisCuration}
                    currentThumbnail={form.previewLink}
                    onThumbnailUpdate={(url) => {
                      setForm((p) => ({ ...p, previewLink: url }));
                      if (onCurationPatched) onCurationPatched({ id: form.id, previewLink: url, levelId });
                    }}
                    onThumbnailRemove={() => {
                      setForm((p) => ({ ...p, previewLink: null }));
                      if (onCurationPatched) onCurationPatched({ id: form.id, previewLink: null, levelId });
                    }}
                    uploadEndpoint={`${import.meta.env.VITE_CURATIONS}/${form.id}/thumbnail`}
                  />
                </div>
              )}

              <div className="curation-edit-modal__actions">
                <button
                  type="button"
                  onClick={onClose}
                  className="curation-edit-modal__cancel-btn"
                  disabled={isSaving}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
                <button
                  type="submit"
                  className="curation-edit-modal__save-btn"
                  disabled={isSaving || !canManageThisCuration}
                >
                  {isSaving
                    ? t('loading.saving', { ns: 'common' })
                    : t('curationEditPopup.actions.saveAll')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CurationEditPopup;

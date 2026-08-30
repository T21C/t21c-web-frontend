// tuf-search: #ModAdminEditPopup
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { CloseButton } from '@/components/common/buttons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { CustomSelect, ProfileSelector } from '@/components/common/selectors';
import ImageSelectorPopup from '@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import ModReleasesSection from './ModReleasesSection';
import {
  apiError,
  applyMods,
  canSubmitEdit,
  confirmDiscardUnsaved,
  countOtherModsForAssign,
  formFromMod,
  isFormDirty,
  ModFormFields,
  toEditPayload,
} from './modEditForm';

const EMPTY_MODS = [];

function asMod(data) {
  if (!data) return null;
  if (data.mod) return data.mod;
  if (data.id) return data;
  return null;
}

export default function ModAdminEditPopup({
  isOpen,
  mod,
  listMods = EMPTY_MODS,
  onClose,
  onChange,
  onBulkChange,
  onSaved,
  onNeedReload,
}) {
  const { t } = useTranslation(['pages', 'common']);
  const [editingMod, setEditingMod] = useState(null);
  const [editForm, setEditForm] = useState(() => formFromMod(mod));
  const [saving, setSaving] = useState(false);
  const [assignPlayer, setAssignPlayer] = useState(null);
  const [applyToSameCreator, setApplyToSameCreator] = useState(false);
  const [assignConfirmCount, setAssignConfirmCount] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [iconPicker, setIconPicker] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const [catalogTags, setCatalogTags] = useState([]);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [fetchedMergeMods, setFetchedMergeMods] = useState(EMPTY_MODS);
  const listModsRef = useRef(listMods);
  const onChangeRef = useRef(onChange);
  listModsRef.current = listMods;
  onChangeRef.current = onChange;

  const mergeSourceMods = listMods.length ? listMods : fetchedMergeMods;
  const mergeOptions = useMemo(
    () =>
      (editingMod
        ? mergeSourceMods.filter((item) => item.id !== editingMod.id)
        : mergeSourceMods
      ).map((item) => ({
        value: String(item.id),
        label: `${item.name} (${item.slug || item.id})`,
      })),
    [mergeSourceMods, editingMod],
  );

  useBodyScrollLock(Boolean(isOpen));

  const emitChange = useCallback(
    (next) => {
      if (!next) return;
      setEditingMod(next);
      onChange?.(next);
    },
    [onChange],
  );

  useEffect(() => {
    if (!isOpen || !mod?.id) {
      setEditingMod(null);
      return undefined;
    }
    setEditingMod(mod);
    setEditForm(formFromMod(mod));
    setAssignPlayer(null);
    setApplyToSameCreator(false);
    setAssignConfirmCount(null);
    setMergeSourceId('');
    setFetchedMergeMods(EMPTY_MODS);
    let cancelled = false;
    const load = async () => {
      try {
        const requests = [
          api.get(routes.admin.mods.byId(mod.id)),
          api.get(routes.admin.mods.tags()).catch(() => ({ data: { tags: [] } })),
        ];
        if (!listModsRef.current.length) {
          requests.push(
            api
              .get(routes.admin.mods.root(), { params: { offset: 0, limit: 100, sort: 'name-asc' } })
              .catch(() => null),
          );
        }
        const [detailRes, tagsRes, mergeRes] = await Promise.all(requests);
        if (cancelled) return;
        const detail = asMod(detailRes?.data);
        if (detail) {
          setEditingMod(detail);
          setEditForm(formFromMod(detail));
          onChangeRef.current?.(detail);
        }
        setCatalogTags(Array.isArray(tagsRes.data?.tags) ? tagsRes.data.tags : []);
        if (mergeRes?.data) setFetchedMergeMods(applyMods(mergeRes.data));
      } catch (error) {
        if (!cancelled) toast.error(apiError(error, t('mods.errors.loadFailed')));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, mod?.id, t]);

  if (!isOpen || !editingMod) return null;

  const closeEdit = () => {
    const baseline = formFromMod(editingMod);
    if (!confirmDiscardUnsaved(t, isFormDirty(editForm, baseline))) return;
    onClose?.();
  };

  const runAssign = async (applySame) => {
    if (!assignPlayer?.id || assigning) return;
    setAssigning(true);
    try {
      const { data } = await api.post(routes.admin.mods.assignees(editingMod.id), {
        playerId: assignPlayer.id,
        applyToSameCreator: Boolean(applySame),
      });
      const updated = Array.isArray(data?.mods) ? data.mods : [];
      onBulkChange?.(updated);
      const current = updated.find((item) => item.id === editingMod.id);
      if (current) emitChange(current);
      setAssignPlayer(null);
      setApplyToSameCreator(false);
      setAssignConfirmCount(null);
      if (updated.length > 1) onNeedReload?.();
      const count = Number(data?.assignedModCount) || updated.length;
      toast.success(
        count > 1 ? t('mods.assign.assignedMany', { count }) : t('mods.assign.assigned'),
      );
    } catch (error) {
      toast.error(apiError(error, t('mods.assign.failed')));
    } finally {
      setAssigning(false);
    }
  };

  const requestAssign = async () => {
    if (!assignPlayer?.id || assignPlayer.isNewRequest) return;
    let otherCount = 0;
    if (applyToSameCreator && editingMod.creatorDiscordId) {
      try {
        const { data } = await api.get(routes.admin.mods.root(), {
          params: {
            q: editingMod.creatorDiscordId,
            offset: 0,
            limit: 100,
            sort: 'name-asc',
          },
        });
        otherCount = countOtherModsForAssign(applyMods(data), editingMod, assignPlayer.user?.id);
      } catch {
        otherCount = countOtherModsForAssign(mergeSourceMods, editingMod, assignPlayer.user?.id);
      }
    }
    if (otherCount > 0) {
      setAssignConfirmCount(otherCount);
      return;
    }
    void runAssign(false);
  };

  const unassignUser = async (userId) => {
    if (assigning) return;
    setAssigning(true);
    try {
      const { data } = await api.delete(routes.admin.mods.assignee(editingMod.id, userId));
      if (data?.mod) emitChange(data.mod);
      toast.success(t('mods.assign.removed'));
    } catch (error) {
      toast.error(apiError(error, t('mods.assign.removeFailed')));
    } finally {
      setAssigning(false);
    }
  };

  const handleIconSave = async (file) => {
    setIconBusy(true);
    try {
      const body = new FormData();
      body.append('icon', file);
      const { data } = await api.post(routes.admin.mods.icon(editingMod.id), body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      emitChange(data?.mod);
      toast.success(t('mods.icon.uploaded'));
    } catch (error) {
      toast.error(getCdnErrorMessage(error, t('mods.icon.uploadFailed')));
    } finally {
      setIconBusy(false);
      setIconPicker(false);
    }
  };

  const handleIconRemove = async () => {
    setIconBusy(true);
    try {
      const { data } = await api.delete(routes.admin.mods.icon(editingMod.id));
      emitChange(data?.mod);
      toast.success(t('mods.icon.removed'));
    } catch (error) {
      toast.error(apiError(error, t('mods.icon.removeFailed')));
    } finally {
      setIconBusy(false);
    }
  };

  return (
    <>
      <div className="mods-page__modal" onClick={closeEdit}>
        <div className="mods-page__modal-content" onClick={(event) => event.stopPropagation()}>
          <CloseButton
            variant="floating"
            onClick={closeEdit}
            aria-label={t('buttons.close', { ns: 'common' })}
          />
          <h2>{t('mods.edit.title')}</h2>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!canSubmitEdit(editForm) || saving) return;
              setSaving(true);
              try {
                const { data } = await api.patch(routes.admin.mods.byId(editingMod.id), toEditPayload(editForm));
                toast.success(t('mods.notifications.updated'));
                onSaved?.(asMod(data) || editingMod);
              } catch (error) {
                toast.error(apiError(error, t('mods.notifications.updateFailed')));
              } finally {
                setSaving(false);
              }
            }}
          >
            <ModFormFields
              form={editForm}
              onChange={setEditForm}
              t={t}
              icon={{
                previewUrl: editingMod.imageUrl,
                disabled: saving || iconBusy,
                onChange: () => setIconPicker(true),
                onRemove: handleIconRemove,
              }}
            />
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={closeEdit}>
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button type="submit" className="confirm-button" disabled={!canSubmitEdit(editForm) || saving}>
                {t('mods.edit.updateButton')}
              </button>
            </div>
          </form>
          <div className="mods-page__assign">
            <p className="mods-page__assign-title">{t('mods.assign.title')}</p>
            <div className="mods-page__assignee-chips">
              {(editingMod.assignees || []).length === 0 ? (
                <span className="mods-page__assign-empty">{t('mods.assign.empty')}</span>
              ) : (
                (editingMod.assignees || []).map((assignee) => (
                  <span key={assignee.userId} className="mods-page__assignee-chip">
                    <span>{assignee.name}</span>
                    <button
                      type="button"
                      onClick={() => unassignUser(assignee.userId)}
                      disabled={assigning}
                      aria-label={t('mods.assign.remove', { name: assignee.name })}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <ProfileSelector
              type="player"
              value={assignPlayer}
              onChange={setAssignPlayer}
              placeholder={t('mods.assign.placeholder')}
              portalDropdown
              allowRequestNew={false}
              disabled={assigning}
            />
            <label className="mods-page__assign-same">
              <input
                type="checkbox"
                checked={applyToSameCreator}
                onChange={(event) => setApplyToSameCreator(event.target.checked)}
                disabled={assigning}
              />
              {t('mods.assign.applySameCreator')}
            </label>
            <button
              type="button"
              className="confirm-button"
              disabled={!assignPlayer?.id || assignPlayer.isNewRequest || assigning}
              onClick={requestAssign}
            >
              {t('mods.assign.addButton')}
            </button>
          </div>
          <div className="mods-page__assign">
            <p className="mods-page__assign-title">{t('mods.tags.title')}</p>
            {catalogTags.length === 0 ? (
              <span className="mods-page__assign-empty">
                {t('mods.tags.empty')}{' '}
                <Link to="/mods/edit/tags">{t('mods.tags.manage')}</Link>
              </span>
            ) : null}
            <div className="mods-page__assignee-chips">
              {catalogTags.map((tag) => {
                const selected = (editingMod.tags || []).some((item) => item.id === tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`mods-page__tag-toggle ${selected ? 'is-selected' : ''}`.trim()}
                      style={{ '--tag-color': tag.color }}
                    onClick={async () => {
                      const nextIds = selected
                        ? (editingMod.tags || []).filter((item) => item.id !== tag.id).map((item) => item.id)
                        : [...(editingMod.tags || []).map((item) => item.id), tag.id];
                      try {
                        const { data } = await api.put(routes.admin.mods.modTags(editingMod.id), {
                          tagIds: nextIds,
                        });
                        if (data?.mod) emitChange(data.mod);
                      } catch (error) {
                        toast.error(apiError(error, t('mods.tags.assignFailed')));
                      }
                    }}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
          <ModReleasesSection
            versions={editingMod.versions}
            versionsUrl={routes.admin.mods.versions(editingMod.id)}
            versionUrl={(versionId) => routes.admin.mods.version(editingMod.id, versionId)}
            onModUpdate={emitChange}
          />
          <div className="mods-page__assign">
            <p className="mods-page__assign-title">{t('mods.merge.title')}</p>
            <CustomSelect
              options={mergeOptions}
              value={mergeOptions.find((option) => option.value === mergeSourceId) || null}
              onChange={(option) => setMergeSourceId(option?.value || '')}
              placeholder={t('mods.merge.placeholder')}
              width="100%"
              isClearable
              isSearchable
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
            <button
              type="button"
              className="delete-confirm-button"
              disabled={!mergeSourceId}
              onClick={async () => {
                if (!window.confirm(t('mods.merge.confirm', { name: editingMod.name }))) return;
                try {
                  const { data } = await api.post(routes.admin.mods.merge(editingMod.id), {
                    sourceModId: Number(mergeSourceId),
                  });
                  if (data?.mod) emitChange(data.mod);
                  setMergeSourceId('');
                  toast.success(t('mods.merge.done'));
                  onNeedReload?.();
                } catch (error) {
                  toast.error(apiError(error, t('mods.merge.failed')));
                }
              }}
            >
              {t('mods.merge.button')}
            </button>
          </div>
        </div>
      </div>

      {assignConfirmCount != null ? (
        <div className="mods-page__modal" onClick={() => setAssignConfirmCount(null)}>
          <div className="mods-page__modal-content" onClick={(event) => event.stopPropagation()}>
            <h2>{t('mods.assign.confirmTitle')}</h2>
            <p>{t('mods.assign.confirmMessage', { count: assignConfirmCount })}</p>
            <div className="modal-actions">
              <button type="button" className="cancel-button" onClick={() => setAssignConfirmCount(null)}>
                {t('buttons.cancel', { ns: 'common' })}
              </button>
              <button
                type="button"
                className="confirm-button"
                disabled={assigning}
                onClick={() => void runAssign(true)}
              >
                {t('mods.assign.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ImageSelectorPopup
        isOpen={iconPicker}
        onClose={() => setIconPicker(false)}
        onSave={handleIconSave}
        currentAvatar={editingMod.imageUrl}
        mode="avatar"
        title={t('mods.icon.change')}
        outputFileName="mod-icon.jpg"
      />
    </>
  );
}

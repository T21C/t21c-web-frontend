// tuf-search: #ModTagsEditPage #modsTagsEditPage #mods #tags — Admin mod tag vocabulary
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { Footer } from '@/components/layout';
import { CloseButton } from '@/components/common/buttons';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import './modTagsEditPage.css';

const DEFAULT_TAG_COLOR = '#8d70ff';

const EMPTY_TAG_FORM = {
  name: '',
  color: DEFAULT_TAG_COLOR,
};

function apiError(error, fallback) {
  return getRateLimitMessage(error) || error?.response?.data?.error || fallback;
}

function toColorInputValue(color) {
  if (typeof color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color.toLowerCase();
  }
  return DEFAULT_TAG_COLOR;
}

function TagFormFields({ idPrefix, name, color, onNameChange, onColorChange, t, disabled }) {
  return (
    <>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-name`}>{t('mods.tags.create.name')}</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={64}
          required
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      <div className="form-group">
        <label htmlFor={`${idPrefix}-color`}>{t('mods.tags.create.color')}</label>
        <input
          id={`${idPrefix}-color`}
          type="color"
          value={toColorInputValue(color)}
          onChange={(event) => onColorChange(event.target.value)}
          required
          disabled={disabled}
        />
      </div>
    </>
  );
}

const ModTagsEditPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('mods.meta.tagsTitle'),
        description: t('mods.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTag, setNewTag] = useState(EMPTY_TAG_FORM);
  const [editingTag, setEditingTag] = useState(null);
  const [deletingTag, setDeletingTag] = useState(null);

  const popupOpen = isCreating || Boolean(editingTag) || Boolean(deletingTag);
  useBodyScrollLock(popupOpen);

  const loadTags = useCallback(async ({ silent } = {}) => {
    if (!silent) {
      setLoading(true);
      setLoadError('');
    }
    try {
      const { data } = await api.get(routes.admin.mods.tags());
      setTags(Array.isArray(data?.tags) ? data.tags : []);
      setLoadError('');
    } catch (error) {
      const message = apiError(error, t('mods.tags.loadFailed'));
      if (silent) {
        toast.error(message);
      } else {
        setTags([]);
        setLoadError(message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && isAdmin) void loadTags();
  }, [authLoading, isAdmin, loadTags]);

  const closeCreate = () => {
    setIsCreating(false);
    setNewTag(EMPTY_TAG_FORM);
  };

  const closeEdit = () => setEditingTag(null);

  const handleCreate = async (event) => {
    event.preventDefault();
    const name = newTag.name.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const nextSort =
        tags.reduce((max, tag) => Math.max(max, Number(tag.sortOrder) || 0), -1) + 1;
      await api.post(routes.admin.mods.tags(), {
        name,
        color: toColorInputValue(newTag.color),
        sortOrder: nextSort,
      });
      closeCreate();
      await loadTags({ silent: true });
      toast.success(t('mods.tags.created'));
    } catch (error) {
      toast.error(apiError(error, t('mods.tags.createFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editingTag || saving) return;
    const name = editingTag.name.trim();
    if (!name) return;
    setSaving(true);
    try {
      await api.patch(routes.admin.mods.tag(editingTag.id), {
        name,
        color: toColorInputValue(editingTag.color),
      });
      closeEdit();
      await loadTags({ silent: true });
      toast.success(t('mods.tags.updated'));
    } catch (error) {
      toast.error(apiError(error, t('mods.tags.updateFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTag || saving) return;
    setSaving(true);
    try {
      await api.delete(routes.admin.mods.tag(deletingTag.id));
      setDeletingTag(null);
      await loadTags({ silent: true });
      toast.success(t('mods.tags.deleted'));
    } catch (error) {
      toast.error(apiError(error, t('mods.tags.deleteFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mods-tags-page">
        <div className="mods-tags-page__container page-content-1000">
          <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/mods" replace />;
  }

  return (
    <>
      <MetaTags {...pageMeta} />
      <div className="mods-tags-page">
        <div className="mods-tags-page__container page-content-1000">
          <header className="mods-tags-page__header">
            <div className="mods-tags-page__heading">
              <Link to="/mods/edit" className="mods-tags-page__back">
                {t('mods.tags.backToEdit')}
              </Link>
              <h1>{t('mods.tags.pageTitle')}</h1>
              <p>{t('mods.tags.pageSubtitle')}</p>
            </div>
            <div className="mods-tags-page__header-actions">
              <button
                type="button"
                className="create-button"
                onClick={() => {
                  setNewTag(EMPTY_TAG_FORM);
                  setIsCreating(true);
                }}
                disabled={saving}
              >
                {t('mods.tags.createButton')}
              </button>
            </div>
          </header>

          {loadError ? <div className="error-message">{loadError}</div> : null}

          {loading ? (
            <div className="loading-message">{t('loading.generic', { ns: 'common' })}</div>
          ) : tags.length === 0 ? (
            <div className="no-items-message">{t('mods.tags.empty')}</div>
          ) : (
            <div className="tags-list">
              {tags.map((tag) => (
                <div key={tag.id} className="tag-item">
                  <div className="tag-item-content">
                    <div className="tag-item-info">
                      <div className="tag-item-name" style={{ color: tag.color }}>
                        {tag.name}
                      </div>
                      <div className="tag-item-color">{tag.color}</div>
                    </div>
                  </div>
                  <div className="tag-item-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTag({
                          id: tag.id,
                          name: tag.name,
                          color: toColorInputValue(tag.color),
                        })
                      }
                      disabled={saving}
                      aria-label={t('buttons.edit', { ns: 'common' })}
                    >
                      <EditIcon color="#fff" size="20px" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTag(tag)}
                      disabled={saving}
                      aria-label={t('buttons.delete', { ns: 'common' })}
                    >
                      <TrashIcon color="#fff" size="20px" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isCreating ? (
          <div
            className="mods-tags-page__modal"
            onClick={(event) => {
              if (event.target === event.currentTarget && !saving) closeCreate();
            }}
          >
            <div
              className="mods-tags-page__modal-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mod-tag-create-title"
            >
              <CloseButton
                variant="floating"
                onClick={closeCreate}
                disabled={saving}
                aria-label={t('buttons.close', { ns: 'common' })}
              />
              <h2 id="mod-tag-create-title">{t('mods.tags.create.title')}</h2>
              <form className="mods-tags-page__form" onSubmit={handleCreate}>
                <TagFormFields
                  idPrefix="mod-tag-create"
                  name={newTag.name}
                  color={newTag.color}
                  onNameChange={(name) => setNewTag((prev) => ({ ...prev, name }))}
                  onColorChange={(color) => setNewTag((prev) => ({ ...prev, color }))}
                  t={t}
                  disabled={saving}
                />
                <div className="modal-actions">
                  <button
                    type="submit"
                    className="confirm-button"
                    disabled={saving || !newTag.name.trim()}
                  >
                    {t('mods.tags.create.createButton')}
                  </button>
                  <button type="button" className="cancel-button" onClick={closeCreate} disabled={saving}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {editingTag ? (
          <div
            className="mods-tags-page__modal"
            onClick={(event) => {
              if (event.target === event.currentTarget && !saving) closeEdit();
            }}
          >
            <div
              className="mods-tags-page__modal-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mod-tag-edit-title"
            >
              <CloseButton
                variant="floating"
                onClick={closeEdit}
                disabled={saving}
                aria-label={t('buttons.close', { ns: 'common' })}
              />
              <h2 id="mod-tag-edit-title">{t('mods.tags.edit.title')}</h2>
              <form className="mods-tags-page__form" onSubmit={handleUpdate}>
                <TagFormFields
                  idPrefix="mod-tag-edit"
                  name={editingTag.name}
                  color={editingTag.color}
                  onNameChange={(name) => setEditingTag((prev) => ({ ...prev, name }))}
                  onColorChange={(color) => setEditingTag((prev) => ({ ...prev, color }))}
                  t={t}
                  disabled={saving}
                />
                <div className="modal-actions">
                  <button
                    type="submit"
                    className="confirm-button"
                    disabled={saving || !editingTag.name.trim()}
                  >
                    {t('mods.tags.edit.updateButton')}
                  </button>
                  <button type="button" className="cancel-button" onClick={closeEdit} disabled={saving}>
                    {t('buttons.cancel', { ns: 'common' })}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {deletingTag ? (
          <div
            className="mods-tags-page__modal"
            onClick={(event) => {
              if (event.target === event.currentTarget && !saving) setDeletingTag(null);
            }}
          >
            <div
              className="mods-tags-page__modal-content"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mod-tag-delete-title"
            >
              <CloseButton
                variant="floating"
                onClick={() => setDeletingTag(null)}
                disabled={saving}
                aria-label={t('buttons.close', { ns: 'common' })}
              />
              <h2 id="mod-tag-delete-title">{t('mods.tags.delete.title')}</h2>
              <p>{t('mods.tags.delete.message', { name: deletingTag.name })}</p>
              <p>{t('mods.tags.delete.description')}</p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="delete-confirm-button"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {t('mods.tags.delete.deleteButton')}
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setDeletingTag(null)}
                  disabled={saving}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <Footer />
      </div>
    </>
  );
};

export default ModTagsEditPage;

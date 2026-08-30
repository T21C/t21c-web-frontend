// tuf-search: #DevelopersModEditPage
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { getRateLimitMessage } from '@/utils/rateLimitError';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import ImageSelectorPopup from '@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import ModsMarkdown from '@/pages/misc/ModsPage/ModsMarkdown';

function formFromMod(mod) {
  return {
    name: mod?.name || '',
    description: mod?.description || '',
    projectUrl: mod?.projectUrl || '',
    deprecatedAfter: mod?.deprecatedAfter || '',
  };
}

function toPayload(form) {
  return {
    name: form.name,
    description: form.description,
    projectUrl: form.projectUrl || null,
    deprecatedAfter: form.deprecatedAfter || null,
  };
}

const DevelopersModEditPage = () => {
  const { t } = useTranslation('pages');
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [iconUrl, setIconUrl] = useState(null);
  const [slug, setSlug] = useState('');
  const [tagItems, setTagItems] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const apiError = (error, fallback) =>
    getRateLimitMessage(error) || error?.response?.data?.error || fallback;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(routes.developers.mods.byId(id));
      const next = res.data?.mod;
      if (!next) {
        toast.error(t('developers.mods.notFound'));
        navigate('/developers/mods');
        return;
      }
      setForm(formFromMod(next));
      setIconUrl(next.imageUrl || null);
      setSlug(next.slug || '');
      setSelectedTagIds((next.tags || []).map((tag) => tag.id));
    } catch (error) {
      toast.error(apiError(error, t('developers.mods.notFound')));
      navigate('/developers/mods');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .get(routes.mods.tags())
      .then((res) => setTagItems(Array.isArray(res.data?.tags) ? res.data.tags : []))
      .catch(() => setTagItems([]));
  }, []);

  const setField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form?.name.trim() || saving) return;
    setSaving(true);
    try {
      await api.patch(routes.developers.mods.byId(id), toPayload(form));
      toast.success(t('developers.mods.saved'));
    } catch (error) {
      toast.error(apiError(error, t('developers.mods.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (file) => {
    setUploadingIcon(true);
    try {
      const body = new FormData();
      body.append('icon', file);
      const res = await api.post(routes.developers.mods.icon(id), body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setIconUrl(res.data?.mod?.imageUrl || null);
      toast.success(t('mods.icon.uploaded'));
    } catch (error) {
      toast.error(getCdnErrorMessage(error, t('mods.icon.uploadFailed')));
    } finally {
      setUploadingIcon(false);
      setIconPickerOpen(false);
    }
  };

  const handleIconRemove = async () => {
    setUploadingIcon(true);
    try {
      const res = await api.delete(routes.developers.mods.icon(id));
      setIconUrl(res.data?.mod?.imageUrl || null);
      toast.success(t('mods.icon.removed'));
    } catch (error) {
      toast.error(apiError(error, t('mods.icon.removeFailed')));
    } finally {
      setUploadingIcon(false);
    }
  };

  if (loading || !form) {
    return (
      <section className="developers-portal__section">
        <div className="loader loader-relative" />
      </section>
    );
  }

  const initial = (form.name || '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <section className="developers-portal__section">
      <Link to="/developers/mods" className="developers-portal__back">
        {t('developers.mods.back')}
      </Link>
      <h2 className="developers-portal__section-title">{t('developers.mods.editTitle')}</h2>
      <div className="developers-portal__mod-edit">
        <form className="developers-portal__form" onSubmit={submit}>
          <div className="developers-portal__icon-row">
            {iconUrl ? (
              <img className="developers-portal__app-icon developers-portal__app-icon--lg" src={iconUrl} alt="" />
            ) : (
              <span
                className="developers-portal__app-icon developers-portal__app-icon--lg developers-portal__app-icon--fallback"
                aria-hidden
              >
                {initial}
              </span>
            )}
            <div className="developers-portal__icon-actions">
              <button
                type="button"
                className="developers-portal__btn developers-portal__btn--secondary"
                disabled={uploadingIcon}
                onClick={() => setIconPickerOpen(true)}
              >
                {t('mods.icon.change')}
              </button>
              {iconUrl ? (
                <button
                  type="button"
                  className="developers-portal__btn developers-portal__btn--ghost"
                  disabled={uploadingIcon}
                  onClick={handleIconRemove}
                >
                  {t('mods.icon.remove')}
                </button>
              ) : null}
            </div>
          </div>
          <label className="developers-portal__field">
            {t('mods.fields.name')}
            <input
              type="text"
              value={form.name}
              onChange={setField('name')}
              maxLength={512}
              required
            />
          </label>
          <label className="developers-portal__field">
            {t('mods.fields.projectUrl')}
            <input type="url" value={form.projectUrl} onChange={setField('projectUrl')} />
          </label>
          <label className="developers-portal__field">
            {t('mods.fields.deprecatedAfter')}
            <input
              type="text"
              value={form.deprecatedAfter}
              onChange={setField('deprecatedAfter')}
              maxLength={64}
              placeholder="v2.9.8"
            />
          </label>
          <label className="developers-portal__field">
            {t('mods.fields.description')}
            <textarea
              rows={10}
              value={form.description}
              onChange={setField('description')}
              maxLength={16384}
            />
          </label>
          {tagItems.length ? (
            <div className="developers-portal__field">
              <span>{t('mods.tags.title')}</span>
              <div className="mods-page__assignee-chips">
                {tagItems.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={`mods-page__tag-toggle ${selected ? 'is-selected' : ''}`.trim()}
                      style={{ color: tag.color }}
                      onClick={async () => {
                        const nextIds = selected
                          ? selectedTagIds.filter((item) => item !== tag.id)
                          : [...selectedTagIds, tag.id];
                        try {
                          const { data } = await api.put(routes.developers.mods.tags(id), {
                            tagIds: nextIds,
                          });
                          setSelectedTagIds((data?.mod?.tags || []).map((item) => item.id));
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
          ) : null}
          {slug ? (
            <Link to={`/mods/${encodeURIComponent(slug)}`} className="developers-portal__back">
              {t('developers.mods.viewPublic')}
            </Link>
          ) : null}
          <div className="developers-portal__actions">
            <button
              type="submit"
              className="developers-portal__btn developers-portal__btn--primary"
              disabled={!form.name.trim() || saving}
            >
              {saving ? t('developers.saving') : t('developers.mods.save')}
            </button>
          </div>
        </form>
        <div className="developers-portal__mod-preview">
          <p className="developers-portal__mod-preview-title">{t('developers.mods.preview')}</p>
          {form.description ? (
            <ModsMarkdown className="developers-portal__md-preview">{form.description}</ModsMarkdown>
          ) : null}
        </div>
      </div>
      <ImageSelectorPopup
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSave={handleIconUpload}
        currentAvatar={iconUrl}
        mode="avatar"
        title={t('mods.icon.change')}
        outputFileName="mod-icon.jpg"
      />
    </section>
  );
};

export default DevelopersModEditPage;

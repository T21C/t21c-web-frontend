// tuf-search: #DevelopersAppDetailPage
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import ImageSelectorPopup from '@/components/common/selectors/ImageSelectorPopup/ImageSelectorPopup';
import { getCdnErrorMessage } from '@/utils/uploadErrors';
import DevelopersAppIcon from './DevelopersAppIcon';
import DevelopersRedirectChips from './DevelopersRedirectChips';
import DevelopersScopeNotice from './DevelopersScopeNotice';
import { V1_GRANTABLE_MASK_STRING } from '@/utils/oauthScopes';

const TABS = ['overview', 'credentials', 'config', 'danger'];

const DevelopersAppDetailPage = () => {
  const { t } = useTranslation('pages');
  const { appId } = useParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [app, setApp] = useState(null);
  const [form, setForm] = useState(null);

  const frozen = app?.status === 'frozen';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const appRes = await api.get(routes.developers.apps.byId(appId));
      const next = appRes.data?.app;
      if (!next) {
        toast.error(t('developers.notFound'));
        navigate('/developers');
        return;
      }
      setApp(next);
      setForm({
        name: next.name || '',
        description: next.description || '',
        homepageUrl: next.homepageUrl || '',
        privacyUrl: next.privacyUrl || '',
        redirectUris: next.redirectUris || [],
        singleGrant: Boolean(next.singleGrant),
      });
    } catch {
      toast.error(t('developers.notFound'));
      navigate('/developers');
    } finally {
      setLoading(false);
    }
  }, [appId, navigate, t]);

  useEffect(() => {
    load();
  }, [load]);

  const saveOverview = async (e) => {
    e.preventDefault();
    if (frozen || !form) return;
    setSaving(true);
    try {
      const res = await api.patch(routes.developers.apps.byId(appId), {
        name: form.name,
        description: form.description,
        homepageUrl: form.homepageUrl,
        privacyUrl: form.privacyUrl,
        singleGrant: form.singleGrant,
      });
      setApp(res.data.app);
      toast.success(t('developers.saved'));
    } catch (err) {
      toast.error(err?.response?.data?.error || t('developers.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    if (frozen || !form) return;
    if (!form.redirectUris.length) {
      toast.error(t('developers.redirectRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(routes.developers.apps.byId(appId), {
        redirectUris: form.redirectUris,
        allowedScopes: V1_GRANTABLE_MASK_STRING,
      });
      setApp(res.data.app);
      setForm((f) => ({
        ...f,
        redirectUris: res.data.app.redirectUris,
      }));
      toast.success(t('developers.saved'));
    } catch (err) {
      toast.error(err?.response?.data?.error || t('developers.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleIconUpload = async (file) => {
    setUploadingIcon(true);
    try {
      const body = new FormData();
      body.append('icon', file);
      const res = await api.post(routes.developers.apps.icon(appId), body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setApp(res.data.app);
      toast.success(t('developers.iconUploaded'));
    } catch (error) {
      toast.error(getCdnErrorMessage(error, t('developers.iconUploadFailed')));
    } finally {
      setUploadingIcon(false);
      setIconPickerOpen(false);
    }
  };

  const handleIconRemove = async () => {
    setUploadingIcon(true);
    try {
      const res = await api.delete(routes.developers.apps.icon(appId));
      setApp(res.data.app);
      toast.success(t('developers.iconRemoved'));
    } catch {
      toast.error(t('developers.iconRemoveFailed'));
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('developers.deleteConfirm'))) return;
    try {
      await api.delete(routes.developers.apps.byId(appId));
      toast.success(t('developers.deleted'));
      navigate('/developers');
    } catch {
      toast.error(t('developers.deleteError'));
    }
  };

  const copyClientId = async () => {
    try {
      await navigator.clipboard.writeText(app.clientId);
      toast.success(t('developers.copied'));
    } catch {
      toast.error(t('developers.copyFailed'));
    }
  };

  if (loading || !app || !form) {
    return (
      <section className="developers-portal__section">
        <div className="loader loader-relative" />
      </section>
    );
  }

  return (
    <section className="developers-portal__section">
      <Link to="/developers" className="developers-portal__back">
        ← {t('developers.back')}
      </Link>

      <div className="developers-portal__detail-head">
        <DevelopersAppIcon name={app.name} iconUrl={app.iconUrl} size="lg" />
        <div className="developers-portal__detail-head-text">
          <h2 className="developers-portal__section-title">
            {app.name}
            {app.verified ? (
              <span className="developers-portal__verified" title={t('developers.verified')}>
                ✓
              </span>
            ) : null}
          </h2>
          <span className={`developers-portal__status developers-portal__status--${app.status}`}>
            {app.status}
          </span>
        </div>
      </div>

      {frozen && (
        <p className="developers-portal__warn" role="alert">
          {t('developers.frozen')}
        </p>
      )}

      <div className="developers-portal__tabs" role="tablist">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`developers-portal__tab${tab === id ? ' developers-portal__tab--active' : ''}`}
            onClick={() => setTab(id)}
          >
            {t(`developers.tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <form className="developers-portal__form" onSubmit={saveOverview}>
          <div className="developers-portal__icon-row">
            <DevelopersAppIcon name={app.name} iconUrl={app.iconUrl} size="lg" />
            <div className="developers-portal__icon-actions">
              <button
                type="button"
                className="developers-portal__btn developers-portal__btn--secondary"
                disabled={frozen || uploadingIcon}
                onClick={() => setIconPickerOpen(true)}
              >
                {t('developers.changeIcon')}
              </button>
              {app.iconUrl ? (
                <button
                  type="button"
                  className="developers-portal__btn developers-portal__btn--ghost"
                  disabled={frozen || uploadingIcon}
                  onClick={handleIconRemove}
                >
                  {t('developers.removeIcon')}
                </button>
              ) : null}
            </div>
          </div>

          <label className="developers-portal__field">
            <span>{t('developers.name')}</span>
            <input
              required
              minLength={3}
              maxLength={64}
              value={form.name}
              disabled={frozen}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="developers-portal__field">
            <span>{t('developers.description')}</span>
            <textarea
              rows={3}
              maxLength={512}
              value={form.description}
              disabled={frozen}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>
          <div className="developers-portal__field-row">
            <label className="developers-portal__field">
              <span>{t('developers.homepage')}</span>
              <input
                type="url"
                value={form.homepageUrl}
                disabled={frozen}
                onChange={(e) => setForm((f) => ({ ...f, homepageUrl: e.target.value }))}
              />
            </label>
            <label className="developers-portal__field">
              <span>{t('developers.privacy')}</span>
              <input
                type="url"
                value={form.privacyUrl}
                disabled={frozen}
                onChange={(e) => setForm((f) => ({ ...f, privacyUrl: e.target.value }))}
              />
            </label>
          </div>
          <label className="developers-portal__toggle">
            <input
              type="checkbox"
              checked={form.singleGrant}
              disabled={frozen}
              onChange={(e) => setForm((f) => ({ ...f, singleGrant: e.target.checked }))}
            />
            <span>
              <strong>{t('developers.singleGrantLabel')}</strong>
              <small>{t('developers.singleGrantHelp')}</small>
            </span>
          </label>
          {!frozen && (
            <div className="developers-portal__actions">
              <button
                type="submit"
                className="developers-portal__btn developers-portal__btn--primary"
                disabled={saving}
              >
                {saving ? t('developers.saving') : t('developers.save')}
              </button>
            </div>
          )}
        </form>
      )}

      {tab === 'credentials' && (
        <div className="developers-portal__panel">
          <label className="developers-portal__field">
            <span>{t('developers.clientId')}</span>
            <div className="developers-portal__copy-row">
              <input type="text" readOnly value={app.clientId} onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="developers-portal__btn developers-portal__btn--secondary"
                onClick={copyClientId}
              >
                {t('developers.copy')}
              </button>
            </div>
          </label>
          <div className="developers-portal__secret-soon">
            <strong>{t('developers.clientSecret')}</strong>
            <p>{t('developers.confidentialSoon')}</p>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <form className="developers-portal__form" onSubmit={saveConfig}>
          <fieldset className="developers-portal__fieldset" disabled={frozen}>
            <legend>{t('developers.redirectUris')}</legend>
            <DevelopersRedirectChips
              uris={form.redirectUris}
              disabled={frozen}
              onChange={(redirectUris) => setForm((f) => ({ ...f, redirectUris }))}
            />
          </fieldset>
          <DevelopersScopeNotice />
          {!frozen && (
            <div className="developers-portal__actions">
              <button
                type="submit"
                className="developers-portal__btn developers-portal__btn--primary"
                disabled={saving}
              >
                {saving ? t('developers.saving') : t('developers.save')}
              </button>
            </div>
          )}
        </form>
      )}

      {tab === 'danger' && (
        <div className="developers-portal__danger">
          <h3>{t('developers.dangerTitle')}</h3>
          <p>{t('developers.dangerBody')}</p>
          <button
            type="button"
            className="developers-portal__btn developers-portal__btn--danger"
            onClick={handleDelete}
          >
            {t('developers.delete')}
          </button>
        </div>
      )}

      <ImageSelectorPopup
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSave={handleIconUpload}
        currentAvatar={app.iconUrl}
        mode="avatar"
        title={t('developers.changeIcon')}
        outputFileName="oauth-client-icon.jpg"
      />
    </section>
  );
};

export default DevelopersAppDetailPage;

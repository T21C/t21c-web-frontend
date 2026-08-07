// tuf-search: #DevelopersCreatePage
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { V1_GRANTABLE_MASK_STRING } from '@/utils/oauthScopes';
import DevelopersRedirectChips from './DevelopersRedirectChips';
import DevelopersScopeNotice from './DevelopersScopeNotice';

const DevelopersCreatePage = () => {
  const { t } = useTranslation('pages');
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    homepageUrl: '',
    privacyUrl: '',
    redirectUris: ['http://127.0.0.1:8765/callback'],
    singleGrant: false,
    acceptedTos: false,
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.redirectUris.length) {
      toast.error(t('developers.redirectRequired'));
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(routes.developers.apps.list(), {
        name: form.name,
        description: form.description,
        homepageUrl: form.homepageUrl,
        privacyUrl: form.privacyUrl,
        redirectUris: form.redirectUris,
        allowedScopes: V1_GRANTABLE_MASK_STRING,
        singleGrant: form.singleGrant,
        acceptedTos: form.acceptedTos,
      });
      toast.success(t('developers.created'));
      navigate(`/developers/apps/${res.data.app.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || t('developers.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="developers-portal__section">
      <Link to="/developers" className="developers-portal__back">
        ← {t('developers.back')}
      </Link>
      <h2 className="developers-portal__section-title">{t('developers.createTitle')}</h2>
      <p className="developers-portal__lede">{t('developers.createLede')}</p>

      <form className="developers-portal__form" onSubmit={submit}>
        <label className="developers-portal__field">
          <span>{t('developers.name')}</span>
          <input
            required
            minLength={3}
            maxLength={64}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className="developers-portal__field">
          <span>{t('developers.description')}</span>
          <textarea
            rows={3}
            maxLength={512}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        <div className="developers-portal__field-row">
          <label className="developers-portal__field">
            <span>{t('developers.homepage')}</span>
            <input
              type="url"
              value={form.homepageUrl}
              onChange={(e) => setForm((f) => ({ ...f, homepageUrl: e.target.value }))}
            />
          </label>
          <label className="developers-portal__field">
            <span>{t('developers.privacy')}</span>
            <input
              type="url"
              value={form.privacyUrl}
              onChange={(e) => setForm((f) => ({ ...f, privacyUrl: e.target.value }))}
            />
          </label>
        </div>

        <fieldset className="developers-portal__fieldset">
          <legend>{t('developers.redirectUris')}</legend>
          <DevelopersRedirectChips
            uris={form.redirectUris}
            onChange={(redirectUris) => setForm((f) => ({ ...f, redirectUris }))}
          />
        </fieldset>

        <DevelopersScopeNotice />

        <label className="developers-portal__toggle">
          <input
            type="checkbox"
            checked={form.singleGrant}
            onChange={(e) => setForm((f) => ({ ...f, singleGrant: e.target.checked }))}
          />
          <span>
            <strong>{t('developers.singleGrantLabel')}</strong>
            <small>{t('developers.singleGrantHelp')}</small>
          </span>
        </label>

        <p className="developers-portal__muted">{t('developers.confidentialSoon')}</p>

        <label className="developers-portal__toggle">
          <input
            type="checkbox"
            required
            checked={form.acceptedTos}
            onChange={(e) => setForm((f) => ({ ...f, acceptedTos: e.target.checked }))}
          />
          <span>{t('developers.acceptTos')}</span>
        </label>

        <div className="developers-portal__actions">
          <button
            type="submit"
            className="developers-portal__btn developers-portal__btn--primary"
            disabled={saving}
          >
            {saving ? t('developers.saving') : t('developers.createSubmit')}
          </button>
        </div>
      </form>
    </section>
  );
};

export default DevelopersCreatePage;

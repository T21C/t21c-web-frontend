// tuf-search: #AdminOAuthClientsPage
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import AccessDenied from '@/components/common/display/AccessDenied/AccessDenied';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { MetaTags } from '@/components/common/display';
import { Link } from 'react-router-dom';
import '@/pages/developers/developersPortal.css';
import './adminOAuthClientsPage.css';

const PAGE_SIZE = 50;

const AppIcon = ({ name, iconUrl }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  if (iconUrl) {
    return <img src={iconUrl} alt="" className="admin-oauth-clients-page__icon" />;
  }
  return (
    <span className="admin-oauth-clients-page__icon admin-oauth-clients-page__icon--fallback" aria-hidden>
      {initial}
    </span>
  );
};

const AdminOAuthClientsPage = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(routes.admin.oauthClients.list(), {
        params: { q: q || undefined, limit: PAGE_SIZE, offset },
      });
      setApps(res.data?.apps || []);
      setTotal(Number(res.data?.total) || 0);
    } catch {
      toast.error(t('admin.oauthClients.loadError'));
      setApps([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, offset, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      setQ(qInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [qInput]);

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied
        metaTitle={t('admin.oauthClients.meta.title')}
        metaDescription={t('admin.oauthClients.meta.description')}
      />
    );
  }

  const act = async (id, action) => {
    setBusyId(id);
    try {
      await api.post(routes.admin.oauthClients.action(id, action));
      toast.success(t(`admin.oauthClients.actionOk.${action}`));
      await load();
    } catch {
      toast.error(t(`admin.oauthClients.actionFail.${action}`));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (app) => {
    if (!window.confirm(t('admin.oauthClients.deleteConfirm', { name: app.name }))) return;
    setBusyId(app.id);
    try {
      await api.delete(routes.admin.oauthClients.byId(app.id));
      toast.success(t('admin.oauthClients.deleted'));
      await load();
    } catch {
      toast.error(t('admin.oauthClients.deleteFail'));
    } finally {
      setBusyId(null);
    }
  };

  const pageEnd = Math.min(offset + apps.length, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="admin-oauth-clients-page">
      <MetaTags
        title={t('admin.oauthClients.meta.title')}
        description={t('admin.oauthClients.meta.description')}
        noindex
      />
      <header className="developers-portal__top">
        <div className="developers-portal__top-text">
          <h1 className="developers-portal__title">{t('admin.oauthClients.title')}</h1>
        </div>
        <nav className="developers-portal__nav" aria-label={t('admin.oauthClients.back')}>
          <Link to="/developers" className="developers-portal__nav-link">
            {t('admin.oauthClients.back')}
          </Link>
        </nav>
      </header>

      <form
        className="admin-oauth-clients-page__search"
        onSubmit={(e) => {
          e.preventDefault();
          setOffset(0);
          setQ(qInput.trim());
        }}
      >
        <label className="admin-oauth-clients-page__search-field">
          <span className="admin-oauth-clients-page__sr-only">{t('admin.oauthClients.searchLabel')}</span>
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t('admin.oauthClients.searchPlaceholder')}
            autoComplete="off"
          />
        </label>
        <button type="submit" className="admin-oauth-clients-page__btn admin-oauth-clients-page__btn--primary">
          {t('admin.oauthClients.search')}
        </button>
      </form>

      <p className="admin-oauth-clients-page__count">
        {loading
          ? t('admin.oauthClients.loading')
          : t('admin.oauthClients.resultCount', { shown: apps.length, total })}
      </p>

      {loading ? (
        <div className="loader loader-relative" />
      ) : apps.length === 0 ? (
        <p className="admin-oauth-clients-page__empty">{t('admin.oauthClients.empty')}</p>
      ) : (
        <ul className="admin-oauth-clients-page__list">
          {apps.map((app) => (
            <li key={app.id} className="admin-oauth-clients-page__row">
              <AppIcon name={app.name} iconUrl={app.iconUrl} />
              <div className="admin-oauth-clients-page__main">
                <div className="admin-oauth-clients-page__title-row">
                  <strong className="admin-oauth-clients-page__name">
                    {app.name}
                    {app.verified ? (
                      <span className="admin-oauth-clients-page__verified" title={t('admin.oauthClients.verified')}>
                        ✓
                      </span>
                    ) : null}
                  </strong>
                  <span
                    className={`admin-oauth-clients-page__status admin-oauth-clients-page__status--${app.status}`}
                  >
                    {app.status}
                  </span>
                </div>
                <div className="admin-oauth-clients-page__meta">
                  <span title={t('admin.oauthClients.clientId')}>
                    {t('admin.oauthClients.clientId')}: <code>{app.clientId}</code>
                  </span>
                  <span title={t('admin.oauthClients.rowId')}>
                    {t('admin.oauthClients.rowId')}: <code>{app.id}</code>
                  </span>
                  <span>
                    {t('admin.oauthClients.owner')}: {app.ownerUsername || app.ownerUserId || '—'}
                  </span>
                  {app.createdAt ? (
                    <span>
                      {t('admin.oauthClients.created')}:{' '}
                      {new Date(app.createdAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="admin-oauth-clients-page__actions">
                {app.status === 'active' ? (
                  <button
                    type="button"
                    className="admin-oauth-clients-page__btn"
                    disabled={busyId === app.id}
                    onClick={() => act(app.id, 'freeze')}
                  >
                    {t('admin.oauthClients.freeze')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-oauth-clients-page__btn"
                    disabled={busyId === app.id}
                    onClick={() => act(app.id, 'unfreeze')}
                  >
                    {t('admin.oauthClients.unfreeze')}
                  </button>
                )}
                {app.verified ? (
                  <button
                    type="button"
                    className="admin-oauth-clients-page__btn"
                    disabled={busyId === app.id}
                    onClick={() => act(app.id, 'unverify')}
                  >
                    {t('admin.oauthClients.unverify')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-oauth-clients-page__btn admin-oauth-clients-page__btn--primary"
                    disabled={busyId === app.id}
                    onClick={() => act(app.id, 'verify')}
                  >
                    {t('admin.oauthClients.verify')}
                  </button>
                )}
                <button
                  type="button"
                  className="admin-oauth-clients-page__btn admin-oauth-clients-page__btn--danger"
                  disabled={busyId === app.id}
                  onClick={() => handleDelete(app)}
                >
                  {t('admin.oauthClients.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && total > PAGE_SIZE ? (
        <div className="admin-oauth-clients-page__pager">
          <button
            type="button"
            className="admin-oauth-clients-page__btn"
            disabled={!canPrev}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            {t('admin.oauthClients.prev')}
          </button>
          <span>
            {t('admin.oauthClients.pageRange', { start: offset + 1, end: pageEnd, total })}
          </span>
          <button
            type="button"
            className="admin-oauth-clients-page__btn"
            disabled={!canNext}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            {t('admin.oauthClients.next')}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default AdminOAuthClientsPage;

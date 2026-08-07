// tuf-search: #DevelopersHubPage
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import DevelopersAppIcon from './DevelopersAppIcon';

const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const DevelopersHubPage = () => {
  const { t } = useTranslation('pages');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(routes.developers.apps.list());
      setApps(res.data?.apps || []);
    } catch {
      toast.error(t('developers.loadError'));
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async (clientId, e) => {
    e.preventDefault();
    e.stopPropagation();
    const ok = await copyText(clientId);
    if (ok) toast.success(t('developers.copied'));
    else toast.error(t('developers.copyFailed'));
  };

  return (
    <section className="developers-portal__section">
      {loading ? (
        <div className="loader loader-relative" />
      ) : apps.length === 0 ? (
        <div className="developers-portal__empty">
          <h3>{t('developers.emptyTitle')}</h3>
          <p>{t('developers.emptyBody')}</p>
          <Link
            to="/developers/apps/new"
            className="developers-portal__btn developers-portal__btn--primary"
          >
            {t('developers.createFirst')}
          </Link>
        </div>
      ) : (
        <ul className="developers-portal__card-grid">
          {apps.map((app) => (
            <li key={app.id}>
              <Link to={`/developers/apps/${app.id}`} className="developers-portal__card">
                <DevelopersAppIcon name={app.name} iconUrl={app.iconUrl} size="md" />
                <div className="developers-portal__card-body">
                  <div className="developers-portal__card-title-row">
                    <span className="developers-portal__card-name">
                      {app.name}
                      {app.verified ? (
                        <span className="developers-portal__verified" title={t('developers.verified')}>
                          ✓
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`developers-portal__status developers-portal__status--${app.status}`}
                    >
                      {app.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="developers-portal__client-id"
                    onClick={(e) => handleCopy(app.clientId, e)}
                    title={t('developers.copyClientId')}
                  >
                    {app.clientId}
                  </button>
                  <div className="developers-portal__card-meta">
                    <span>{t('developers.scopesPublicBadge')}</span>
                    {app.singleGrant ? <span>{t('developers.singleGrant')}</span> : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DevelopersHubPage;

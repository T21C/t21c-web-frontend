// tuf-search: #DevelopersModsPage
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { routes } from '@/api/routes';

const DevelopersModsPage = () => {
  const { t } = useTranslation('pages');
  const [mods, setMods] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(routes.developers.mods.list());
      setMods(Array.isArray(res.data?.mods) ? res.data.mods : []);
    } catch {
      toast.error(t('developers.mods.loadError'));
      setMods([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="developers-portal__section">
      {loading ? (
        <div className="loader loader-relative" />
      ) : mods.length === 0 ? (
        <div className="developers-portal__empty">
          <h3>{t('developers.mods.emptyTitle')}</h3>
          <p>{t('developers.mods.emptyBody')}</p>
        </div>
      ) : (
        <ul className="developers-portal__card-grid">
          {mods.map((mod) => (
            <li key={mod.id}>
              <Link to={`/developers/mods/${mod.id}`} className="developers-portal__card">
                <div className="developers-portal__card-body">
                  <div className="developers-portal__card-title-row">
                    <span className="developers-portal__card-name">{mod.name}</span>
                    {mod.hidden ? (
                      <span className="developers-portal__status">{t('mods.hiddenBadge')}</span>
                    ) : null}
                  </div>
                  {mod.version ? (
                    <div className="developers-portal__card-meta">{mod.version}</div>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default DevelopersModsPage;

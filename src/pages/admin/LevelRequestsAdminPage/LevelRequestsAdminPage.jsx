import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import LevelRequestBrowser from '@/components/requests/LevelRequestBrowser';
import { TYPE_BY_HASH, canViewRequestType } from '@/components/requests/levelRequestShared';
import '@/components/requests/levelRequests.css';

const TABS = [
  ['rerate', 'rerate', 'rerate'],
  ['info_change', 'info', 'info'],
  ['tag', 'tag', 'tag'],
  ['curation', 'curation', 'curation'],
  ['curation_rerate', 'curation-rerate', 'curationRerate'],
];

const LevelRequestsAdminPage = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hash = (location.hash || '#rerate').replace('#', '');
  const type = TYPE_BY_HASH[hash] || 'rerate';
  const visibleTabs = TABS.filter(([value]) => canViewRequestType(user, value));
  const allowed = canViewRequestType(user, type);
  const [openCounts, setOpenCounts] = useState({});
  const refreshOpenCounts = useCallback(() => {
    if (!visibleTabs.length) return;
    api.get(routes.database.levelRequests.openCounts())
      .then((response) => setOpenCounts(response.data?.counts || {}))
      .catch(() => {});
  }, [visibleTabs.length]);

  useEffect(() => {
    refreshOpenCounts();
  }, [refreshOpenCounts]);
  const pageMeta = useMemo(
    () => buildStaticPageMeta({
      title: t('levelRequests.admin.title'),
      description: t('levelRequests.admin.title'),
      pathname: location.pathname,
      noindex: true,
    }),
    [t, location.pathname],
  );

  return (
    <div className="level-requests page-content">
      <MetaTags {...pageMeta} />
      <h1>{t('levelRequests.admin.title')}</h1>
      {visibleTabs.length > 0 && (
        <div className="level-requests__tabs">
          {visibleTabs.map(([value, tabHash, labelKey]) => {
            const label = t(`levelRequests.tabs.${labelKey}`);
            const count = Number(openCounts[value]) || 0;
            const shown = count > 99 ? '99+' : String(count);
            return (
              <button
                key={value}
                type="button"
                className={`level-requests__tab${type === value ? ' level-requests__tab--active' : ''}`}
                onClick={() => navigate(`/admin/requests#${tabHash}`)}
                aria-label={count > 0 ? `${label} (${shown})` : label}
              >
                {label}
                <span
                  className="level-requests__tab-count"
                  style={{visibility: count > 0 ? 'visible' : 'hidden'}}
                  aria-hidden="true"
                >
                  {shown}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {allowed && <LevelRequestBrowser key={type} mode="admin" type={type} onQueueChange={refreshOpenCounts} />}
      {!allowed && <p>{t('levelRequests.admin.denied')}</p>}
    </div>
  );
};

export default LevelRequestsAdminPage;

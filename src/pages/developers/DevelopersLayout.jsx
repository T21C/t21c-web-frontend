// tuf-search: #DevelopersLayout
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MetaTags } from '@/components/common/display';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import './developersPortal.css';

const DevelopersLayout = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  const isMods = location.pathname.startsWith('/developers/mods');

  return (
    <div className="developers-portal">
      <MetaTags
        title={t('developers.meta.title')}
        description={t('developers.meta.description')}
      />
      <header className="developers-portal__top">
        <div className="developers-portal__top-text">
          <h1 className="developers-portal__title">
            {isMods ? t('developers.nav.mods') : t('developers.nav.apps')}
          </h1>
        </div>
        <nav className="developers-portal__nav" aria-label={t('developers.navAria')}>
          <NavLink
            to="/developers"
            end
            className={() =>
              `developers-portal__nav-link${isMods ? '' : ' developers-portal__nav-link--active'}`
            }
          >
            {t('developers.nav.apps')}
          </NavLink>
          <NavLink
            to="/developers/mods"
            className={() =>
              `developers-portal__nav-link${isMods ? ' developers-portal__nav-link--active' : ''}`
            }
          >
            {t('developers.nav.mods')}
          </NavLink>
          {isAdmin ? (
            <NavLink to="/admin/oauth-clients" className="developers-portal__nav-link">
              {t('developers.nav.admin')}
            </NavLink>
          ) : null}
          {!isMods ? (
            <NavLink
              to="/developers/apps/new"
              className={({ isActive }) =>
                `developers-portal__nav-link developers-portal__nav-link--primary${
                  isActive ? ' developers-portal__nav-link--active' : ''
                }`
              }
            >
              {t('developers.create')}
            </NavLink>
          ) : null}
        </nav>
      </header>
      <Outlet />
    </div>
  );
};

export default DevelopersLayout;

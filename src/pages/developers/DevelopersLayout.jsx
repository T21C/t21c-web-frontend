// tuf-search: #DevelopersLayout
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MetaTags } from '@/components/common/display';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import './developersPortal.css';

const DevelopersLayout = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const isAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);

  return (
    <div className="developers-portal">
      <MetaTags
        title={t('developers.meta.title')}
        description={t('developers.meta.description')}
      />
      <header className="developers-portal__top">
        <div className="developers-portal__top-text">
          <h1 className="developers-portal__title">{t('developers.nav.apps')}</h1>
        </div>
        <nav className="developers-portal__nav" aria-label={t('developers.navAria')}>
          {isAdmin ? (
            <NavLink to="/admin/oauth-clients" className="developers-portal__nav-link">
              {t('developers.nav.admin')}
            </NavLink>
          ) : null}
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
        </nav>
      </header>
      <Outlet />
    </div>
  );
};

export default DevelopersLayout;

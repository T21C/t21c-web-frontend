import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { SETTINGS_NAV_GROUPS } from "./settingsNavConfig";
import "./settingsLayout.css";

const SettingsLayout = () => {
  const { t } = useTranslation("pages");
  const { user } = useAuth();

  return (
    <div className="settings-layout">
      <aside className="settings-layout__sidebar">
        <div className="settings-layout__sidebar-head">
          <span className="settings-layout__sidebar-title">{t("settings.layout.sidebarTitle")}</span>
        </div>

        <nav
          className="settings-layout__sidebar-nav"
          aria-label={t("settings.layout.sidebarNavAria")}
        >
          {SETTINGS_NAV_GROUPS.map((group) => {
            const visibleInGroup = group.items.filter(
              (item) => !item.visible || item.visible(user),
            );
            if (!visibleInGroup.length) return null;
            return (
              <div key={group.id} className="settings-layout__nav-group">
                <p className="settings-layout__nav-group-label">{t(group.labelKey)}</p>
                <ul className="settings-layout__nav-list">
                  {visibleInGroup.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={`/settings/${item.path}`}
                        className={({ isActive }) =>
                          [
                            "settings-layout__nav-link",
                            isActive ? "settings-layout__nav-link--active" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")
                        }
                        end
                        title={t(item.labelKey)}
                        aria-label={t(item.labelKey)}
                      >
                        <span className="settings-layout__nav-link-text">
                          {t(item.shortLabelKey)}
                        </span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="settings-layout__main">
        <div className="settings-layout__main-inner page-content-70rem">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default SettingsLayout;

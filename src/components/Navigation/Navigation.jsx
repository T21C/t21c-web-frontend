/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import "./navigation.css";
import React, { useState, useContext, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/tuf-logo/logo-full.png";
import { useTranslation } from "react-i18next";
import { UserContext } from "../../contexts/UserContext";
import i18next from 'i18next';
import { isoToEmoji } from "../../Repository/RemoteRepository";
import { useAuth } from "../../contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";

const Navigation = ({ children }) => {
  const { t } = useTranslation();
  const [openNav, setOpenNav] = useState(false);
  const { language, setLanguage } = useContext(UserContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { displayCount, totalNotifications } = useNotification();
  const languages = {
    us: { display: "English (us)", countryCode: "us" },
    kr: { display: "한국어 (ko)", countryCode: "kr" },
    cn: { display: "中文 (zh)", countryCode: "cn" },
    id: { display: "Bahasa Indonesia (id)", countryCode: "id" },
    ru: { display: "Русский (ru)", countryCode: "ru" },
    de: { display: "Deutsch (de)", countryCode: "de" }
  };

  useEffect(() => {
    const isAdminPath = location.pathname.startsWith('/admin');
    setIsAdminView(isAdminPath && isSuperAdmin);
  }, [location]);

  useEffect(() => {
    setOpenNav(false);
  }, [location]);

  function changeNavState() {
    setOpenNav(!openNav);
  }

  function changeDialogState() {
    setOpenDialog(!openDialog);
  }

  function handleChangeLanguage(newLanguage) {
    i18next.changeLanguage(newLanguage).then(() => {
      setLanguage(newLanguage); 
    });
    changeDialogState();
  }

  const toggleAdminView = () => {
    const newAdminView = !isAdminView;
    navigate(newAdminView ? '/admin/rating' : '/levels');
  };

  return (
    <>
      <div className="close-outer" style={{ display: openNav ? 'block' : 'none' }} onClick={changeNavState}></div>

      <nav className={isAdminView && isSuperAdmin ? 'admin-view' : ''}>
        <div className="wrapper">
          {/* Left side: Logo and main navigation links */}
          <div className="nav-left">
            <div>
              <NavLink
                className={({ isActive }) =>
                  "nav-link " + (isActive ? "active-link" : "")
                }
                to="/"
              >
                <div className="img-container">
                  <img src={logo} alt="logo" />
                </div>
              </NavLink>
            </div>

            <div className="nav-menu">
              <ul>
                {isAdminView ? (
                  // Admin Links
                  <>
                    <NavLink className={({ isActive }) =>
                      "nav-link " + (isActive ? "active-link" : "")}
                      to="/admin/rating">
                      <li>Rating</li>
                    </NavLink>
                    <NavLink className={({ isActive }) =>
                      "nav-link " + (isActive ? "active-link" : "")}
                      to="/admin/submissions">
                      <li>Submissions</li>
                    </NavLink>
                    <NavLink className={({ isActive }) =>
                      "nav-link " + (isActive ? "active-link" : "")}
                      to="/admin/announcements">
                      <li>Announcements</li>
                    </NavLink>
                    
                    <NavLink className={({ isActive }) =>
                        "nav-link " + (isActive ? "active-link" : "")}
                        to="/admin/difficulties">
                        <li>Difficulties</li>
                      </NavLink>
                      <NavLink className={({ isActive }) =>
                        "nav-link " + (isActive ? "active-link" : "")}
                        to="/admin/backups">
                        <li>Backups</li>
                      </NavLink>
                  </>
                ) : (
                  // Regular Links
                  <>
                    <NavLink className={({ isActive }) =>
                      "nav-link " + (isActive ? "active-link" : "")}
                      to="/levels">
                      <li>{t("navigationComponent.levels")}</li>
                    </NavLink>
                    <NavLink className={({ isActive }) =>
                      "nav-link " + (isActive ? "active-link" : "")}
                      to="/leaderboard">
                      <li>{t("navigationComponent.leaderboard")}</li>
                    </NavLink>
                    <NavLink className={({ isActive }) =>
                      "nav-link " + (isActive ? "active-link" : "")}
                      to="/passes">
                      <li>{t("navigationComponent.pass")}</li>
                    </NavLink>
                    {(isAdmin || isSuperAdmin) && (
                    <NavLink className={({ isActive }) =>
                      "nav-link " + (isActive ? "active-link" : "")}
                      to="/admin/rating">
                      <li>Rating</li>
                    </NavLink>
                    )}
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Right side: Language switcher and profile */}
          <div className="nav-right">
            <ul>
              {(isSuperAdmin) && (
                <li onClick={toggleAdminView} style={{cursor: 'pointer'}}>
                  {isAdminView ? "Back" : "Admin"}
                </li>
              )}
              <NavLink
                className={({ isActive }) =>
                  "nav-link " + (isActive ? "active-link" : "")
                }
                to="/submission"
              >
                <li>{t("navigationComponent.submission")}</li>
              </NavLink>
              <li className="nav-language" onClick={changeDialogState}>
                <img className="nav-flag" src={isoToEmoji(language)} alt="" />
                <svg className="language-dropdown svg-stroke" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M7 10L12 15L17 10" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path></g></svg>
              </li>

              {children}  {/* This will include the Profile component */}
            </ul>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="menu svg-stroke"
            onClick={changeNavState}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </div>
      </nav>

      <div className={`nav-menu-outer ${openNav ? "open-nav" : "close-nav"}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="close svg-stroke"
          onClick={changeNavState}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>

        <ul>{children}</ul>
      </div>

      {/* Language Dialog */}
      <div className="close-outer close-outer-language" style={{ 
        display: openDialog ? 'block' : 'none'}} onClick={changeDialogState}></div>
        
      <div className={`language-dialog ${openDialog ? 'dialog-scale-up' : ''}`} style={{ display: openDialog ? 'block' : 'none' }}>
        <div className={"dialog"}>
          <ul>
            {Object.entries(languages).map(([code, { display, countryCode }]) => (
                <li
                  key={code}
                  className="list-language"
                  onClick={() => handleChangeLanguage(code)}
                  style={{ backgroundColor: language === code ? "#a3a2d8" : "" }}
                >
                  <img src={isoToEmoji(countryCode)} alt="" />
                  {display}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navigation;

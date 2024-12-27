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
  const { t } = useTranslation('components');
  const tNav = (key) => t(`navigation.main.${key}`);
  const tLang = (key) => t(`navigation.languages.${key}`);

  const [openNav, setOpenNav] = useState(false);
  const { language, setLanguage } = useContext(UserContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const { isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingRatings, pendingSubmissions } = useNotification();

  const languages = {
    en: { display: "English", countryCode: "us", implemented: true },
    kr: { display: "한국어", countryCode: "kr", implemented: false },
    cn: { display: "中文", countryCode: "cn", implemented: false },
    id: { display: "Bahasa Indonesia", countryCode: "id", implemented: false },
    ru: { display: "Русский", countryCode: "ru", implemented: false },
    de: { display: "Deutsch", countryCode: "de", implemented: false },
    fr: { display: "Français", countryCode: "fr", implemented: false },
    es: { display: "Español", countryCode: "es", implemented: false }
  };

  const getCurrentCountryCode = () => {
    if (language === 'en' || language === 'us') {
      return 'us';
    }
    return languages[language]?.countryCode || language;
  };

  useEffect(() => {
    if (language === 'us') {
      setLanguage('en');
    }
  }, []);

  useEffect(() => {
    const isAdminPath = location.pathname.startsWith('/admin');
    setIsAdminView(isAdminPath && isSuperAdmin);
  }, [location]);

  useEffect(() => {
    setOpenNav(false);
  }, [location]);

  useEffect(() => {
    // Close language select when clicking outside
    function handleClickOutside(event) {
      if (openDialog && !event.target.closest('.nav-language-selector')) {
        setOpenDialog(false);
      }
    }

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDialog]);

  function changeNavState() {
    setOpenNav(!openNav);
  }

  function changeDialogState(e) {
    e.stopPropagation(); // Prevent event from bubbling
    setOpenDialog(!openDialog);
  }

  function handleChangeLanguage(newLanguage, e) {
    e.stopPropagation(); // Prevent event from bubbling
    
    // Only allow changing to implemented languages
    if (!languages[newLanguage].implemented) {
      return;
    }
    
    const i18nLanguage = newLanguage === 'us' ? 'en' : newLanguage;
    i18next.changeLanguage(i18nLanguage).then(() => {
      setLanguage(i18nLanguage);
    });
    setOpenDialog(false);
  }

  const toggleAdminView = () => {
    const newAdminView = !isAdminView;
    navigate(newAdminView ? '/admin/rating' : '/levels');
  };

  return (
    <>
      <div 
        className={`nav-mobile-overlay ${openNav ? 'visible' : ''}`} 
        onClick={changeNavState}
      />

      <nav className={isAdminView && isSuperAdmin ? 'nav--admin' : ''}>
        <div className="nav-wrapper">
          {/* Left side: Logo and main navigation links */}
          <div className="nav-left">
            <NavLink
              className={({ isActive }) =>
                "nav-link " + (isActive ? "active" : "")
              }
              to="/"
            >
              <div className="nav-logo">
                <img src={logo} alt="logo" />
              </div>
            </NavLink>

            <ul className="nav-list">
              {isAdminView ? (
                // Admin Links
                <>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/admin/rating">
                    <li className="nav-list-item">
                      {tNav('links.admin.rating')}
                      {pendingRatings > 0 && (
                        <span className="nav-notification-badge">
                          {pendingRatings > 9 ? tNav('notifications.moreThanNine') : pendingRatings}
                        </span>
                      )}
                    </li>
                  </NavLink>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/admin/submissions">
                    <li className="nav-list-item">
                      {tNav('links.admin.submissions')}
                      {pendingSubmissions > 0 && (
                        <span className="nav-notification-badge">
                          {pendingSubmissions > 9 ? tNav('notifications.moreThanNine') : pendingSubmissions}
                        </span>
                      )}
                    </li>
                  </NavLink>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/admin/announcements">
                    <li className="nav-list-item">{tNav('links.admin.announcements')}</li>
                  </NavLink>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/admin/difficulties">
                    <li className="nav-list-item">{tNav('links.admin.difficulties')}</li>
                  </NavLink>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/admin/backups">
                    <li className="nav-list-item">{tNav('links.admin.backups')}</li>
                  </NavLink>
                </>
              ) : (
                // Regular Links
                <>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/levels">
                    <li className="nav-list-item">{tNav('links.levels')}</li>
                  </NavLink>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/leaderboard">
                    <li className="nav-list-item">{tNav('links.leaderboard')}</li>
                  </NavLink>
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/passes">
                    <li className="nav-list-item">{tNav('links.pass')}</li>
                  </NavLink>
                  {(isAdmin || isSuperAdmin) && (
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/admin/rating">
                    <li className="nav-list-item">
                      {tNav('links.rating')}
                      {pendingRatings > 0 && (
                        <span className="nav-notification-badge">
                          {pendingRatings > 9 ? tNav('notifications.moreThanNine') : pendingRatings}
                        </span>
                      )}
                    </li>
                  </NavLink>
                  )}
                </>
              )}
            </ul>
          </div>

          {/* Right side: Language switcher and profile */}
          <ul className="nav-list">
            {isSuperAdmin && (
              <li className="nav-list-item" onClick={toggleAdminView}>
                {isAdminView ? tNav('links.admin.back') : tNav('links.admin.admin')}
              </li>
            )}
            <NavLink
              className={({ isActive }) =>
                "nav-link " + (isActive ? "active" : "")
              }
              to="/submission"
            >
              <li className="nav-list-item">{tNav('links.submission')}</li>
            </NavLink>
            
            <li className={`nav-language-selector ${openDialog ? 'open' : ''}`}>
              <div className="nav-language-selector__button" onClick={changeDialogState}>
                <img 
                  className="nav-language-selector__flag" 
                  src={isoToEmoji(getCurrentCountryCode())} 
                  alt={languages[language]?.display || ''} 
                />
                <svg className="nav-language-selector__arrow svg-stroke" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 10L12 15L17 10" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className={`nav-language-select ${openDialog ? 'open' : ''}`}>
                <ul className="nav-language-select__list">
                  {Object.entries(languages).map(([code, { display, countryCode, implemented }]) => (
                    <li
                      key={code}
                      className={`nav-language-select__option ${
                        !implemented ? 'not-implemented' : ''
                      } ${
                        (language === code || (language === 'en' && code === 'us')) ? 'selected' : ''
                      }`}
                      onClick={(e) => handleChangeLanguage(code, e)}
                    >
                      <img 
                        className="nav-language-select__option-flag" 
                        src={isoToEmoji(countryCode)} 
                        alt={display} 
                      />
                      <div className="nav-language-select__option-content">
                        <span>{display}</span>
                        {!implemented && (
                          <span className="nav-language-select__option-status">
                            {tLang('comingSoon')}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </li>

            {children}
          </ul>

          <svg
            className="nav-mobile-menu svg-stroke"
            onClick={changeNavState}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </div>
      </nav>

      <div className={`nav-mobile ${openNav ? "open" : ""}`}>
        <svg
          className="nav-mobile__close svg-stroke"
          onClick={changeNavState}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18 18 6M6 6l12 12"
          />
        </svg>

        <ul className="nav-mobile__list">
          {children}
        </ul>
      </div>
    </>
  );
};

export default Navigation;

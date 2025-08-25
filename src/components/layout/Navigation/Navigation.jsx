/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import "./navigation.css";
import React, { useState, useContext, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "@/assets/tuf-logo/logo-full.png";
import { useTranslation } from "react-i18next";
import { UserContext } from "@/contexts/UserContext";
import i18next from 'i18next';
import { isoToEmoji } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import api from "@/utils/api";
import { permissionFlags } from "@/utils/UserPermissions";
import { hasFlag } from "@/utils/UserPermissions";

const Navigation = ({ children }) => {
  const { t } = useTranslation('components');
  const tNav = (key) => t(`navigation.main.${key}`) || key;
  const tLang = (key) => t(`navigation.languages.${key}`) || key;

  const [openNav, setOpenNav] = useState(false);
  const { language, setLanguage } = useContext(UserContext);
  const [openDialog, setOpenDialog] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { pendingRatings, pendingSubmissions } = useNotification();

  // Language configuration with implementation status
  const [languages, setLanguages] = useState({
    en: { display: "English", countryCode: "us", status: 100 },
    pl: { display: "Polski", countryCode: "pl", status: 0 },
    kr: { display: "한국어", countryCode: "kr", status: 0 },
    cn: { display: "中文", countryCode: "cn", status: 0 },
    id: { display: "Bahasa Indonesia", countryCode: "id", status: 0 },
    jp: { display: "日本語", countryCode: "jp", status: 0 },
    ru: { display: "Русский", countryCode: "ru", status: 0 },
    de: { display: "Deutsch", countryCode: "de", status: 0 },
    fr: { display: "Français", countryCode: "fr", status: 0 },
    es: { display: "Español", countryCode: "es", status: 0 }
  });

  // Fetch language implementation status on mount
  useEffect(() => {
    const fetchLanguageStatus = async () => {
      try {
        const response = await api.get('/v2/utils/languages');
        // The response is already in the correct format, just update the state
        setLanguages(response.data);
      } catch (error) {
        console.error('Error fetching language status:', error);
      }
    };
    
    fetchLanguageStatus();
  }, []);

  // Convert to array and sort
  const sortedLanguages = Object.entries(languages)
    .sort(([keyA, a], [keyB, b]) => {
      // First sort by implementation status (higher first)
      if (a.status !== b.status) {
        return b.status - a.status;
      }
      // Then sort alphabetically by display name
      return a.display.localeCompare(b.display);
    })
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

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
    setIsAdminView(isAdminPath && user && hasFlag(user, permissionFlags.SUPER_ADMIN));
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
    e.stopPropagation();
    
    // Only allow changing to languages with some implementation
    if (languages[newLanguage].status === 0) {
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

      <div className="nav-spacer" />
      
      <nav className={isAdminView && user && hasFlag(user, permissionFlags.SUPER_ADMIN) ? 'nav--admin' : ''}>
        <div className="nav-wrapper">
          {/* Left side: Logo and main navigation links */}
          <div className="nav-left">
            <NavLink
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
                          {pendingRatings > 99 ? "99+" : pendingRatings}
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
                          {pendingSubmissions > 99 ? "99+" : pendingSubmissions}
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
                  {
                    if (location.pathname === '/admin') {
                      return "nav-link active"
                    }
                    return "nav-link"
                  }}
                    to="/admin">
                    <li className="nav-list-item">{tNav('links.admin.dashboard')}</li>
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
                  <NavLink className={({ isActive }) =>
                    "nav-link " + (isActive ? "active" : "")}
                    to="/admin/rating">
                    <li className="nav-list-item">
                      {tNav('links.rating')}
                      {pendingRatings > 0 && (
                        <span className="nav-notification-badge">
                          {pendingRatings > 99 ? "99+" : pendingRatings}
                        </span>
                      )}
                    </li>
                  </NavLink>
                </>
              )}
            </ul>
          </div>

          {/* Right side: Language switcher and profile */}
          <ul className="nav-list">
            {user && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
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
                  {Object.entries(sortedLanguages).map(([code, { display, countryCode, status }]) => (
                    <li
                      key={code}
                      className={`nav-language-select__option ${
                        status === 0 ? 'not-implemented' : ''
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
                        {status === 0 ? (
                          <span className="nav-language-select__option-status">
                            {tLang('comingSoon')}
                          </span>
                        ) : status < 100 ? (
                          <span className="nav-language-select__option-status partially-implemented">
                            {status.toFixed(1)}% ✔
                          </span>
                        ) : (
                          <span className="nav-language-select__option-status fully-implemented">
                            100% ✔
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

          <div className="nav-mobile-controls">
            <div className="nav-language-selector mobile">
              <div className="nav-language-selector__button" onClick={changeDialogState}>
                <img 
                  className="nav-language-selector__flag" 
                  src={isoToEmoji(getCurrentCountryCode())} 
                  alt={languages[language]?.display || ''} 
                />
              </div>
            </div>

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
        </div>
      
      </nav>

      <div className={`nav-mobile ${openNav ? "open" : ""}`}>

      <div className={`nav-language-select ${openDialog ? 'open' : ''}`}>
        <ul className="nav-language-select__list">
          {Object.entries(sortedLanguages).map(([code, { display, countryCode, status }]) => (
            <li
              key={code}
              className={`nav-language-select__option ${
                status === 0 ? 'not-implemented' : ''
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
                {status === 0 ? (
                  <span className="nav-language-select__option-status">
                    {tLang('comingSoon')}
                  </span>
                ) : status < 100 ? (
                  <span className="nav-language-select__option-status">
                    {status.toFixed(1)}% ✔
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
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
          {isAdminView ? (
            // Admin Links for mobile
            <>
              <li className="nav-list-item">
                <NavLink to="/" onClick={changeNavState}>
                  {tNav('links.home')}
                </NavLink>
              </li>
              <li className="nav-list-item">
                <NavLink to="/admin/rating" onClick={changeNavState}>
                  {tNav('links.admin.rating')}
                </NavLink>
                {pendingRatings > 0 && (
                  <span className="nav-notification-badge">
                    {pendingRatings > 99 ? "99+" : pendingRatings}
                  </span>
                )}
              </li>
              <li className="nav-list-item">
                <NavLink to="/admin/submissions" onClick={changeNavState}>
                  {tNav('links.admin.submissions')}
                </NavLink>
                {pendingSubmissions > 0 && (
                  <span className="nav-notification-badge">
                    {pendingSubmissions > 99 ? "99+" : pendingSubmissions}
                  </span>
                )}
              </li>
              <li className="nav-list-item">
                <NavLink to="/admin/announcements" onClick={changeNavState}>
                  {tNav('links.admin.announcements')}
                </NavLink>
              </li>
              <li className="nav-list-item">
                <NavLink to="/admin" onClick={changeNavState}>
                  {tNav('links.admin.dashboard')}
                </NavLink>
              </li>
            </>
          ) : (
            // Regular Links for mobile
            <>
              <li className="nav-list-item">
                <NavLink to="/" onClick={changeNavState}>
                  {tNav('links.home')}
                </NavLink>
              </li>
              <li className="nav-list-item">
                <NavLink to="/levels" onClick={changeNavState}>
                  {tNav('links.levels')}
                </NavLink>
              </li>
              <li className="nav-list-item">
                <NavLink to="/leaderboard" onClick={changeNavState}>
                  {tNav('links.leaderboard')}
                </NavLink>
              </li>
              <li className="nav-list-item">
                <NavLink to="/passes" onClick={changeNavState}>
                  {tNav('links.pass')}
                </NavLink>
              </li>
                <li className="nav-list-item">
                  <NavLink to="/admin/rating" onClick={changeNavState}>
                    {tNav('links.rating')}
                  </NavLink>
                  {pendingRatings > 0 && (
                    <span className="nav-notification-badge">
                      {pendingRatings > 99 ? "99+" : pendingRatings}
                    </span>
                  )}
                </li>
            </>
          )}
          <li className="nav-list-item">
            <NavLink to="/submission" onClick={changeNavState}>
              {tNav('links.submission')}
            </NavLink>
          </li>
        </ul>
      </div>
      
    </>
  );
};

export default Navigation;

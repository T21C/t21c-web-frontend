/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import "./navigation.css";
import React, { useState, useContext } from "react";
import { NavLink } from "react-router-dom";
import logo from "../../assets/tuf-logo/logo-full.png";
import { useTranslation } from "react-i18next";
import { UserContext } from "../../context/UserContext";
import i18next from 'i18next';
import { isoToEmoji } from "../../Repository/RemoteRepository";

const Navigation = ({ children }) => {
  const { t } = useTranslation();
  const [openNav, setOpenNav] = useState(false);
  const { language, setLanguage } = useContext(UserContext);
  const [openDialog, setOpenDialog] = useState(false);

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

  return (
    <>
      <div className="close-outer" style={{ display: openNav ? 'block' : 'none' }} onClick={changeNavState}></div>

      <nav>
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
                <NavLink
                  className={({ isActive }) =>
                    "nav-link " + (isActive ? "active-link" : "")
                  }
                  to="/levels"
                >
                  <li>{t("navigationComponent.levels")}</li>
                </NavLink>


                
                <NavLink
                  className={({ isActive }) =>
                    "nav-link " + (isActive ? "active-link" : "")
                  }
                  to="/leaderboard"
                >
                  <li>{t("navigationComponent.leaderboard")}</li>
                </NavLink>
              </ul>
            </div>
          </div>

          {/* Right side: Language switcher and profile */}
          <div className="nav-right">
            <ul>
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
            <li className="list-language" onClick={() => handleChangeLanguage("us")} style={{ backgroundColor: language === "us" ? "#a3a2d8" : "" }}> 
              <img src={isoToEmoji("us")} alt="" />
              English (en)
            </li>
            <li className="list-language" onClick={() => handleChangeLanguage("kr")} style={{ backgroundColor: language === "kr" ? "#a3a2d8" : "" }}>
              <img src={isoToEmoji("kr")} alt="" />
              한국어 (ko)
            </li>
            <li className="list-language" onClick={() => handleChangeLanguage("cn")} style={{ backgroundColor: language === "cn" ? "#a3a2d8" : "" }}>
              <img src={isoToEmoji("cn")} alt="" />
              中文 (zh)
            </li>
            <li className="list-language" onClick={() => handleChangeLanguage("id")} style={{ backgroundColor: language === "id" ? "#a3a2d8" : "" }}>
              <img src={isoToEmoji("id")} alt="" />
              Bahasa Indonesia (id)
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navigation;

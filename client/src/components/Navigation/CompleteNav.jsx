/* eslint-disable no-unused-vars */
import "./navigation.css"
import React, { useContext, useEffect, useState } from "react";
import Navigation from "./Navigation";
import { NavLink } from "react-router-dom";
import i18next from 'i18next';
import { isoToEmoji } from "../../Repository/RemoteRepository";
import { UserContext } from "../../context/UserContext";
import { useTranslation } from "react-i18next";
import Profile from "../Profile/Profile";
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from "axios";

const CompleteNav = () => {
  const {t} = useTranslation()
  const [openDialog, setOpenDialog] = useState(false)

  function changeDialogState(){
    setOpenDialog(!openDialog)
  }

  const {language, setLanguage} = useContext(UserContext)

  function handleChangeLanguage(newLanguage) {
    i18next.changeLanguage(newLanguage).then(() => {
      setLanguage(newLanguage); 
    });
    changeDialogState()
  }
 
  return (

    <>
        <div className="close-outer close-outer-language" style={{ 
          display: openDialog ? 'block' : 'none'}} onClick={changeDialogState}></div>
          
          <div className={`language-dialog ${openDialog ? 'dialog-scale-up' : ''}`} style={{ display: openDialog ? 'block' : 'none' }}>
            <div className={"dialog"}>
              <ul>
                <li className="list-language" onClick={() => handleChangeLanguage("us")} style={{ backgroundColor: language === "us" ? "#a3a2d8" : "" }}> 
                  <img src={isoToEmoji("us")}  alt="" />
                  English (en)
                </li>
                <li className="list-language" onClick={() => handleChangeLanguage("kr")} style={{ backgroundColor: language === "kr" ? "#a3a2d8" : "" }}>
                  <img src={isoToEmoji("kr")}  alt="" />
                  한국어 (ko)
                </li>
                <li className="list-language" onClick={() => handleChangeLanguage("cn")} style={{ backgroundColor: language === "cn" ? "#a3a2d8" : "" }}>
                  <img src={isoToEmoji("cn")}  alt="" />
                  中文 (zh)
                </li>
                {/* <li className="list-language" onClick={() => handleChangeLanguage("de")} style={{ backgroundColor: language === "de" ? "#a3a2d8" : "" }}>
                  <img src={isoToEmoji("de")}  alt="" />
                  German
                </li> */}
                <li className="list-language" onClick={() => handleChangeLanguage("id")} style={{ backgroundColor: language === "id" ? "#a3a2d8" : "" }}>
                  <img src={isoToEmoji("id")}  alt="" />
                  Bahasa Indonesia (id)
                </li>
              </ul>
          </div>
        </div>

      <Navigation>

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
          to="/submission"
        >
          <li>{t("navigationComponent.submission")}</li>
        </NavLink>

        <li className="nav-language" onClick={changeDialogState}>
            <img className="nav-flag" src={isoToEmoji(language)} alt="" />
            <svg className="language-dropdown svg-stroke" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M7 10L12 15L17 10" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
        </li>

        
        <Profile />
        

        {/* <NavLink
          className={({ isActive }) =>
            "nav-link " + (isActive ? "active-link" : "")
          }
          to="/leaderboard"
        >
          <li>UNAV</li>
        </NavLink> */}

      </Navigation>
    </>
  );
};

export default CompleteNav;

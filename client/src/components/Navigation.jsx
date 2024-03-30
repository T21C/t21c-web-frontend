/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const Navigation = ({ children }) => {
  const [openNav, setOpenNav] = useState(false);

  function changeNavState() {
    setOpenNav(!openNav);
  }
  return (
    <>
      <nav>
        <div className="wrapper">
          <div>
            <NavLink
              className={({ isActive }) =>
                "nav-link " + (isActive ? "active-link" : "")
              }
              to="/"
            >
              <img src="https://media.discordapp.net/attachments/1217150553231069275/1217150991791689810/image.png?ex=66157032&is=6602fb32&hm=cf735a44c4dfb53bc2be56f6ae8a18ece5d9c0035bd535ad4665a9e3506d656a&=&format=webp&quality=lossless" alt="" style={{ width: '2rem', height: '2rem', objectFit:"cover", borderRadius:"1rem"}} />
            </NavLink>

          </div>

          <div className="nav-menu">
            <ul>{children}</ul>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className=""
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
          className="close"
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
    </>
  );
};

export default Navigation;

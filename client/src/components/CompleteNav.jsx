/* eslint-disable no-unused-vars */
import React from "react";
import Navigation from "./Navigation";
import { NavLink } from "react-router-dom";

const CompleteNav = () => {
  return (
    <Navigation>
      <NavLink
        className={({ isActive }) =>
          "nav-link " + (isActive ? "active-link" : "")
        }
        to="/levels"
      >
        <li>Levels</li>
      </NavLink>

      {/* <NavLink
        className={({ isActive }) =>
          "nav-link " + (isActive ? "active-link" : "")
        }
        to="/leaderboard"
      >
        <li>UNAV</li>
      </NavLink> */}

    </Navigation>
  );
};

export default CompleteNav;

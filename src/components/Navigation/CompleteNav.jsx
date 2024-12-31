/* eslint-disable no-unused-vars */
import "./navigation.css";
import React from "react";
import Navigation from "./Navigation";
import Profile from "../Profile/Profile";

const CompleteNav = () => {
  return (
    <Navigation>
      <Profile />
    </Navigation>
  );
};

export default CompleteNav;

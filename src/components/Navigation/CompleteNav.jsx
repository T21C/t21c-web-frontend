/* eslint-disable no-unused-vars */
import "./navigation.css";
import React from "react";
import Navigation from "./Navigation";
import Profile from "../Profile/Profile";

const CompleteNav = () => {
  return (
    <Navigation>
      {/* Profile component will remain on the right side */}
      <Profile />
    </Navigation>
  );
};

export default CompleteNav;

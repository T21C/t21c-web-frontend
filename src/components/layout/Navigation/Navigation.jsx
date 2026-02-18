/* eslint-disable react/prop-types */
import "./navigation.css";
import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import LogoFullOutlineSVG from "@/assets/tuf-logo/LogoFullOutlined/LogoFullOutlined";
import NavDropdown from "./NavDropdown";
import NavLinkItem from "./NavLinkItem";
import LanguageSelector from "./LanguageSelector";
import UserMenu from "./UserMenu";
import MobileMenu from "./MobileMenu";
import { createNavigationConfig } from "./navigationConfig";

const Navigation = ({ children, config: externalConfig = null }) => {
  const { t } = useTranslation("components");

  const [openNav, setOpenNav] = useState(false);
  const { user, initiateLogin } = useAuth();
  const location = useLocation();
  const navSpacerRef = useRef(null);

  // Create navigation config from external config or generate from context
  const config = externalConfig || createNavigationConfig({ user, location });

  // Update global --navbar-height so other elements can use calc(100vh - var(--navbar-height))
  useEffect(() => {
    const el = navSpacerRef.current;
    if (!el) return;

    const setNavbarHeight = () => {
      const height = el.getBoundingClientRect().height;
      console.log("navbar height", height);
      document.documentElement.style.setProperty("--navbar-height", `${height}px`);
    };

    setNavbarHeight();
    const observer = new ResizeObserver(setNavbarHeight);
    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Close mobile nav when location changes
  useEffect(() => {
    setOpenNav(false);
  }, [location]);

  // Close mobile nav when viewport crosses threshold (580px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 580 && openNav) {
        setOpenNav(false);
      }
    };

    window.addEventListener("resize", handleResize);
    // Check on mount in case viewport is already above threshold
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [openNav]);

  const toggleMobileNav = () => {
    setOpenNav(!openNav);
  };

  // Render navigation item based on type
  const renderNavItem = (item, index) => {
    // Check condition if present
    if (item.condition && !item.condition()) {
      // Use fallback if available
      if (item.fallback) {
        return renderNavItem(item.fallback, index);
      }
      return null;
    }

    switch (item.type) {
      case "link":
        return (
          <NavLinkItem
            key={item.to || index}
            to={item.to}
            label={item.translationKey}
            className={item.className}
            linkClassName={item.linkClassName}
          />
        );

      case "dropdown":
        return (
          <NavDropdown
            key={item.label || index}
            label={t(item.label)}
            items={item.items}
            isActive={item.isActive}
            className={item.className}
            showAsLink={item.showAsLink}
            linkTo={item.linkTo}
          />
        );

      case "button":
        const onClickHandler = item.onClick
          ? item.onClick(initiateLogin)
          : undefined;
        return (
          <button
            key={item.translationKey || index}
            className={item.className || "nav-signin-button"}
            onClick={onClickHandler}
          >
            {t(item.translationKey)}
          </button>
        );

      case "component":
        switch (item.component) {
          case "LanguageSelector":
            return (
              <LanguageSelector
                key="language-selector"
                {...item.props}
              />
            );

          case "UserMenu":
            return (
              <UserMenu
                key="user-menu"
                isActive={item.props?.isActive}
              />
            );

          default:
            return null;
        }

      default:
        return null;
    }
  };

  return (
    <>
      <div className="nav-spacer" />

      <nav ref={navSpacerRef}>
        <div className="nav-wrapper">
          {/* Left side: Logo and main navigation links */}
          <div className="nav-left">
            <NavLink to={config.logo.to} className="nav-logo-link">
              <div className="nav-logo">
                {config.logo.component || (
                  <LogoFullOutlineSVG strokeWidth={16} strokeColor="#fffb" />
                )}
              </div>
            </NavLink>

            <ul className="nav-list">
              {config.leftNav.map((item, index) => renderNavItem(item, index))}
            </ul>
          </div>

          {/* Right side: Submit, Language, Profile */}
          <div className="nav-right">
            {config.rightNav.map((item, index) => renderNavItem(item, index))}
            {children}
          </div>

          {/* Mobile Menu Button */}
          <div className="nav-mobile-controls">
            <LanguageSelector
              variant="mobile"
              asListItem={false}
            />

            <svg
              className="nav-mobile-menu svg-stroke"
              onClick={toggleMobileNav}
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

      {/* Mobile Navigation Menu */}
      <MobileMenu
        isOpen={openNav}
        onClose={toggleMobileNav}
        config={config}
        initiateLogin={initiateLogin}
      >
        {children}
      </MobileMenu>
    </>
  );
};

export default Navigation;

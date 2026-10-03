// tuf-search: #LanguageSelector #languageSelector #layout #navigation
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { isoToEmoji } from "@/utils";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import "./languageSelector.css";
import { useTranslation } from "react-i18next";
import { changeAppLanguage, normalizeLanguage } from "@/translations/config";
import {
  DEFAULT_SITE_LANGUAGE_OPTIONS,
  languageCompletionLabel,
  normalizeSiteLanguageOptions,
  sortSiteLanguageEntries,
} from "@/utils/siteLanguageOptions";
import { useFinePointer } from "@/hooks/useFinePointer";
import { useSubmissionMinimalMotion } from "@/hooks/useMinimalMotionPreference";
import { useNavHoverMenu } from "../useNavHoverMenu";
import { NavDropdownPanel } from "../NavDropdown/NavDropdown";
import MobileDropdown from "../MobileDropdown/MobileDropdown";

const LanguageSelector = ({
  variant = "desktop",
  open: openProp,
  onOpenChange,
  onItemClick,
}) => {
  const { t, i18n } = useTranslation("components");
  const [languages, setLanguages] = useState(DEFAULT_SITE_LANGUAGE_OPTIONS);
  const isFinePointer = useFinePointer();
  const reducedMotion = useSubmissionMinimalMotion();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const menu = useNavHoverMenu({
    reducedMotion,
    enabled: variant === "desktop" && isFinePointer,
    rootRef,
  });
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    const fetchLanguageStatus = async () => {
      try {
        const response = await api.get(routes.utils.languages());
        setLanguages(normalizeSiteLanguageOptions(response.data));
      } catch (error) {
        console.error("Error fetching language status:", error);
        setLanguages(DEFAULT_SITE_LANGUAGE_OPTIONS);
      }
    };

    fetchLanguageStatus();
  }, []);

  const sortedLanguages = sortSiteLanguageEntries(languages);

  const getCurrentCountryCode = () => {
    if (language === "en" || language === "us") return "us";
    return languages[language]?.countryCode || language;
  };

  const handleChangeLanguage = async (newLanguage) => {
    if (!languages[newLanguage] || languages[newLanguage].status === 0) {
      return;
    }
    await changeAppLanguage(newLanguage);
    menu.closeNow();
    onItemClick?.();
  };

  const currentLanguage = languages[language]?.display || "Language";

  const languageItems = [
    ...sortedLanguages.map(([code, { display, countryCode, status }]) => ({
      disabled: status === 0,
      className:
        language === code || (language === "en" && code === "us")
          ? "selected"
          : "",
      onClick: () => handleChangeLanguage(code),
      content: (
        <>
          <img
            className="nav-language-select__option-flag"
            src={isoToEmoji(countryCode)}
            alt={display}
          />
          <div className="nav-language-select__option-content">
            <span>{display}</span>
            <span className="nav-mobile-lang-status">
              {languageCompletionLabel(status, t)}
            </span>
          </div>
        </>
      ),
    })),
    {
      to: "/translation",
      translationKey: "navigation.languages.helpTranslate",
    },
  ];

  if (variant === "mobile") {
    const buttonContent = (
      <span className="nav-mobile-user-button-content">
        <img
          className="nav-language-selector__flag"
          src={isoToEmoji(getCurrentCountryCode())}
          alt={currentLanguage}
        />
        <span className="nav-mobile-dropdown-label">{currentLanguage}</span>
      </span>
    );

    return (
      <MobileDropdown
        label={currentLanguage}
        buttonContent={buttonContent}
        items={languageItems}
        open={Boolean(openProp)}
        onOpenChange={onOpenChange}
        onItemClick={onItemClick}
      />
    );
  }

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      menu.open();
      requestAnimationFrame(() => {
        panelRef.current
          ?.querySelector(
            ".nav-dropdown-item:not(.nav-dropdown-item--disabled)",
          )
          ?.focus();
      });
    }
    if (event.key === "Escape") {
      event.preventDefault();
      menu.dismiss();
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      className={`nav-language-selector nav-dropdown ${menu.isOpen ? "open" : ""} ${menu.isPinned ? "pinned" : ""}`}
      ref={rootRef}
      onMouseEnter={menu.scheduleOpen}
      onMouseLeave={menu.scheduleClose}
      onBlur={menu.handleRootBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className="nav-language-selector__button"
        aria-expanded={menu.isOpen}
        aria-haspopup="menu"
        aria-controls={menu.panelId}
        onClick={menu.handleTriggerClick}
        onFocus={() => {
          if (isFinePointer) menu.open();
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <img
          className="nav-language-selector__flag"
          src={isoToEmoji(getCurrentCountryCode())}
          alt={currentLanguage}
        />
      </button>
      {menu.isVisible && (
        <NavDropdownPanel
          id={menu.panelId}
          phase={menu.phase}
          zIndex={menu.zIndex}
          align="right"
          reducedMotion={reducedMotion}
          onCloseAnimationEnd={menu.handleCloseAnimationEnd}
          panelRef={panelRef}
        >
          {sortedLanguages.map(([code, { display, countryCode, status }]) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              className={`nav-dropdown-item nav-dropdown-item--button nav-language-select__option ${
                status === 0 ? "not-implemented" : ""
              } ${
                language === code || (language === "en" && code === "us")
                  ? "selected"
                  : ""
              }`}
              disabled={status === 0}
              onClick={() => handleChangeLanguage(code)}
            >
              <img
                className="nav-language-select__option-flag"
                src={isoToEmoji(countryCode)}
                alt={display}
              />
              <div className="nav-language-select__option-content">
                <span>{display}</span>
                <span className="nav-mobile-lang-status">
                  {languageCompletionLabel(status, t)}
                </span>
              </div>
            </button>
          ))}
          <HelpTranslateItem t={t} onClick={menu.closeNow} />
        </NavDropdownPanel>
      )}
    </div>
  );
};

function HelpTranslateItem({ t, onClick }) {
  return (
    <NavLink
      to="/translation"
      role="menuitem"
      className="nav-dropdown-item"
      onClick={onClick}
    >
      {t("navigation.languages.helpTranslate")}
    </NavLink>
  );
}

export default LanguageSelector;

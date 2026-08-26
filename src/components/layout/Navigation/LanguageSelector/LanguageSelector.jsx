// tuf-search: #LanguageSelector #languageSelector #layout #navigation
import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { isoToEmoji } from "@/utils";
import api from "@/utils/api";
import { routes } from "@/api/routes";
import "./languageSelector.css";
import { useTranslation } from "react-i18next";
import { changeAppLanguage, normalizeLanguage } from "@/translations/config";
import { useFinePointer } from "@/hooks/useFinePointer";
import { useSubmissionMinimalMotion } from "@/hooks/useMinimalMotionPreference";
import { useNavHoverMenu } from "../useNavHoverMenu";
import { NavDropdownPanel } from "../NavDropdown/NavDropdown";
import MobileDropdown from "../MobileDropdown/MobileDropdown";

const DEFAULT_LANGUAGES = {
  en: { display: "English", countryCode: "us", status: 100 },
  pl: { display: "Polski", countryCode: "pl", status: 0 },
  kr: { display: "한국어", countryCode: "kr", status: 0 },
  cn: { display: "中文", countryCode: "cn", status: 0 },
  id: { display: "Bahasa Indonesia", countryCode: "id", status: 0 },
  jp: { display: "日本語", countryCode: "jp", status: 0 },
  ru: { display: "Русский", countryCode: "ru", status: 0 },
  de: { display: "Deutsch", countryCode: "de", status: 0 },
  fr: { display: "Français", countryCode: "fr", status: 0 },
  es: { display: "Español", countryCode: "es", status: 0 },
};

function normalizeLanguageOptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_LANGUAGES;
  }

  return Object.entries(DEFAULT_LANGUAGES).reduce((options, [code, fallback]) => {
    const next = value[code];
    options[code] =
      next && typeof next === "object"
        ? {
            display:
              typeof next.display === "string" && next.display.trim()
                ? next.display
                : fallback.display,
            countryCode:
              typeof next.countryCode === "string" && next.countryCode.trim()
                ? next.countryCode
                : fallback.countryCode,
            status: Number.isFinite(Number(next.status))
              ? Number(next.status)
              : fallback.status,
          }
        : fallback;
    return options;
  }, {});
}

function languageStatusLabel(status, t) {
  if (status === 0) return t("navigation.languages.comingSoon");
  if (status < 100) return `${status.toFixed(1)}%`;
  return "100%";
}

const LanguageSelector = ({
  variant = "desktop",
  open: openProp,
  onOpenChange,
  onItemClick,
}) => {
  const { t, i18n } = useTranslation("components");
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const isFinePointer = useFinePointer();
  const reducedMotion = useSubmissionMinimalMotion();
  const menu = useNavHoverMenu({
    reducedMotion,
    enabled: variant === "desktop" && isFinePointer,
  });
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  useEffect(() => {
    const fetchLanguageStatus = async () => {
      try {
        const response = await api.get(routes.utils.languages());
        setLanguages(normalizeLanguageOptions(response.data));
      } catch (error) {
        console.error("Error fetching language status:", error);
        setLanguages(DEFAULT_LANGUAGES);
      }
    };

    fetchLanguageStatus();
  }, []);

  const sortedLanguages = Object.entries(languages).sort(([, a], [, b]) => {
    if (a.status !== b.status) return b.status - a.status;
    return a.display.localeCompare(b.display || "");
  });

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
              {languageStatusLabel(status, t)}
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
      menu.close();
      triggerRef.current?.focus();
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (menu.isOpen) menu.close();
      else menu.open();
    }
  };

  const handleRootBlur = (event) => {
    const next = event.relatedTarget;
    if (rootRef.current && next && rootRef.current.contains(next)) return;
    menu.close();
  };

  return (
    <div
      className={`nav-language-selector nav-dropdown ${menu.isOpen ? "open" : ""}`}
      ref={rootRef}
      onMouseEnter={menu.scheduleOpen}
      onMouseLeave={menu.scheduleClose}
      onBlur={handleRootBlur}
    >
      <button
        ref={triggerRef}
        type="button"
        className="nav-language-selector__button"
        aria-expanded={menu.isOpen}
        aria-haspopup="menu"
        aria-controls={menu.panelId}
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
                  {languageStatusLabel(status, t)}
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

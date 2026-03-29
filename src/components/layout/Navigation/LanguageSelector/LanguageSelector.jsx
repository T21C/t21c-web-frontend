import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getPortalRoot } from "@/utils/portalRoot";
import { isoToEmoji } from "@/utils";
import api from "@/utils/api";
import { ChevronIcon } from "@/components/common/icons";
import "./languageSelector.css";
import { useTranslation } from 'react-i18next';
import { changeAppLanguage, normalizeLanguage } from "@/translations/config";

/**
 * Language selector component
 * @param {Object} props
 * @param {string} props.variant - 'desktop' or 'mobile'
 * @param {boolean} props.asListItem - Whether to render as list item (default: true for mobile)
 */
const LanguageSelector = ({ variant = "desktop", asListItem = null }) => {
  const { t, i18n } = useTranslation('components');
  const [isOpen, setIsOpen] = useState(false);
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
    es: { display: "Español", countryCode: "es", status: 0 },
  });

  const dropdownRef = useRef(null);
  const portalRef = useRef(null);
  const language = normalizeLanguage(i18n.resolvedLanguage || i18n.language);

  // Fetch language implementation status on mount
  useEffect(() => {
    const fetchLanguageStatus = async () => {
      try {
        const response = await api.get("/v2/utils/languages");
        setLanguages(response.data);
      } catch (error) {
        console.error("Error fetching language status:", error);
      }
    };

    fetchLanguageStatus();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      const clickedInsideTrigger =
        dropdownRef.current && dropdownRef.current.contains(event.target);
      const clickedInsidePortal =
        portalRef.current && portalRef.current.contains(event.target);

      if (!clickedInsideTrigger && !clickedInsidePortal) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Convert to array and sort
  const sortedLanguages = Object.entries(languages)
    .sort(([keyA, a], [keyB, b]) => {
      if (a.status !== b.status) {
        return b.status - a.status;
      }
      return a.display.localeCompare(b.display);
    })
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});

  const getCurrentCountryCode = () => {
    if (language === "en" || language === "us") {
      return "us";
    }
    return languages[language]?.countryCode || language;
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleChangeLanguage = async (newLanguage, e) => {
    e.stopPropagation();

    if (languages[newLanguage].status === 0) {
      return;
    }

    await changeAppLanguage(newLanguage);
    setIsOpen(false);
  };

  const isMobile = variant === "mobile";
  const currentLanguage = languages[language]?.display || "Language";
  // Default to true for mobile if not specified, false for desktop
  const renderAsListItem = asListItem !== null ? asListItem : isMobile;

  // Render mobile dropdown content
  const mobileDropdownContent = isOpen && isMobile ? (
    <div className="nav-language-select mobile open" ref={portalRef}>
      <ul className="nav-language-select__list">
        {Object.entries(sortedLanguages).map(
          ([code, { display, countryCode, status }]) => (
            <li
              key={code}
              className={`nav-language-select__option ${
                status === 0 ? "not-implemented" : ""
              } ${
                language === code || (language === "en" && code === "us")
                  ? "selected"
                  : ""
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
                    {t("navigation.languages.comingSoon")}
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
          )
        )}
      </ul>
    </div>
  ) : null;

  if (isMobile) {
    const buttonContent = (
      <button className="nav-language-selector__button" onClick={handleToggle}>
        <img
          className="nav-language-selector__flag"
          src={isoToEmoji(getCurrentCountryCode())}
          alt={currentLanguage}
        />
        {renderAsListItem && <span>{currentLanguage}</span>}
        {renderAsListItem && (
          <ChevronIcon
            direction={isOpen ? "up" : "down"}
            className="nav-language-selector__arrow"
            size={16}
          />
        )}
      </button>
    );

    if (renderAsListItem) {
      return (
        <>
          <li
            className={`nav-list-item nav-language-selector-mobile`}
            ref={dropdownRef}
          >
            {buttonContent}
          </li>

          {mobileDropdownContent &&
            createPortal(mobileDropdownContent, getPortalRoot())}
        </>
      );
    } else {
      // Standalone button for navbar controls
      return (
        <>
          <div
            className={`nav-language-selector mobile`}
            ref={dropdownRef}
          >
            {buttonContent}
          </div>

          {mobileDropdownContent &&
            createPortal(mobileDropdownContent, getPortalRoot())}
        </>
      );
    }
  }

  // Desktop variant
  return (
    <li
      className={`nav-language-selector ${isOpen ? "open" : ""}`}
      ref={dropdownRef}
    >
      <button className="nav-language-selector__button" onClick={handleToggle}>
        <img
          className="nav-language-selector__flag"
          src={isoToEmoji(getCurrentCountryCode())}
          alt={currentLanguage}
        />
      </button>

      {isOpen && (
        <div className="nav-language-select open">
          <ul className="nav-language-select__list">
            {Object.entries(sortedLanguages).map(
              ([code, { display, countryCode, status }]) => (
                <li
                  key={code}
                  className={`nav-language-select__option ${
                    status === 0 ? "not-implemented" : ""
                  } ${
                    language === code || (language === "en" && code === "us")
                      ? "selected"
                      : ""
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
                        {t("navigation.languages.comingSoon")}
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
              )
            )}
          </ul>
        </div>
      )}
    </li>
  );
};

export default LanguageSelector;

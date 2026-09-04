// tuf-search: #NavSubmitButton #navSubmitButton #layout #navigation
import React from "react";
import { matchPath, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronIcon, PassIcon } from "@/components/common/icons";

const SUBMIT_BUTTON_CLASS = "nav-submit-button btn-fill-primary alt";

function getLevelDetailId(pathname) {
  const match = matchPath({ path: "/levels/:id", end: true }, pathname);
  return match?.params?.id || null;
}

function passSubmitState(levelId) {
  return {
    form: { levelId: String(levelId) },
    searchInput: String(levelId),
  };
}

function SubmitSplitLinks({ levelId, submitLabel, passLabel, onNavigate }) {
  return (
    <div className="nav-submit-split">
      <NavLink
        className={`nav-link no-active ${SUBMIT_BUTTON_CLASS} nav-submit-split__primary`}
        to="/submission"
        onClick={onNavigate}
      >
        {submitLabel}
      </NavLink>
      <NavLink
        className={`nav-link no-active ${SUBMIT_BUTTON_CLASS} nav-submit-split__secondary`}
        to="/submission/pass"
        state={passSubmitState(levelId)}
        title={passLabel}
        aria-label={passLabel}
        onClick={onNavigate}
      >
        <PassIcon size={16} color="currentColor" />
      </NavLink>
    </div>
  );
}

const NavSubmitButton = ({ variant = "desktop", onNavigate }) => {
  const { t } = useTranslation("components");
  const location = useLocation();
  const levelId = getLevelDetailId(location.pathname);
  const submitLabel = t("navigation.main.links.submission");
  const passLabel = t("navigation.main.links.submitPassForLevel");
  const isMobile = variant === "mobile";

  if (isMobile) {
    if (!levelId) {
      return (
        <li className={`nav-list-item ${SUBMIT_BUTTON_CLASS}`}>
          <NavLink to="/submission" onClick={onNavigate}>
            {submitLabel}
          </NavLink>
        </li>
      );
    }

    return (
      <li className="nav-list-item nav-submit-split-item">
        <SubmitSplitLinks
          levelId={levelId}
          submitLabel={submitLabel}
          passLabel={passLabel}
          onNavigate={onNavigate}
        />
      </li>
    );
  }

  if (!levelId) {
    return (
      <NavLink className="nav-link no-active" to="/submission">
        <li className={`nav-list-item ${SUBMIT_BUTTON_CLASS}`}>{submitLabel}</li>
      </NavLink>
    );
  }

  return (
    <SubmitSplitLinks
      levelId={levelId}
      submitLabel={submitLabel}
      passLabel={passLabel}
    />
  );
};

export default NavSubmitButton;

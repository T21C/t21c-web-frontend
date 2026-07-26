// tuf-search: #SettingsSessionsPage #settingsSessionsPage #account #settings
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { routes } from "@/api/routes";
import { useAuth } from "@/contexts/AuthContext";
import Spoiler from "@/components/common/Spoiler/Spoiler";
import api from "@/utils/api";
import "./settingsSubPage.css";
import "./SettingsSessionsPage.css";

/**
 * Lightweight UA summary: browser + OS, fallback truncated UA.
 * @param {string | null | undefined} userAgent
 * @returns {string}
 */
function summarizeUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== "string") return "";
  const ua = userAgent;

  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  let os = "";
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  if (browser !== "Browser" || os) {
    return os ? `${browser} on ${os}` : browser;
  }
  return ua.length > 64 ? `${ua.slice(0, 61)}…` : ua;
}

/**
 * @param {string | Date} value
 * @param {string} locale
 */
function formatSessionDate(value, locale) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const SettingsSessionsPage = () => {
  const { t, i18n } = useTranslation("pages");
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get(routes.auth.sessions.list());
      setSessions(Array.isArray(response.data?.sessions) ? response.data.sessions : []);
    } catch (e) {
      console.error("Settings sessions fetch failed:", e);
      setError(true);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSignOutCurrent = async () => {
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (e) {
      console.error("Logout failed:", e);
      toast.error(t("settings.sessions.revokeError"));
    }
  };

  const handleRevoke = async (session) => {
    if (!session?.id) return;
    if (session.isCurrent) {
      await handleSignOutCurrent();
      return;
    }
    setBusyId(session.id);
    try {
      await api.delete(routes.auth.sessions.revoke(session.id));
      toast.success(t("settings.sessions.revokeSuccess"));
      await loadSessions();
    } catch (e) {
      console.error("Revoke session failed:", e);
      toast.error(t("settings.sessions.revokeError"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRevokeOthers = async () => {
    if (!window.confirm(t("settings.sessions.revokeOthersConfirm"))) return;
    setRevokingOthers(true);
    try {
      await api.delete(routes.auth.sessions.revokeOthers());
      toast.success(t("settings.sessions.revokeOthersSuccess"));
      await loadSessions();
    } catch (e) {
      console.error("Revoke other sessions failed:", e);
      toast.error(t("settings.sessions.revokeOthersError"));
    } finally {
      setRevokingOthers(false);
    }
  };

  const otherCount = sessions.filter((s) => !s.isCurrent).length;
  const locale = i18n.language;

  if (loading) {
    return (
      <div className="settings-sub-page settings-sub-page--centered settings-sessions-page">
        <p className="settings-sub-page__text">{t("settings.sessions.loading")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="settings-sub-page settings-sessions-page">
        <h2 className="settings-sub-page__title">{t("settings.sessions.loadErrorTitle")}</h2>
        <p className="settings-sub-page__text">{t("settings.sessions.loadErrorBody")}</p>
        <button
          type="button"
          className="settings-sub-page__btn btn-fill-secondary"
          onClick={loadSessions}
        >
          {t("settings.sessions.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="settings-sub-page settings-sessions-page">
      <header className="settings-sessions-page__header">
        <div className="settings-sessions-page__intro">
          <h2 className="settings-sub-page__title">{t("settings.sessions.title")}</h2>
          <p className="settings-sub-page__text">{t("settings.sessions.subtitle")}</p>
        </div>
        <button
          type="button"
          className="settings-sub-page__btn btn-fill-secondary"
          onClick={handleRevokeOthers}
          disabled={revokingOthers || otherCount === 0}
        >
          {t("settings.sessions.revokeOthers")}
        </button>
      </header>

      {sessions.length === 0 ? (
        <div className="settings-sub-page__panel">
          <p className="settings-sub-page__text">{t("settings.sessions.empty")}</p>
        </div>
      ) : (
        <ul className="settings-sessions-page__list">
          {sessions.map((session) => {
            const device =
              session.label?.trim() ||
              summarizeUserAgent(session.userAgent) ||
              t("settings.sessions.unknownDevice");
            const isBusy = busyId === session.id;
            return (
              <li key={session.id} className="settings-sessions-page__row">
                <div className="settings-sessions-page__row-main">
                  <div className="settings-sessions-page__row-title">
                    <span className="settings-sessions-page__device">{device}</span>
                    {session.isCurrent ? (
                      <span className="settings-sessions-page__badge">
                        {t("settings.sessions.thisDevice")}
                      </span>
                    ) : null}
                  </div>
                  <div className="settings-sessions-page__meta">
                    <span className="settings-sessions-page__ip">
                      {t("settings.sessions.ip")}:{" "}
                      {session.ip ? (
                        <Spoiler
                          label={t("settings.sessions.revealIp")}
                          hideLabel={t("settings.sessions.hideIp")}
                        >
                          {session.ip}
                        </Spoiler>
                      ) : (
                        t("settings.sessions.unknownIp")
                      )}
                    </span>
                    <span>
                      {t("settings.sessions.created")}:{" "}
                      {formatSessionDate(session.createdAt, locale)}
                    </span>
                    <span>
                      {t("settings.sessions.expires")}:{" "}
                      {formatSessionDate(session.expiresAt, locale)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="settings-sub-page__btn btn-fill-danger"
                  onClick={() => handleRevoke(session)}
                  disabled={isBusy || revokingOthers}
                >
                  {t("settings.sessions.signOut")}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default SettingsSessionsPage;

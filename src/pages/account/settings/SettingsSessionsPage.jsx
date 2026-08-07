// tuf-search: #SettingsSessionsPage #settingsSessionsPage #account #settings
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { routes } from "@/api/routes";
import { useAuth } from "@/contexts/AuthContext";
import { useElevation } from "@/contexts/ElevationContext";
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
  const { requireElevation } = useElevation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [devices, setDevices] = useState([]);
  const [oauthApps, setOauthApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [busyDeviceId, setBusyDeviceId] = useState(null);
  const [busyGrantId, setBusyGrantId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [sessionsRes, devicesRes, oauthRes] = await Promise.all([
        api.get(routes.auth.sessions.list()),
        api.get(routes.auth.trustedDevices.list()).catch(() => ({ data: { devices: [] } })),
        api.get(routes.auth.oauthApps.list()).catch(() => ({ data: { apps: [] } })),
      ]);
      setSessions(Array.isArray(sessionsRes.data?.sessions) ? sessionsRes.data.sessions : []);
      setDevices(Array.isArray(devicesRes.data?.devices) ? devicesRes.data.devices : []);
      setOauthApps(Array.isArray(oauthRes.data?.apps) ? oauthRes.data.apps : []);
    } catch (e) {
      console.error("Settings sessions fetch failed:", e);
      setError(true);
      setSessions([]);
      setDevices([]);
      setOauthApps([]);
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
      await requireElevation("security", () =>
        api.delete(routes.auth.sessions.revokeOthers()),
      );
      toast.success(t("settings.sessions.revokeOthersSuccess"));
      await loadSessions();
    } catch (e) {
      if (e?.code === "ELEVATION_CANCELLED") return;
      console.error("Revoke other sessions failed:", e);
      toast.error(
        e.response?.data?.message || t("settings.sessions.revokeOthersError"),
      );
    } finally {
      setRevokingOthers(false);
    }
  };

  const handleRevokeDevice = async (device) => {
    if (!device?.id) return;
    setBusyDeviceId(device.id);
    try {
      await api.delete(routes.auth.trustedDevices.revoke(device.id));
      toast.success(t("settings.trustedDevices.revokeSuccess"));
      await loadSessions();
    } catch (e) {
      console.error("Revoke trusted device failed:", e);
      toast.error(t("settings.trustedDevices.revokeError"));
    } finally {
      setBusyDeviceId(null);
    }
  };

  const handleRevokeOauthApp = async (grant) => {
    if (!grant?.id) return;
    setBusyGrantId(grant.id);
    try {
      await api.delete(routes.auth.oauthApps.revoke(grant.id));
      toast.success(t("settings.oauthApps.revokeSuccess"));
      await loadSessions();
    } catch (e) {
      console.error("Revoke oauth app failed:", e);
      toast.error(t("settings.oauthApps.revokeError"));
    } finally {
      setBusyGrantId(null);
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
      <div className="tab-header">
        <div className="submission-tabs">
          <button
            type="button"
            className={`tab-button ${activeTab === "sessions" ? "active" : ""}`}
            onClick={() => setActiveTab("sessions")}
          >
            {t("settings.sessions.tabs.sessions")}
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === "devices" ? "active" : ""}`}
            onClick={() => setActiveTab("devices")}
          >
            {t("settings.sessions.tabs.devices")}
          </button>
          <button
            type="button"
            className={`tab-button ${activeTab === "oauthApps" ? "active" : ""}`}
            onClick={() => setActiveTab("oauthApps")}
          >
            {t("settings.sessions.tabs.oauthApps")}
          </button>
        </div>
      </div>

      {activeTab === "sessions" && (
        <>
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
                        <span>
                          {t("settings.sessions.location")}:{" "}
                          {session.location?.label || t("settings.sessions.unknownLocation")}
                        </span>
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
        </>
      )}

      {activeTab === "devices" && (
        <section className="settings-sessions-page__trusted">
          <div className="settings-sessions-page__intro">
            <h2 className="settings-sub-page__title">{t("settings.trustedDevices.title")}</h2>
            <p className="settings-sub-page__text">{t("settings.trustedDevices.subtitle")}</p>
          </div>

          {devices.length === 0 ? (
            <div className="settings-sub-page__panel">
              <p className="settings-sub-page__text">{t("settings.trustedDevices.empty")}</p>
            </div>
          ) : (
            <ul className="settings-sessions-page__list">
              {devices.map((device) => {
                const label =
                  summarizeUserAgent(device.userAgent) ||
                  t("settings.trustedDevices.unknownDevice");
                const isBusy = busyDeviceId === device.id;
                return (
                  <li key={device.id} className="settings-sessions-page__row">
                    <div className="settings-sessions-page__row-main">
                      <div className="settings-sessions-page__row-title">
                        <span className="settings-sessions-page__device">{label}</span>
                        {device.isCurrent ? (
                          <span className="settings-sessions-page__badge">
                            {t("settings.trustedDevices.thisDevice")}
                          </span>
                        ) : null}
                      </div>
                      <div className="settings-sessions-page__meta">
                        <span>
                          {t("settings.trustedDevices.location")}:{" "}
                          {device.location?.label || t("settings.trustedDevices.unknownLocation")}
                        </span>
                        <span>
                          {t("settings.trustedDevices.lastUsed")}:{" "}
                          {formatSessionDate(device.lastUsedAt, locale)}
                        </span>
                        <span>
                          {t("settings.trustedDevices.expires")}:{" "}
                          {formatSessionDate(device.expiresAt, locale)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="settings-sub-page__btn btn-fill-danger"
                      onClick={() => handleRevokeDevice(device)}
                      disabled={isBusy}
                    >
                      {t("settings.trustedDevices.revoke")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {activeTab === "oauthApps" && (
        <section className="settings-sessions-page__trusted">
          <div className="settings-sessions-page__intro">
            <h2 className="settings-sub-page__title">{t("settings.oauthApps.title")}</h2>
            <p className="settings-sub-page__text">{t("settings.oauthApps.subtitle")}</p>
          </div>

          {oauthApps.length === 0 ? (
            <div className="settings-sub-page__panel">
              <p className="settings-sub-page__text">{t("settings.oauthApps.empty")}</p>
            </div>
          ) : (
            <ul className="settings-sessions-page__list">
              {oauthApps.map((grant) => {
                const isBusy = busyGrantId === grant.id;
                const name = grant.client?.name || grant.clientId;
                return (
                  <li key={grant.id} className="settings-sessions-page__row">
                    <div className="settings-sessions-page__row-main">
                      <div className="settings-sessions-page__row-title">
                        <span className="settings-sessions-page__device">
                          {name}
                          {grant.client?.verified ? " ✓" : ""}
                        </span>
                      </div>
                      <div className="settings-sessions-page__meta">
                        <span>{grant.scope}</span>
                        <span>
                          {t("settings.oauthApps.connected")}:{" "}
                          {formatSessionDate(grant.createdAt, locale)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="settings-sub-page__btn btn-fill-danger"
                      onClick={() => handleRevokeOauthApp(grant)}
                      disabled={isBusy}
                    >
                      {t("settings.oauthApps.revoke")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};

export default SettingsSessionsPage;

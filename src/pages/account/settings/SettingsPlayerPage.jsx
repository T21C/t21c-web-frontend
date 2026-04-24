import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import api from "@/utils/api";
import { formatNumber } from "@/utils";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { ExternalLinkIcon } from "@/components/common/icons";
import { buildPlayerStatGroups } from "@/utils/profileStatGroups";
import { buildPlayerIconSlots } from "@/utils/profileIconSlots";
import "./settingsSubPage.css";

const SettingsPlayerPage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const { difficultyDict } = useDifficultyContext();
  const playerId = user?.playerId != null ? Number(user.playerId) : null;

  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameFieldError, setNicknameFieldError] = useState("");

  const playerPath = useMemo(() => {
    if (playerId == null) return "/profile";
    return `/profile/${playerId}`;
  }, [playerId]);

  const fetchProfile = useCallback(async () => {
    if (playerId == null || !Number.isFinite(playerId)) {
      setLoading(false);
      setPlayerData(null);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const response = await api.get(`${import.meta.env.VITE_PLAYERS_V3}/${playerId}/profile`);
      setPlayerData(response.data);
    } catch (e) {
      console.error("Settings player profile fetch failed:", e);
      setError(true);
      setPlayerData(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!playerData) return;
    const next = playerData.user?.nickname ?? playerData.name ?? "";
    setNicknameDraft(next);
    setNicknameFieldError("");
  }, [playerData]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") fetchProfile();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchProfile]);

  const valueLabels = useMemo(
    () => ({
      rankedScore: t("profile.valueLabels.rankedScore"),
      generalScore: t("profile.valueLabels.generalScore"),
      averageXacc: t("profile.valueLabels.averageXacc"),
      worldsFirstCount: t("profile.valueLabels.worldsFirstCount"),
    }),
    [t],
  );

  const statGroups = useMemo(
    () => buildPlayerStatGroups(playerData?.funFacts, t),
    [playerData?.funFacts, t],
  );

  const iconSlots = useMemo(
    () =>
      buildPlayerIconSlots(
        {
          clearsByDifficulty: playerData?.funFacts?.clearsByDifficulty,
          worldsFirstByDifficulty: playerData?.funFacts?.worldsFirstByDifficulty,
        },
        difficultyDict || {},
      ),
    [
      playerData?.funFacts?.clearsByDifficulty,
      playerData?.funFacts?.worldsFirstByDifficulty,
      difficultyDict,
    ],
  );

  const handleViewUserPacks = useCallback(() => {
    const handle = playerData?.user?.username;
    if (handle) {
      window.packSearchContext = {
        query: `owner:${handle}`,
        timestamp: Date.now(),
      };
      navigate("/packs");
    }
  }, [navigate, playerData?.user?.username]);

  const openPublicPlayerInNewTab = useCallback(() => {
    const path = playerId != null && Number.isFinite(playerId) ? `/profile/${playerId}` : "/profile";
    const url = `${window.location.origin}${path}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, [playerId]);

  const handleSaveNickname = useCallback(async () => {
    const trimmed = nicknameDraft.trim();
    if (trimmed.length < 3 || trimmed.length > 60) {
      setNicknameFieldError(t("settings.player.nicknameLength"));
      return;
    }
    setNicknameFieldError("");
    setNicknameSaving(true);
    try {
      await api.put(`${import.meta.env.VITE_PROFILE}/me`, {
        nickname: trimmed,
        country: playerData?.country ?? "",
      });
      await fetchUser();
      await fetchProfile();
      toast.success(t("settings.player.nicknameSuccess"));
    } catch (e) {
      const msg = e?.response?.data?.error || t("settings.player.nicknameError");
      setNicknameFieldError(msg);
      toast.error(msg);
    } finally {
      setNicknameSaving(false);
    }
  }, [nicknameDraft, playerData?.country, fetchUser, fetchProfile, t]);

  if (!user?.playerId) {
    return (
      <div className="settings-sub-page">
        <h2 className="settings-sub-page__title">{t("settings.player.noPlayerTitle")}</h2>
        <p className="settings-sub-page__text">{t("settings.player.noPlayerBody")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="settings-sub-page settings-sub-page--centered">
        <div className="loader loader-level-detail" />
      </div>
    );
  }

  if (error || !playerData) {
    return (
      <div className="settings-sub-page">
        <h2 className="settings-sub-page__title">{t("settings.player.loadErrorTitle")}</h2>
        <p className="settings-sub-page__text">{t("settings.player.loadErrorBody")}</p>
        <button
          type="button"
          className="settings-sub-page__btn btn-fill-secondary"
          onClick={() => fetchProfile()}
        >
          {t("settings.player.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="settings-sub-page">
      <div className="settings-sub-page__header-preview">
        <ProfileHeader
          mode="player"
          className="settings-sub-page__profile-header"
          iconSlots={iconSlots}
          avatarUrl={playerData?.user?.avatarUrl || playerData?.pfp}
          fallbackAvatarUrl={playerData?.pfp || "/default-avatar.jpg"}
          name={playerData?.name || t("profile.meta.defaultTitle")}
          handle={playerData?.user?.username}
          country={playerData?.country}
          badgeId={playerData?.rankedScoreRank}
          badgeLabel="#"
          expandStatsAriaLabel={t("profile.funFacts.expandAria")}
          collapseStatsAriaLabel={t("profile.funFacts.collapseAria")}
          statGroups={statGroups}
          statRows={[
            {
              key: "rankedScore",
              label: valueLabels.rankedScore,
              value: formatNumber(playerData?.rankedScore || 0),
            },
            {
              key: "averageXacc",
              label: valueLabels.averageXacc,
              value: `${((playerData?.averageXacc || 0) * 100).toFixed(2)}%`,
            },
            {
              key: "generalScore",
              label: valueLabels.generalScore,
              value: formatNumber(playerData?.generalScore || 0),
            },
          ]}
          actions={
            <>
              <button
                type="button"
                className="profile-header__action-btn"
                onClick={openPublicPlayerInNewTab}
                title={t("settings.player.openProfile")}
                aria-label={t("settings.player.openProfileNewTab")}
              >
                <ExternalLinkIcon color="var(--color-white)" size={32} />
              </button>
            </>
          }
        />
      </div>

      <div className="settings-sub-page__block settings-sub-page__field">
        <label htmlFor="settings-player-nickname">{t("settings.player.nicknameLabel")}</label>
        <div className="settings-sub-page__control-row">
          <input
            id="settings-player-nickname"
            type="text"
            autoComplete="off"
            className="settings-sub-page__input"
            maxLength={60}
            placeholder={t("settings.player.nicknamePlaceholder")}
            value={nicknameDraft}
            onChange={(ev) => {
              setNicknameDraft(ev.target.value);
              if (nicknameFieldError) setNicknameFieldError("");
            }}
            disabled={nicknameSaving}
          />
          <button
            type="button"
            className="settings-sub-page__save-btn"
            onClick={handleSaveNickname}
            disabled={nicknameSaving}
          >
            {nicknameSaving ? t("buttons.saving", { ns: "common" }) : t("buttons.save", { ns: "common" })}
          </button>
        </div>
        {nicknameFieldError ? (
          <p className="settings-sub-page__field-error" role="alert">
            {nicknameFieldError}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default SettingsPlayerPage;

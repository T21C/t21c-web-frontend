import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import api from "@/utils/api";
import { formatNumber } from "@/utils";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { EditIcon, PackIcon } from "@/components/common/icons";
import { CreatorIcon } from "@/components/common/icons/CreatorIcon";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { buildPlayerStatGroups } from "@/utils/profileStatGroups";
import { buildPlayerIconSlots } from "@/utils/profileIconSlots";
import "./settingsSubPage.css";

const SettingsPlayerPage = () => {
  const { t } = useTranslation("pages");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { difficultyDict } = useDifficultyContext();
  const playerId = user?.playerId != null ? Number(user.playerId) : null;

  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
      <p className="settings-sub-page__preview-hint">{t("settings.player.previewHint")}</p>

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
                onClick={() => navigate("/settings/account")}
                title={t("profile.editProfile")}
                aria-label={t("profile.editProfile")}
              >
                <EditIcon color="var(--color-white)" size="24px" />
              </button>
              {playerData?.user?.creator?.id ? (
                <button
                  type="button"
                  className="profile-header__action-btn"
                  onClick={() => navigate(`/creator/${playerData.user.creator.id}`)}
                  title={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                  aria-label={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                >
                  <CreatorIcon color="var(--color-white)" size={24} />
                </button>
              ) : null}
              {playerData?.user?.username ? (
                <button
                  type="button"
                  className="profile-header__action-btn"
                  onClick={handleViewUserPacks}
                  title={t("profile.viewUserPacks")}
                  aria-label={t("profile.viewUserPacks")}
                >
                  <PackIcon color="var(--color-white)" size="24px" />
                </button>
              ) : null}
              <button
                type="button"
                className="profile-header__action-btn"
                onClick={() => navigate(playerPath)}
                title={t("settings.player.openProfile")}
                aria-label={t("settings.player.openProfile")}
              >
                <LinkIcon color="var(--color-white)" size={24} />
              </button>
            </>
          }
        />
      </div>

      <h2 className="settings-sub-page__title">{t("settings.player.title")}</h2>
      <p className="settings-sub-page__text">{t("settings.player.intro")}</p>
      <button
        type="button"
        className="settings-sub-page__btn btn-fill-primary"
        onClick={() => navigate(playerPath)}
      >
        {t("settings.player.openProfile")}
      </button>
    </div>
  );
};

export default SettingsPlayerPage;

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import api from "@/utils/api";
import { formatNumber } from "@/utils";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import ProfileBannerEditor from "@/components/account/ProfileBannerEditor/ProfileBannerEditor";
import { getEffectiveProfileBannerUrl } from "@/utils/profileBanners";
import { ExternalLinkIcon, ChevronIcon } from "@/components/common/icons";
import { useSettings } from "@/contexts/SettingsContext";
import { buildPlayerStatGroups } from "@/utils/profileStatGroups";
import { buildPlayerIconSlots } from "@/utils/profileIconSlots";
import "./settingsSubPage.css";

const SettingsPlayerPage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user, fetchUser } = useAuth();
  const { profileBannerExpanded, setProfileBannerExpanded } = useSettings();
  const { difficultyDict } = useDifficultyContext();
  const playerId = user?.playerId != null ? Number(user.playerId) : null;

  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameFieldError, setNicknameFieldError] = useState("");
  /** `undefined` = follow server; `null` = draft “use default”; string = draft preset path. */
  const [bannerPresetDraft, setBannerPresetDraft] = useState(undefined);

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
    setBannerPresetDraft(undefined);
  }, [playerId]);

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

  const settingsBannerUrl = useMemo(() => {
    if (!playerData) return null;
    const flags = playerData.user?.permissionFlags ?? user?.permissionFlags ?? 0;
    const effectiveBannerPreset =
      bannerPresetDraft === undefined
        ? playerData.bannerPreset ?? null
        : bannerPresetDraft === null
          ? null
          : bannerPresetDraft;
    return getEffectiveProfileBannerUrl({
      bannerPreset: effectiveBannerPreset,
      customBannerUrl: playerData.customBannerUrl,
      subjectUser: { permissionFlags: flags },
    });
  }, [playerData, user?.permissionFlags, bannerPresetDraft]);

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
          bannerUrl={settingsBannerUrl}
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
              <Link
                className="profile-header__action-btn"
                to={playerId != null && Number.isFinite(playerId) ? `/profile/${playerId}` : "/profile"}
                title={t("settings.player.openProfile")}
                aria-label={t("settings.player.openProfileNewTab")}
              >
                <ExternalLinkIcon color="var(--color-white)" size={32} />
              </Link>
            </>
          }
        />
      </div>

      <section className="settings-sub-page__banner-section" aria-labelledby="settings-player-banner-heading">
        <div className="settings-sub-page__banner-section-head">
          <h2 id="settings-player-banner-heading" className="settings-sub-page__banner-section-title">
            {t("settings.banner.sectionTitle")}
          </h2>
          <button
            type="button"
            className="settings-sub-page__banner-chevron"
            aria-expanded={profileBannerExpanded}
            aria-controls="settings-player-banner-panel"
            aria-label={
              profileBannerExpanded
                ? t("settings.banner.sectionCollapseAria")
                : t("settings.banner.sectionExpandAria")
            }
            onClick={() => setProfileBannerExpanded((v) => !v)}
          >
            <ChevronIcon direction={profileBannerExpanded ? "down" : "right"} />
          </button>
        </div>
        <div
          id="settings-player-banner-panel"
          className={
            profileBannerExpanded
              ? "settings-sub-page__banner-collapsible"
              : "settings-sub-page__banner-collapsible settings-sub-page__banner-collapsible--collapsed"
          }
        >
          <ProfileBannerEditor
            variant="player"
            showHeading={false}
            authUser={user}
            bannerPreset={playerData?.bannerPreset}
            presetDraft={bannerPresetDraft}
            onPresetDraftChange={setBannerPresetDraft}
            customBannerUrl={playerData?.customBannerUrl}
            onApplied={(patch) => {
              setPlayerData((p) => (p && typeof p === "object" ? { ...p, ...patch } : p));
            }}
          />
        </div>
      </section>

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

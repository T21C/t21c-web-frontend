import { routes } from '@/api/routes';
// tuf-search: #SettingsPlayerPage #settingsPlayerPage #account #settings
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import api from "@/utils/api";
import { formatNumber } from "@/utils";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import ProfileBannerEditor from "@/components/account/ProfileBannerEditor/ProfileBannerEditor";
import ProfileHeaderSurfaceEditor from "@/components/account/ProfileHeaderSurfaceEditor/ProfileHeaderSurfaceEditor";
import { BioCanvasEditorLauncher } from "@/components/account/BioCanvasEditor";
import {
  SettingsPreviewSection,
  SettingsSectionPreviewControls,
} from "@/components/account/SettingsPreviewSection/SettingsPreviewSection";
import {
  getEffectiveProfileBannerUrl,
  getEffectiveProfileHeaderSurface,
  isTufStellarAccessActive,
  normalizeTufStellarIconVariant,
  resolveStellarEntitlementSubject,
} from "@/utils/profileBanners";
import { ExternalLinkIcon, ChevronIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { SettingsSaveField } from "@/components/account/SettingsSaveField/SettingsSaveField";
import { SettingsStellarIconField } from "@/components/account/SettingsSaveField/SettingsStellarIconField";
import { useSettings } from "@/contexts/SettingsContext";
import { buildPlayerStatGroups } from "@/utils/profileStatGroups";
import { buildPlayerIconSlots } from "@/utils/profileIconSlots";
import {
  mergeOptimisticAliasRows,
  normalizeProfileAliasNames,
} from "@/utils/profileAliasNames";
import { isTufStellarEnabledForUser } from "@/utils/tufStellarFeature";
import "./settingsSubPage.css";

const SettingsPlayerPage = () => {
  const { t } = useTranslation(["pages", "common"]);
  const { user, fetchUser } = useAuth();
  const {
    profileBannerExpanded,
    setProfileBannerExpanded,
    previewFocusSectionId,
    headerSurfaceEditorOpen,
  } = useSettings();
  const { difficultyDict, difficulties } = useDifficultyContext();
  const playerId = user?.playerId != null ? Number(user.playerId) : null;

  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameFieldError, setNicknameFieldError] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [bioSaving, setBioSaving] = useState(false);
  const [bioFieldError, setBioFieldError] = useState("");
  /** `undefined` = follow server; `null` = draft “use default”; string = draft preset path. */
  const [bannerPresetDraft, setBannerPresetDraft] = useState(undefined);
  /** `undefined` = server; object/null = draft bio canvas */
  const [bioCanvasDraft, setBioCanvasDraft] = useState(undefined);
  /** `undefined` = server; object/null = draft surface style */
  const [headerSurfaceStyleDraft, setHeaderSurfaceStyleDraft] = useState(undefined);
  const [stellarVariantDraft, setStellarVariantDraft] = useState(null);
  const [stellarVariantSaving, setStellarVariantSaving] = useState(false);

  const fetchProfile = useCallback(async (options = {}) => {
    const background = Boolean(options.background);
    if (playerId == null || !Number.isFinite(playerId)) {
      if (!background) {
        setLoading(false);
        setPlayerData(null);
      }
      return;
    }
    if (!background) {
      setLoading(true);
      setError(false);
    }
    try {
      const response = await api.get(`${routes.playersV3.root()}/${playerId}/profile`);
      setPlayerData(response.data);
      if (!background) setError(false);
    } catch (e) {
      console.error("Settings player profile fetch failed:", e);
      if (!background) {
        setError(true);
        setPlayerData(null);
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    setBannerPresetDraft(undefined);
    setBioCanvasDraft(undefined);
    setHeaderSurfaceStyleDraft(undefined);
    setStellarVariantDraft(null);
  }, [playerId]);

  useEffect(() => {
    if (!playerData) return;
    const next = playerData.user?.nickname ?? playerData.name ?? "";
    setNicknameDraft(next);
    setNicknameFieldError("");
  }, [playerId, playerData?.user?.nickname, playerData?.name]);

  useEffect(() => {
    if (!playerData) return;
    setBioDraft(typeof playerData.bio === "string" ? playerData.bio : "");
    setBioFieldError("");
  }, [playerData?.bio, playerId]);

  const hasSettingsDrafts =
    headerSurfaceStyleDraft !== undefined ||
    bannerPresetDraft !== undefined ||
    bioCanvasDraft !== undefined;

  const canUseBioCanvas = useMemo(
    () => isTufStellarEnabledForUser(user) && isTufStellarAccessActive(user),
    [user],
  );

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (headerSurfaceEditorOpen || hasSettingsDrafts) return;
      fetchProfile({ background: true });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchProfile, headerSurfaceEditorOpen, hasSettingsDrafts]);

  const valueLabels = useMemo(
    () => ({
      rankedScore: t("profile.valueLabels.rankedScore"),
      generalScore: t("profile.valueLabels.generalScore"),
      averageXacc: t("profile.valueLabels.averageXacc"),
      worldsFirstCount: t("profile.valueLabels.worldsFirstCount"),
      wfPPScore: t("profile.valueLabels.wfPPScore"),
      worldsFirstPPCount: t("profile.valueLabels.worldsFirstPPCount"),
    }),
    [t],
  );

  const statGroups = useMemo(
    () => buildPlayerStatGroups(playerData?.funFacts, t, difficultyDict || {}),
    [playerData?.funFacts, t, difficultyDict],
  );

  const clearsByDifficultyForHeader =
    playerData?.funFacts?.clearsByDifficultyNoDupes ?? playerData?.funFacts?.clearsByDifficulty;

  const iconSlots = useMemo(
    () =>
      buildPlayerIconSlots(
        {
          clearsByDifficulty: clearsByDifficultyForHeader,
          worldsFirstByDifficulty: playerData?.funFacts?.worldsFirstByDifficulty,
        },
        difficultyDict || {},
      ),
    [
      clearsByDifficultyForHeader,
      playerData?.funFacts?.worldsFirstByDifficulty,
      difficultyDict,
    ],
  );

  const stellarEntitlementSubject = useMemo(
    () => resolveStellarEntitlementSubject(user, playerData?.user),
    [user, playerData?.user],
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
      subjectUser: playerData.user,
    });
  }, [playerData, user?.permissionFlags, bannerPresetDraft]);

  const savedStellarVariant = useMemo(
    () => normalizeTufStellarIconVariant(playerData?.tufStellarIconVariant),
    [playerData?.tufStellarIconVariant],
  );

  const previewStellarVariant = stellarVariantDraft ?? savedStellarVariant;
  const stellarVariantMatchesSaved = previewStellarVariant === savedStellarVariant;

  const previewDisplayName = useMemo(() => {
    const draft = nicknameDraft.trim();
    if (draft.length) return draft;
    const savedNick = playerData?.user?.nickname;
    if (typeof savedNick === "string" && savedNick.trim()) return savedNick.trim();
    return playerData?.name || t("profile.meta.defaultTitle");
  }, [nicknameDraft, playerData?.user?.nickname, playerData?.name, t]);

  const previewAliasNames = useMemo(
    () => normalizeProfileAliasNames(playerData, previewDisplayName),
    [playerData, previewDisplayName],
  );

  const nicknameMatchesSaved = useMemo(() => {
    const savedNick =
      typeof playerData?.user?.nickname === "string"
        ? playerData.user.nickname.trim()
        : String(playerData?.name ?? "").trim();
    return nicknameDraft.trim() === savedNick;
  }, [nicknameDraft, playerData?.user?.nickname, playerData?.name]);

  const bioMatchesSaved = useMemo(() => {
    const saved = playerData?.bio == null ? "" : String(playerData.bio);
    return bioDraft.trim() === saved.trim();
  }, [playerData?.bio, bioDraft]);

  const settingsHeaderSurface = useMemo(() => {
    if (!playerData) return { style: null, imageAssets: {} };
    const styleForSurface =
      headerSurfaceStyleDraft === undefined
        ? playerData.profileHeaderSurfaceStyle
        : headerSurfaceStyleDraft;
    return getEffectiveProfileHeaderSurface({
      profileHeaderSurfaceStyle: styleForSurface,
      profileHeaderSurfaceImageAssets: playerData.profileHeaderSurfaceImageAssets,
      subjectUser: playerData.user ?? user,
    });
  }, [playerData, user, headerSurfaceStyleDraft]);

  const handleSaveNickname = useCallback(async () => {
    const trimmed = nicknameDraft.trim();
    if (trimmed.length < 3 || trimmed.length > 60) {
      setNicknameFieldError(t("settings.player.nicknameLength"));
      return;
    }
    const previousDisplayName =
      typeof playerData?.user?.nickname === "string" && playerData.user.nickname.trim()
        ? playerData.user.nickname.trim()
        : String(playerData?.name ?? "").trim();
    setNicknameFieldError("");
    setNicknameSaving(true);
    try {
      await api.put(`${routes.auth.profile.root()}/me`, {
        nickname: trimmed,
        country: playerData?.country ?? "",
      });
      await fetchUser();
      if (playerId != null && Number.isFinite(playerId)) {
        const response = await api.get(
          `${routes.playersV3.root()}/${playerId}/profile`,
        );
        const fetched = response.data;
        const aliases = mergeOptimisticAliasRows(
          fetched?.aliases,
          previousDisplayName,
          trimmed,
        );
        setPlayerData({
          ...fetched,
          name: trimmed,
          aliases,
          user: fetched?.user
            ? { ...fetched.user, nickname: trimmed }
            : fetched?.user,
        });
      } else {
        await fetchProfile({ background: true });
      }
      toast.success(t("settings.player.nicknameSuccess"));
    } catch (e) {
      const msg = e?.response?.data?.error || t("settings.player.nicknameError");
      setNicknameFieldError(msg);
      toast.error(msg);
    } finally {
      setNicknameSaving(false);
    }
  }, [nicknameDraft, playerData, playerId, fetchUser, fetchProfile, t]);

  const handleSaveStellarVariant = useCallback(async () => {
    if (playerId == null || !Number.isFinite(playerId)) return;
    const v = previewStellarVariant;
    if (!["1", "2", "3"].includes(v) || stellarVariantMatchesSaved) return;
    setStellarVariantSaving(true);
    try {
      const { data } = await api.patch(
        `${routes.playersV3.root()}/me/tuf-stellar-icon-variant`,
        { variant: v },
      );
      const next = normalizeTufStellarIconVariant(data?.tufStellarIconVariant ?? v);
      setPlayerData((p) => (p && typeof p === "object" ? { ...p, tufStellarIconVariant: next } : p));
      setStellarVariantDraft(null);
      toast.success(t("settings.player.stellarIconSaved"));
    } catch (e) {
      const msg = e?.response?.data?.error || t("settings.player.stellarIconError");
      toast.error(msg);
    } finally {
      setStellarVariantSaving(false);
    }
  }, [playerId, previewStellarVariant, stellarVariantMatchesSaved, t]);

  const handleSaveBio = useCallback(async () => {
    if (playerId == null || !Number.isFinite(playerId)) return;
    const trimmed = bioDraft.trim();
    if (trimmed.length > 2000) {
      setBioFieldError(t("settings.player.bioTooLong"));
      return;
    }
    setBioFieldError("");
    setBioSaving(true);
    const toastId = toast.loading(t("loading.saving", { ns: "common" }));
    try {
      const { data } = await api.patch(`${routes.playersV3.root()}/me/bio`, {
        bio: trimmed.length ? trimmed : null,
      });
      const nextBio = typeof data?.bio === "string" ? data.bio : "";
      setBioDraft(nextBio);
      setPlayerData((p) => (p && typeof p === "object" ? { ...p, bio: trimmed.length ? trimmed : null } : p));
      toast.success(t("settings.player.bioSuccess"), { id: toastId });
    } catch (e) {
      const msg = e?.response?.data?.error || t("settings.player.bioError");
      setBioFieldError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setBioSaving(false);
    }
  }, [playerId, bioDraft, t]);

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
        <div className="loader-shell loader-shell--tall">
          <div className="loader loader-relative" />
        </div>
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
    <div
      className={
        previewFocusSectionId
          ? "settings-sub-page settings-sub-page--focus-preview"
          : "settings-sub-page"
      }
    >
      <div className="settings-sub-page__header-preview">
        <ProfileHeader
          mode="player"
          className="settings-sub-page__profile-header"
          bannerUrl={settingsBannerUrl}
          headerSurfaceStyle={settingsHeaderSurface.style}
          headerSurfaceImageAssets={settingsHeaderSurface.imageAssets}
          iconSlots={iconSlots}
          aliasNames={previewAliasNames}
          playerDifficultyPanelDifficulties={difficulties}
          playerDifficultyPanelClearsByDifficulty={clearsByDifficultyForHeader}
          avatarSubject={playerData}
          stellarIconVariant={previewStellarVariant}
          name={previewDisplayName}
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

      <SettingsPreviewSection
        sectionId="headerSurface"
        className="settings-sub-page__banner-section"
        aria-labelledby="settings-player-header-surface-heading"
      >
        <div className="settings-sub-page__header-surface-section-head">
          <h2
            id="settings-player-header-surface-heading"
            className="settings-sub-page__banner-section-title"
          >
            {t("settings.headerSurface.sectionTitle")}
          </h2>
          <SettingsSectionPreviewControls
            sectionId="headerSurface"
            headingId="settings-player-header-surface-heading"
            title={t("settings.headerSurface.sectionTitle")}
          />
        </div>
        <ProfileHeaderSurfaceEditor
          variant="player"
          authUser={stellarEntitlementSubject}
          surfaceStyle={playerData?.profileHeaderSurfaceStyle}
          styleDraft={headerSurfaceStyleDraft}
          onStyleDraftChange={setHeaderSurfaceStyleDraft}
          surfaceImageAssets={playerData?.profileHeaderSurfaceImageAssets}
          onApplied={(patch) => {
            setPlayerData((p) => (p && typeof p === "object" ? { ...p, ...patch } : p));
            if (Object.prototype.hasOwnProperty.call(patch, "profileHeaderSurfaceStyle")) {
              setHeaderSurfaceStyleDraft(undefined);
            }
          }}
          profilePreviewProps={{
            mode: "player",
            bannerUrl: settingsBannerUrl,
            headerSurfaceStyle: settingsHeaderSurface.style,
            headerSurfaceImageAssets: settingsHeaderSurface.imageAssets,
            iconSlots,
            aliasNames: previewAliasNames,
            playerDifficultyPanelDifficulties: difficulties,
            playerDifficultyPanelClearsByDifficulty: clearsByDifficultyForHeader,
            avatarSubject: playerData,
            stellarIconVariant: previewStellarVariant,
            name: previewDisplayName,
            handle: playerData?.user?.username,
            country: playerData?.country,
            badgeId: playerData?.rankedScoreRank,
            badgeLabel: "#",
            expandStatsAriaLabel: t("profile.funFacts.expandAria"),
            collapseStatsAriaLabel: t("profile.funFacts.collapseAria"),
            statGroups,
            statRows: [
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
            ],
          }}
        />
      </SettingsPreviewSection>

      <SettingsPreviewSection
        sectionId="banner"
        className="settings-sub-page__banner-section"
        aria-labelledby="settings-player-banner-heading"
      >
        <div className="settings-sub-page__banner-section-head">
          <h2 id="settings-player-banner-heading" className="settings-sub-page__banner-section-title">
            {t("settings.banner.sectionTitle")}
          </h2>
          <div className="settings-sub-page__section-head-actions">
            <SettingsSectionPreviewControls
              sectionId="banner"
              headingId="settings-player-banner-heading"
              title={t("settings.banner.sectionTitle")}
            />
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
        </div>
        <Collapsible
          open={profileBannerExpanded}
          onOpenChange={setProfileBannerExpanded}
          revealOverflow
          duration="0.4s"
        >
          <CollapsibleContent
            id="settings-player-banner-panel"
            className="settings-sub-page__banner-collapsible-region"
          >
        <div className="settings-sub-page__banner-collapsible">
          <ProfileBannerEditor
            variant="player"
            showHeading={false}
            authUser={stellarEntitlementSubject}
            bannerPreset={playerData?.bannerPreset}
            presetDraft={bannerPresetDraft}
            onPresetDraftChange={setBannerPresetDraft}
            customBannerUrl={playerData?.customBannerUrl}
            onApplied={(patch) => {
              setPlayerData((p) => (p && typeof p === "object" ? { ...p, ...patch } : p));
            }}
          />
        </div>
          </CollapsibleContent>
        </Collapsible>
      </SettingsPreviewSection>

      {isTufStellarAccessActive(stellarEntitlementSubject) ? (
        <SettingsStellarIconField
          sectionId="stellar"
          headingId="settings-player-stellar-heading"
          title={t("settings.player.stellarIconTitle")}
          hint={t("settings.player.stellarIconHint")}
          groupAriaLabel={t("settings.player.stellarIconGroupAria")}
          value={previewStellarVariant}
          onChange={setStellarVariantDraft}
          onSave={handleSaveStellarVariant}
          saving={stellarVariantSaving}
          matchesSaved={stellarVariantMatchesSaved}
          getOptionAriaLabel={(id) => t(`settings.player.stellarIconOption${id}`)}
        />
      ) : null}

      <SettingsSaveField
        sectionId="nickname"
        label={t("settings.player.nicknameLabel")}
        inputId="settings-player-nickname"
        onSave={handleSaveNickname}
        saving={nicknameSaving}
        matchesSaved={nicknameMatchesSaved}
        fieldError={nicknameFieldError}
      >
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
      </SettingsSaveField>

      <SettingsSaveField
        sectionId="bio"
        label={t("settings.player.bioLabel")}
        inputId="settings-player-bio"
        onSave={canUseBioCanvas ? undefined : handleSaveBio}
        saving={canUseBioCanvas ? false : bioSaving}
        matchesSaved={canUseBioCanvas ? true : bioMatchesSaved}
        fieldError={canUseBioCanvas ? "" : bioFieldError}
        stack
        hideActions={canUseBioCanvas}
        hidePreviewControls={canUseBioCanvas}
        collapsible={canUseBioCanvas}
      >
        {canUseBioCanvas ? (
          <BioCanvasEditorLauncher
            authUser={user}
            canvas={bioCanvasDraft !== undefined ? bioCanvasDraft : playerData?.bioCanvas}
            canvasDraft={bioCanvasDraft}
            onCanvasDraftChange={setBioCanvasDraft}
            imageAssets={playerData?.bioCanvasImageAssets}
            onApplied={(payload) => {
              setBioCanvasDraft(undefined);
              setPlayerData((p) =>
                p && typeof p === "object"
                  ? {
                      ...p,
                      bioCanvas: payload.bioCanvas ?? null,
                      bioCanvasImageAssets: payload.bioCanvasImageAssets ?? null,
                      bio: payload.bio ?? null,
                    }
                  : p,
              );
            }}
          />
        ) : (
          <textarea
            id="settings-player-bio"
            className="settings-sub-page__textarea"
            maxLength={2000}
            placeholder={t("settings.player.bioPlaceholder")}
            value={bioDraft}
            onChange={(ev) => {
              setBioDraft(ev.target.value);
              if (bioFieldError) setBioFieldError("");
            }}
            disabled={bioSaving}
            rows={5}
          />
        )}
      </SettingsSaveField>

    </div>
  );
};

export default SettingsPlayerPage;

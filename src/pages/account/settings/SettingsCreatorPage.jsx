import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import api from "@/utils/api";
import CurationTypeSelector from "@/components/account/CurationTypeSelector/CurationTypeSelector";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { CreatorStatusBadge } from "@/components/common/display";
import { LinkIcon } from "@/components/common/icons/LinkIcon";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { buildCreatorStatGroups } from "@/utils/profileStatGroups";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import "./settingsSubPage.css";

const COLLAPSED_STAT_KEYS = ["chartsTotal", "chartsCreated", "totalChartClears"];

const SettingsCreatorPage = () => {
  const { t } = useTranslation("pages");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { difficultyDict, curationTypesDict } = useDifficultyContext();
  const creatorId = user?.creatorId != null ? Number(user.creatorId) : null;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** Live header badge ids while customizing; null = use saved profile ids only. */
  const [liveDisplayIds, setLiveDisplayIds] = useState(null);

  useEffect(() => {
    if (creatorId == null || !Number.isFinite(creatorId)) {
      setLoading(false);
      setProfile(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setError(null);
    const url = `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/profile`;
    api
      .get(url)
      .then((res) => {
        if (!mounted) return;
        setProfile(res.data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.status === 404 ? "not_found" : "error");
        setProfile(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [creatorId]);

  useEffect(() => {
    setLiveDisplayIds(null);
  }, [creatorId, profile?.displayCurationTypeIds]);

  const creatorDoc = profile?.creator || profile?.doc || profile;

  const canEditHeaderCurationSlots = useMemo(() => {
    if (!user || !creatorDoc || creatorId == null) return false;
    const linkedCreator = user.creatorId != null && Number(user.creatorId) === creatorId;
    const linkedUser = creatorDoc.user?.id && user.id === creatorDoc.user.id;
    return (
      linkedCreator ||
      Boolean(linkedUser) ||
      hasFlag(user, permissionFlags.SUPER_ADMIN) ||
      hasFlag(user, permissionFlags.HEAD_CURATOR)
    );
  }, [user, creatorDoc, creatorId]);

  const statGroups = useMemo(
    () => buildCreatorStatGroups(profile?.funFacts, t, difficultyDict || {}),
    [profile?.funFacts, t, difficultyDict],
  );

  const effectiveDisplayIds = liveDisplayIds ?? profile?.displayCurationTypeIds;

  const iconSlots = useMemo(
    () =>
      buildCreatorIconSlots(
        profile?.curationTypeCounts,
        curationTypesDict || {},
        effectiveDisplayIds,
      ),
    [profile?.curationTypeCounts, curationTypesDict, effectiveDisplayIds],
  );

  const handleDraftChange = useCallback((ids) => {
    setLiveDisplayIds(Array.isArray(ids) ? [...ids] : null);
  }, []);

  const handleDisplayCurationsSaved = useCallback((ids) => {
    setProfile((p) => (p && typeof p === "object" ? { ...p, displayCurationTypeIds: ids } : p));
    setLiveDisplayIds(null);
  }, []);

  const stats = profile?.stats || creatorDoc;

  if (!user?.creatorId) {
    return (
      <div className="settings-sub-page">
        <h2 className="settings-sub-page__title">{t("settings.creator.noCreatorTitle")}</h2>
        <p className="settings-sub-page__text">{t("settings.creator.noCreatorBody")}</p>
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

  if (error || !creatorDoc) {
    return (
      <div className="settings-sub-page">
        <h2 className="settings-sub-page__title">{t("settings.creator.loadErrorTitle")}</h2>
        <p className="settings-sub-page__text">{t("settings.creator.loadErrorBody")}</p>
        <button
          type="button"
          className="settings-sub-page__btn btn-fill-secondary"
          onClick={() => navigate(`/creator/${creatorId}`)}
        >
          {t("settings.creator.openPublicProfile")}
        </button>
      </div>
    );
  }

  return (
    <div className="settings-sub-page">
      {canEditHeaderCurationSlots ? (
        <p className="settings-sub-page__preview-hint">{t("settings.creator.previewHint")}</p>
      ) : null}

      <div className="settings-sub-page__header-preview">
        <ProfileHeader
          mode="creator"
          className="settings-sub-page__profile-header"
          iconSlots={iconSlots}
          avatarUrl={creatorDoc.user?.avatarUrl}
          fallbackAvatarUrl=""
          name={creatorDoc.name}
          handle={creatorDoc.user?.username}
          country={creatorDoc.user?.country || creatorDoc.country}
          badgeId={creatorDoc.id}
          badgeLabel="ID:"
          expandStatsAriaLabel={t("creators.profile.funFacts.expandAria")}
          collapseStatsAriaLabel={t("creators.profile.funFacts.collapseAria")}
          statGroups={statGroups}
          verificationBadge={
            creatorDoc.verificationStatus ? (
              <CreatorStatusBadge status={creatorDoc.verificationStatus} size="medium" />
            ) : null
          }
          statRows={COLLAPSED_STAT_KEYS.map((key) => ({
            key,
            label: t(`creators.profile.stats.${key}`),
            value: Math.trunc(Number(stats?.[key] ?? 0)).toLocaleString("en-US"),
          }))}
          actions={
            <button
              type="button"
              className="profile-header__action-btn"
              onClick={() => navigate(`/creator/${creatorId}`)}
              title={t("settings.creator.openPublicProfile")}
              aria-label={t("settings.creator.openPublicProfile")}
            >
              <LinkIcon color="var(--color-white)" size={24} />
            </button>
          }
        />
      </div>

      <h2 className="settings-sub-page__title">{t("settings.creator.title")}</h2>
      <p className="settings-sub-page__text">{t("settings.creator.intro")}</p>

      <div className="settings-sub-page__block">
        <CurationTypeSelector
          creatorId={creatorId}
          curationTypeCounts={profile?.curationTypeCounts}
          displayCurationTypeIds={profile?.displayCurationTypeIds}
          curationTypesDict={curationTypesDict || {}}
          canEdit={canEditHeaderCurationSlots}
          onSaved={handleDisplayCurationsSaved}
          onDraftChange={handleDraftChange}
        />
      </div>
    </div>
  );
};

export default SettingsCreatorPage;

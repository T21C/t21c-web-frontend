import "../accountProfilePage.css";
import "./creatorprofilepage.css";
import { useEffect, useMemo, useState } from "react";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildCreatorStatGroups, buildCreatorCollapsedStatRows } from "@/utils/profileStatGroups";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LevelContextProvider } from "@/contexts/LevelContext";
import { DifficultyGraph, MetaTags, CreatorStatusBadge } from "@/components/common/display";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { ScrollButton } from "@/components/common/buttons";
import { ChevronIcon, AdofaiIcon, EditIcon, ShieldIcon } from "@/components/common/icons";
import { CreatorManagementPopup } from "@/components/popups/Creators";
import LevelPage from "@/pages/common/Level/LevelPage/LevelPage";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import { toDifficultyGraphData } from "@/utils/statFormatters";

const CreatorProfilePage = () => {
  const { creatorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const { difficultyDict, curationTypesDict } = useDifficultyContext();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const [showManagementPopup, setShowManagementPopup] = useState(false);
  const [bioCollapsed, setBioCollapsed] = useState(false);
  const [levelsCollapsed, setLevelsCollapsed] = useState(false);
  const [difficultyCollapsed, setDifficultyCollapsed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setProfileLoading(true);
    setProfileError(null);
    const url = `${import.meta.env.VITE_CREATORS_V3}/${creatorId}/profile`;
    api.get(url)
      .then((res) => {
        if (!mounted) return;
        setProfile(res.data);
      })
      .catch((err) => {
        if (!mounted) return;
        setProfileError(err?.response?.status === 404 ? 'not_found' : 'error');
        console.error('Error fetching creator profile:', err);
      })
      .finally(() => {
        if (mounted) setProfileLoading(false);
      });
    return () => { mounted = false; };
  }, [creatorId, profileReloadKey]);

  // Pin the embedded level search to this creator. The hidden filter is
  // applied silently on every fetch and behaves like an `creatorId:<id>`
  // term tacked onto the user's query.
  const embeddedHiddenFilters = useMemo(
    () => ({ byCreatorId: creatorId }),
    [creatorId],
  );

  const statGroups = useMemo(
    () => buildCreatorStatGroups(profile?.funFacts, t, difficultyDict || {}),
    [profile?.funFacts, t, difficultyDict],
  );

  const creatorDoc = profile?.creator || profile?.doc || profile;

  const iconSlots = useMemo(
    () =>
      buildCreatorIconSlots(
        profile?.curationTypeCounts,
        curationTypesDict || {},
        profile?.displayCurationTypeIds,
      ),
    [profile?.curationTypeCounts, curationTypesDict, profile?.displayCurationTypeIds],
  );

  const difficultyGraphData = useMemo(
    () => toDifficultyGraphData(profile?.funFacts?.levelsByDifficulty, difficultyDict || {}, "levels"),
    [profile?.funFacts?.levelsByDifficulty, difficultyDict],
  );

  const canEditHeaderCurationSlots = useMemo(() => {
    if (!user || !creatorDoc) return false;
    const cid = Number(creatorId);
    const linkedCreator = user.creatorId != null && Number(user.creatorId) === cid;
    const linkedUser = creatorDoc.user?.id && user.id === creatorDoc.user.id;
    return (
      linkedCreator ||
      Boolean(linkedUser) ||
      hasFlag(user, permissionFlags.SUPER_ADMIN) ||
      hasFlag(user, permissionFlags.HEAD_CURATOR)
    );
  }, [user, creatorDoc, creatorId]);

  const stats = profile?.stats || creatorDoc;
  const collapsedCreatorStatRows = useMemo(
    () => buildCreatorCollapsedStatRows(stats, profile?.funFacts, t),
    [stats, profile?.funFacts, t],
  );

  const currentUrl = window.location.origin + location.pathname;

  if (profileLoading) {
    return (
      <div className="account-profile-page creator-profile-page">
        <div className="creator-profile-page__loading">
          <div className="loader loader-level-detail"></div>
        </div>
      </div>
    );
  }

  if (profileError || !creatorDoc) {
    return (
      <div className="account-profile-page creator-profile-page">
        <div className="creator-profile-page__notfound">
          <p>{t('creators.profile.notFound')}</p>
        </div>
      </div>
    );
  }

  const bioExpanded = !bioCollapsed;
  const levelsExpanded = !levelsCollapsed;
  const difficultyExpanded = !difficultyCollapsed;

  return (
    <div className="account-profile-page creator-profile-page">
      <MetaTags
        title={t('creators.profile.meta.title', { name: creatorDoc.name })}
        description={t('creators.profile.meta.description', { name: creatorDoc.name })}
        url={currentUrl}
        type="profile"
      />
      <ScrollButton />

      <div className="creator-profile-page__body page-content-70rem">
        <ProfileHeader
          mode="creator"
          className="creator-profile-page__profile-header"
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
              <CreatorStatusBadge
                status={creatorDoc.verificationStatus}
                size="medium"
              />
            ) : null
          }
          statRows={collapsedCreatorStatRows}
          actions={
            <>
              {creatorDoc.user?.playerId ? (
                <button
                  type="button"
                  className="profile-header__action-btn"
                  onClick={() => navigate(`/profile/${creatorDoc.user.playerId}`)}
                  title={t('creators.profile.linkToPlayer', { defaultValue: 'View player profile' })}
                  aria-label={t('creators.profile.linkToPlayer', { defaultValue: 'View player profile' })}
                >
                  <AdofaiIcon color="var(--color-white)" size={28} rotation={-25} />
                </button>
              ) : null}
              {canEditHeaderCurationSlots ? (
                <button
                  type="button"
                  className="profile-header__action-btn"
                  onClick={() => navigate("/settings/creator")}
                  title={t("profile.editProfile")}
                  aria-label={t("profile.editProfile")}
                >
                  <EditIcon color="var(--color-white)" size={32} />
                </button>
              ) : null}
              {hasFlag(user, permissionFlags.SUPER_ADMIN) ? (
                <button
                  type="button"
                  className="profile-header__action-btn"
                  onClick={() => setShowManagementPopup(true)}
                  title={t("profile.adminEdit")}
                  aria-label={t("profile.adminEdit")}
                >
                  <ShieldIcon color="var(--color-white)" size={32} />
                </button>
              ) : null}
            </>
          }
        />

        <section className="creator-profile-page__section">
          <div className="account-profile-page__section-title-row">
            <h2 className="account-profile-page__section-title">
              {t('creators.profile.bio.header')}
            </h2>
            <button
              type="button"
              className="account-profile-page__chevron-btn"
              aria-expanded={bioExpanded}
              aria-label={
                bioCollapsed
                  ? t('creators.profile.bio.expand', { defaultValue: 'Expand bio' })
                  : t('creators.profile.bio.collapse', { defaultValue: 'Collapse bio' })
              }
              onClick={() => setBioCollapsed((v) => !v)}
            >
              <ChevronIcon direction={bioExpanded ? 'down' : 'right'} />
            </button>
          </div>
          <div className={["account-profile-page__collapsible", bioCollapsed ? "hidden" : ""].join(" ").trim()}>
            <div className="creator-profile-page__bio">
              <p className="creator-profile-page__bio-placeholder">
                {t('creators.profile.bio.placeholder')}
              </p>
            </div>
          </div>
        </section>

        <section className="creator-profile-page__section creator-profile-page__section--levels">
          <div className="account-profile-page__section-title-row">
            <h2 className="account-profile-page__section-title">
              {t('creators.profile.levels.header')}
            </h2>
            <button
              type="button"
              className="account-profile-page__chevron-btn"
              aria-expanded={levelsExpanded}
              aria-label={
                levelsCollapsed
                  ? t('creators.profile.levels.expand', { defaultValue: 'Expand levels' })
                  : t('creators.profile.levels.collapse', { defaultValue: 'Collapse levels' })
              }
              onClick={() => setLevelsCollapsed((v) => !v)}
            >
              <ChevronIcon direction={levelsExpanded ? 'down' : 'right'} />
            </button>
          </div>

          {/*
            Embed the full LevelPage rather than re-implementing search/sort/filter.
            Each creator gets its own LevelContextProvider with a unique storage
            prefix, so filters/sort/query persist independently per profile and
            stay isolated from the global /levels page state. The byCreatorId
            hidden filter scopes results to this creator without exposing it in
            the UI.
          */}
          <div className={["creator-profile-page__levels-container", levelsCollapsed ? "hidden" : ""].join(" ").trim()}>
          <LevelContextProvider storagePrefix={`creator_${creatorId}_`}>
            <LevelPage
              embedded
              hiddenFilters={embeddedHiddenFilters}
              disabledFeatures={['myLikes']}
            />
          </LevelContextProvider>
          </div>
        </section>

        {difficultyGraphData.length > 0 ? (
          <section className="creator-profile-page__section creator-profile-page__section--difficulty">
            <div className="account-profile-page__section-title-row">
              <h2 className="account-profile-page__section-title">
                {t("creators.profile.sections.difficultyBreakdown.title")}
              </h2>
              <button
                type="button"
                className="account-profile-page__chevron-btn"
                aria-expanded={difficultyExpanded}
                aria-label={
                  difficultyCollapsed
                    ? t('creators.profile.sections.difficultyBreakdown.expand', { defaultValue: 'Expand difficulty breakdown' })
                    : t('creators.profile.sections.difficultyBreakdown.collapse', { defaultValue: 'Collapse difficulty breakdown' })
                }
                onClick={() => setDifficultyCollapsed((v) => !v)}
              >
                <ChevronIcon direction={difficultyExpanded ? 'down' : 'right'} />
              </button>
            </div>
            <div className={["account-profile-page__collapsible", difficultyCollapsed ? "hidden" : ""].join(" ").trim()}>
              <DifficultyGraph data={difficultyGraphData} mode="levels" />
            </div>
          </section>
        ) : null}
      </div>

      {showManagementPopup && (
        <CreatorManagementPopup
          creator={creatorDoc}
          curationProfileInitial={profile}
          onClose={() => setShowManagementPopup(false)}
          onUpdate={() => setProfileReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default CreatorProfilePage;

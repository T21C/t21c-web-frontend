import { routes } from '@/api/routes';
// tuf-search: #CreatorProfilePage #creatorProfilePage #account #creatorProfile
import "../accountProfilePage.css";
import "./creatorprofilepage.css";
import { useEffect, useMemo, useState } from "react";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildCreatorStatGroups, buildCreatorCollapsedStatRows } from "@/utils/profileStatGroups";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { MetaTags, CreatorStatusBadge } from "@/components/common/display";
import { buildCreatorMeta } from '@/utils/meta';
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import ProfileFollowButton from "@/components/account/ProfileFollowButton/ProfileFollowButton";
import { TournamentPlacementsSection } from "@/components/account/TournamentPlacements";
import {
  ProfileModulesRenderer,
  CreatorBioModule,
  CreatorDifficultyModule,
  CreatorChartsModule,
  FavoriteShowcase,
} from "@/components/account/ProfileModules";

import { ScrollButton } from "@/components/common/buttons";
import { AdofaiIcon, EditIcon, ShieldIcon, InfoIcon } from "@/components/common/icons";
import { CreatorManagementPopup } from "@/components/popups/Creators";
import { useScrollParent } from "@/components/common/VirtualList";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import { getCreatorCurationTypesForHeaderPanel } from "@/utils/curationTypeUtils";
import { toDifficultyGraphData } from "@/utils/statFormatters";
import {
  getEffectiveProfileBannerUrl,
  getEffectiveProfileHeaderSurface,
  isTufStellarAccessActive,
  normalizeTufStellarIconVariant,
} from "@/utils/profileBanners";
import { normalizeProfileAliasNames } from "@/utils/profileAliasNames";
import { Tooltip } from "react-tooltip";

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
  const [favoriteCollapsed, setFavoriteCollapsed] = useState(false);

  useEffect(() => {
    if (!user && !creatorId) {
      navigate('/creators', { replace: true });
    }
    if (user && !creatorId) {
      navigate(`/creator/${user.creatorId}`, { replace: true });
    }
  }, [user, creatorId, navigate]);

  useEffect(() => {
    if (creatorId == null || String(creatorId).trim() === '') {
      setProfileLoading(false);
      setProfile(null);
      setProfileError('not_found');
      return;
    }
    let mounted = true;
    setProfileLoading(true);
    setProfileError(null);
    const url = `${routes.creatorsV3.root()}/${creatorId}/profile`;
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
  // applied silently on every fetch and behaves like an `creator:name`
  // term tacked onto the user's query (charter/vfxer only).
  const { scrollRef: levelsScrollRef, scrollParent: levelsScrollParent } = useScrollParent();

  const embeddedHiddenFilters = useMemo(
    () => ({ byCreatorId: creatorId }),
    [creatorId],
  );

  const statGroups = useMemo(
    () => buildCreatorStatGroups(profile?.funFacts, t, difficultyDict || {}),
    [profile?.funFacts, t, difficultyDict],
  );

  const creatorDoc = profile?.creator || profile?.doc || profile;

  const creatorAliasNames = useMemo(
    () => normalizeProfileAliasNames(profile, creatorDoc?.name ?? profile?.creator?.name),
    [profile, creatorDoc?.name, profile?.creator?.name],
  );

  const uploadConditionsText =
    typeof profile?.uploadConditions === "string" && profile.uploadConditions.trim().length > 0
      ? profile.uploadConditions.trim()
      : "";

  const creatorHeaderSurface = useMemo(() => {
    if (!profile) return { style: null, imageAssets: {} };
    const u = profile.user || creatorDoc?.user;
    return getEffectiveProfileHeaderSurface({
      profileHeaderSurfaceStyle: profile.profileHeaderSurfaceStyle,
      profileHeaderSurfaceImageAssets: profile.profileHeaderSurfaceImageAssets,
      subjectUser: u,
    });
  }, [profile, creatorDoc]);

  const creatorBannerUrl = useMemo(() => {
    if (!profile) return null;
    const u = profile.user || creatorDoc?.user;
    return getEffectiveProfileBannerUrl({
      bannerPreset: profile.bannerPreset,
      customBannerUrl: profile.customBannerUrl,
      subjectUser: u,
    });
  }, [profile, creatorDoc]);

  const iconSlots = useMemo(
    () =>
      buildCreatorIconSlots(
        profile?.curationTypeCounts,
        curationTypesDict || {},
        profile?.displayCurationTypeIds,
      ),
    [profile?.curationTypeCounts, curationTypesDict, profile?.displayCurationTypeIds],
  );

  const creatorCurationPanelItems = useMemo(
    () => getCreatorCurationTypesForHeaderPanel(profile?.curationTypeCounts, curationTypesDict || {}),
    [profile?.curationTypeCounts, curationTypesDict],
  );

  const difficultyGraphData = useMemo(
    () => toDifficultyGraphData(profile?.funFacts?.levelsByDifficulty, difficultyDict || {}, "levels"),
    [profile?.funFacts?.levelsByDifficulty, difficultyDict],
  );

  const isOwnCreatorProfile = useMemo(() => {
    if (!user?.creatorId) return false;
    const cid = Number(creatorId);
    return Number.isFinite(cid) && Number(user.creatorId) === cid;
  }, [user?.creatorId, creatorId]);

  const stats = profile?.stats || creatorDoc;
  const collapsedCreatorStatRows = useMemo(
    () => buildCreatorCollapsedStatRows(stats, profile?.funFacts, t),
    [stats, profile?.funFacts, t],
  );

  const creatorMeta = useMemo(() => {
    if (!creatorDoc) return null;
    return buildCreatorMeta(creatorDoc, t, {
      pathname: location.pathname,
      creatorId,
      levelCount: profile?.funFacts?.totalLevels ?? 0,
    });
  }, [creatorDoc, t, location.pathname, creatorId, profile?.funFacts?.totalLevels]);

  const favoriteItems = useMemo(() => {
    const resolved = profile?.profileModulesResolved;
    if (!resolved || typeof resolved !== "object") return [];
    for (const row of Object.values(resolved)) {
      if (Array.isArray(row?.items)) return row.items;
    }
    return [];
  }, [profile?.profileModulesResolved]);

  const moduleEmptyContext = useMemo(
    () => ({
      profile,
      bioCanvasEntitled: isTufStellarAccessActive(profile?.user || creatorDoc?.user),
      difficultyGraphData,
      favoriteItems,
    }),
    [profile, creatorDoc?.user, difficultyGraphData, favoriteItems],
  );

  if (profileLoading) {
    return (
      <div className="account-profile-page creator-profile-page">
        <div className="creator-profile-page__loading">
          <div className="loader loader-relative"></div>
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

  return (
    <div className="account-profile-page creator-profile-page">
      {creatorMeta ? <MetaTags {...creatorMeta} /> : null}
      <ScrollButton />

      <div className="creator-profile-page__body page-content-70rem">
        <ProfileHeader
          mode="creator"
          className="creator-profile-page__profile-header"
          bannerUrl={creatorBannerUrl}
          headerSurfaceStyle={creatorHeaderSurface.style}
          headerSurfaceImageAssets={creatorHeaderSurface.imageAssets}
          iconSlots={iconSlots}
          creatorCurationPanelItems={creatorCurationPanelItems}
          avatarSubject={creatorDoc}
          avatarFrame={profile?.equippedAvatarFrame?.frame ?? null}
          stellarIconVariant={normalizeTufStellarIconVariant(creatorDoc?.tufStellarIconVariant)}

          name={creatorDoc.name}
          aliasNames={creatorAliasNames}
          handle={creatorDoc.user?.username}
          country={creatorDoc.user?.country || creatorDoc.country}
          badgeId={creatorDoc?.rank ?? creatorDoc?.chartsTotalRank}
          profileId={creatorDoc?.id}
          followerCount={profile?.followerCount}
          showFollowerCount={profile?.showFollowerCount !== false}
          followersUrl={creatorId ? routes.creatorsV3.followers(creatorId) : null}
          youtubeChannels={creatorDoc?.youtubeChannels ?? profile?.youtubeChannels}
          expandStatsAriaLabel={t("creators.profile.funFacts.expandAria")}
          collapseStatsAriaLabel={t("creators.profile.funFacts.collapseAria")}
          statGroups={statGroups}
          verificationBadge={
            creatorDoc.verificationStatus ? (
              <span className="creator-profile-page__verification-wrap">
                <CreatorStatusBadge
                  status={creatorDoc.verificationStatus}
                  size="medium"
                />
                {uploadConditionsText ? (
                  <>
                    <button
                      type="button"
                      className="creator-profile-page__upload-conditions-trigger"
                      data-tooltip-id={`creator-upload-conditions-${creatorId}`}
                      aria-label={t("creators.profile.uploadConditions.tooltipAria")}
                    >
                      <InfoIcon color="var(--color-white-t80)" size={20} />
                    </button>
                    <Tooltip
                      id={`creator-upload-conditions-${creatorId}`}
                      place="bottom"
                      className="creator-profile-page__upload-conditions-tooltip"
                      style={{ maxWidth: "min(28rem, 92vw)", zIndex: 20 }}
                    >
                      {uploadConditionsText}
                    </Tooltip>
                  </>
                ) : null}
              </span>
            ) : null
          }
          statRows={collapsedCreatorStatRows}
          actions={
            <>
              {!isOwnCreatorProfile ? (
                <ProfileFollowButton
                  following={profile?.isFollowing}
                  notifyLevel={profile?.notifyLevel}
                  followRoute={routes.creatorsV3.follow(creatorId)}
                  onFollowChange={({ following, followerCount: nextCount, notifyLevel }) => {
                    setProfile((p) =>
                      p && typeof p === "object"
                        ? {
                            ...p,
                            isFollowing: following,
                            notifyLevel: following ? notifyLevel : null,
                            ...(Number.isFinite(Number(nextCount))
                              ? { followerCount: Number(nextCount) }
                              : {}),
                          }
                        : p,
                    );
                  }}
                />
              ) : null}
              {isOwnCreatorProfile ? (
                <Link
                  className="profile-header__action-btn"
                  to="/settings/creator"
                  title={t("profile.editProfile")}
                  aria-label={t("profile.editProfile")}
                >
                  <EditIcon color="var(--color-white)" size={32} />
                </Link>
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
              {creatorDoc.user?.playerId ? (
                <Link
                  className="profile-header__action-btn"
                  to={`/profile/${creatorDoc.user.playerId}`}
                  title={t('creators.profile.linkToPlayer', { defaultValue: 'View player profile' })}
                  aria-label={t('creators.profile.linkToPlayer', { defaultValue: 'View player profile' })}
                >
                  <AdofaiIcon color="var(--color-white)" size={28} rotation={-25} />
                </Link>
              ) : null}

            </>
          }
        />

        <ProfileModulesRenderer
          kind="creator"
          profileModules={profile?.profileModules}
          isOwner={Boolean(user && isOwnCreatorProfile)}
          emptyContext={moduleEmptyContext}
          renderModule={(mod) => {
            if (mod.type === "bio") {
              return (
                <CreatorBioModule
                  profile={profile}
                  subjectUser={profile?.user || creatorDoc?.user}
                  collapsed={bioCollapsed}
                  onCollapsedChange={setBioCollapsed}
                />
              );
            }
            if (mod.type === "tournaments") {
              return (
                <TournamentPlacementsSection
                  placements={profile?.tournamentPlacements}
                  orderIds={profile?.placementOrderIds}
                  sectionClassName="creator-profile-page__section"
                />
              );
            }
            if (mod.type === "difficulty") {
              return (
                <CreatorDifficultyModule
                  graphData={difficultyGraphData}
                  collapsed={difficultyCollapsed}
                  onCollapsedChange={setDifficultyCollapsed}
                />
              );
            }
            if (mod.type === "charts") {
              return (
                <CreatorChartsModule
                  creatorId={creatorId}
                  creatorName={creatorDoc?.name || profile?.creator?.name || "creator"}
                  levelsCollapsed={levelsCollapsed}
                  setLevelsCollapsed={setLevelsCollapsed}
                  levelsScrollRef={levelsScrollRef}
                  levelsScrollParent={levelsScrollParent}
                  embeddedHiddenFilters={embeddedHiddenFilters}
                />
              );
            }
            if (mod.type === "favorite") {
              return (
                <FavoriteShowcase
                  items={profile?.profileModulesResolved?.[mod.id]?.items || []}
                  collapsed={favoriteCollapsed}
                  onCollapsedChange={setFavoriteCollapsed}
                  sectionClassName="creator-profile-page__section"
                />
              );
            }
            return null;
          }}
        />

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

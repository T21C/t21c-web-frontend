import "../accountProfilePage.css";
import "./creatorprofilepage.css";
import { useEffect, useMemo, useState } from "react";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildCreatorStatGroups, buildCreatorCollapsedStatRows } from "@/utils/profileStatGroups";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LevelContextProvider } from "@/contexts/LevelContext";
import { DifficultyGraph, MetaTags, CreatorStatusBadge } from "@/components/common/display";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { ScrollButton } from "@/components/common/buttons";
import { Tooltip } from "react-tooltip";
import { ChevronIcon, AdofaiIcon, EditIcon, ShieldIcon, InfoIcon } from "@/components/common/icons";
import { CreatorManagementPopup } from "@/components/popups/Creators";
import LevelPage from "@/pages/common/Level/LevelPage/LevelPage";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { buildCreatorIconSlots } from "@/utils/profileIconSlots";
import { getCreatorCurationTypesForHeaderPanel } from "@/utils/curationTypeUtils";
import { toDifficultyGraphData } from "@/utils/statFormatters";
import { getEffectiveProfileBannerUrl } from "@/utils/profileBanners";

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

  const creatorAliasNames = useMemo(() => {
    const out = [];
    const aliases = profile?.aliases;
    if (Array.isArray(aliases)) {
      for (const a of aliases) {
        const name = typeof a === "string" ? a : a?.name;
        if (typeof name === "string" && name.trim()) out.push(name.trim());
      }
    }
    const creatorAliases = profile?.creatorAliases;
    if (Array.isArray(creatorAliases)) {
      for (const a of creatorAliases) {
        const name = typeof a?.name === "string" ? a.name : "";
        if (name.trim()) out.push(name.trim());
      }
    }
    const unique = [...new Set(out.map((s) => s.trim()).filter(Boolean))];
    unique.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return unique;
  }, [profile?.aliases, profile?.creatorAliases]);

  const aliasesTooltipId =
    creatorAliasNames.length > 0 && creatorId != null
      ? `creator-aliases-${creatorId}`
      : null;

  const uploadConditionsText =
    typeof profile?.uploadConditions === "string" && profile.uploadConditions.trim().length > 0
      ? profile.uploadConditions.trim()
      : "";

  const creatorBannerUrl = useMemo(() => {
    if (!profile) return null;
    const u = profile.user || creatorDoc?.user;
    return getEffectiveProfileBannerUrl({
      bannerPreset: profile.bannerPreset,
      customBannerUrl: profile.customBannerUrl,
      subjectUser: { permissionFlags: u?.permissionFlags ?? 0 },
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
          bannerUrl={creatorBannerUrl}
          iconSlots={iconSlots}
          creatorCurationPanelItems={creatorCurationPanelItems}
          avatarUrl={creatorDoc.user?.avatarUrl}
          fallbackAvatarUrl=""
          name={creatorDoc.name}
          nameTooltipId={aliasesTooltipId}
          handle={creatorDoc.user?.username}
          country={creatorDoc.user?.country || creatorDoc.country}
          badgeId={creatorDoc.id}
          badgeLabel="ID:"
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

        {aliasesTooltipId ? (
          <Tooltip
            id={aliasesTooltipId}
            place="bottom"
            className="creator-profile-page__aliases-tooltip"
            style={{ maxWidth: "min(24rem, 92vw)", zIndex: 20 }}
          >
            <div className="creator-profile-page__aliases-tooltip-title">Aliases</div>
            <ul className="creator-profile-page__aliases-tooltip-list">
              {creatorAliasNames.map((name) => (
                <li key={name} className="creator-profile-page__aliases-tooltip-item">
                  {name}
                </li>
              ))}
            </ul>
          </Tooltip>
        ) : null}

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
              {typeof profile?.bio === 'string' && profile.bio.trim().length > 0 ? (
                <p className="creator-profile-page__bio-text">{profile.bio}</p>
              ) : (
                <p className="creator-profile-page__bio-placeholder">
                  {t('creators.profile.bio.placeholder')}
                </p>
              )}
            </div>
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
                    ? t('creators.profile.sections.difficultyBreakdown.expand')
                    : t('creators.profile.sections.difficultyBreakdown.collapse')

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

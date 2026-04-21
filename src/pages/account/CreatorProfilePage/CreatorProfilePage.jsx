import "./creatorprofilepage.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LevelContextProvider } from "@/contexts/LevelContext";
import { MetaTags, CreatorStatusBadge } from "@/components/common/display";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { ScrollButton } from "@/components/common/buttons";
import { ChevronIcon, AdofaiIcon } from "@/components/common/icons";
import { CreatorManagementPopup } from "@/components/popups/Creators";
import LevelPage from "@/pages/common/Level/LevelPage/LevelPage";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

const STAT_KEYS = [
  'chartsTotal',
  'chartsCreated',
  'chartsCharted',
  'chartsVfxed',
  'chartsTeamed',
  'totalChartClears',
  'totalChartLikes',
];

const CreatorProfilePage = () => {
  const { creatorId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('pages');
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const [showManagementPopup, setShowManagementPopup] = useState(false);
  const [levelsCollapsed, setLevelsCollapsed] = useState(false);

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

  const currentUrl = window.location.origin + location.pathname;
  const creatorDoc = profile?.creator || profile?.doc || profile;

  if (profileLoading) {
    return (
      <div className="creator-profile-page">
        <div className="creator-profile-page__loading">
          <div className="loader loader-level-detail"></div>
        </div>
      </div>
    );
  }

  if (profileError || !creatorDoc) {
    return (
      <div className="creator-profile-page">
        <div className="creator-profile-page__notfound">
          <p>{t('creators.profile.notFound')}</p>
        </div>
      </div>
    );
  }

  const stats = profile?.stats || creatorDoc;
  const isExpanded = !levelsCollapsed;

  return (
    <div className="creator-profile-page">
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
          className="profile-header--wide creator-profile-page__profile-header"
          avatarUrl={creatorDoc.user?.avatarUrl}
          fallbackAvatarUrl=""
          name={creatorDoc.name}
          handle={creatorDoc.user?.username}
          country={creatorDoc.user?.country || creatorDoc.country}
          badgeId={creatorDoc.id}
          badgeLabel="ID:"
          verificationBadge={
            creatorDoc.verificationStatus ? (
              <CreatorStatusBadge
                status={creatorDoc.verificationStatus}
                size="medium"
              />
            ) : null
          }
          statRows={STAT_KEYS.map((key) => ({
            key,
            label: t(`creators.profile.stats.${key}`),
            value: Math.trunc(Number(stats?.[key] ?? 0)).toLocaleString('en-US'),
          }))}
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
              {hasFlag(user, permissionFlags.SUPER_ADMIN) ? (
                <button
                  type="button"
                  className="profile-header__action-btn profile-header__action-btn--accent"
                  onClick={() => setShowManagementPopup(true)}
                >
                  {t('creators.profile.manageButton', { defaultValue: 'Manage' })}
                </button>
              ) : null}
            </>
          }
        />

        <section className="creator-profile-page__section">
          <h2 className="creator-profile-page__section-title">
            {t('creators.profile.bio.header')}
          </h2>
          <div className="creator-profile-page__bio">
            <p className="creator-profile-page__bio-placeholder">
              {t('creators.profile.bio.placeholder')}
            </p>
          </div>
        </section>

        <section className="creator-profile-page__section creator-profile-page__section--levels">
          <div className="creator-profile-page__section-title-row">
            <h2 className="creator-profile-page__section-title">
              {t('creators.profile.levels.header')}
            </h2>
            <button
              type="button"
              className="creator-profile-page__chevron-btn"
              aria-expanded={isExpanded}
              aria-label={
                levelsCollapsed
                  ? t('creators.profile.levels.expand', { defaultValue: 'Expand levels' })
                  : t('creators.profile.levels.collapse', { defaultValue: 'Collapse levels' })
              }
              onClick={() => setLevelsCollapsed((v) => !v)}
            >
              <ChevronIcon direction={isExpanded ? 'down' : 'right'} />
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
          onClose={() => setShowManagementPopup(false)}
          onUpdate={() => setProfileReloadKey((k) => k + 1)}
        />
      )}
    </div>
  );
};

export default CreatorProfilePage;

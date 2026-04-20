import "./creatorprofilepage.css";
import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "@/utils/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { LevelContextProvider } from "@/contexts/LevelContext";
import { UserAvatar } from "@/components/layout";
import { MetaTags, CreatorStatusBadge } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
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
  const { t } = useTranslation('pages');
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [profileReloadKey, setProfileReloadKey] = useState(0);
  const [showManagementPopup, setShowManagementPopup] = useState(false);

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
          <p>{t('creators.profile.loading')}</p>
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
        <header className="creator-profile-page__header">
          <div className="creator-profile-page__avatar">
            <UserAvatar
              primaryUrl={creatorDoc.user?.avatarUrl}
              fallbackUrl={null}
            />
          </div>
          <div className="creator-profile-page__title">
            <div className="creator-profile-page__name-row">
              <h1 className="creator-profile-page__name">{creatorDoc.name}</h1>
              {creatorDoc.verificationStatus && (
                <CreatorStatusBadge
                  status={creatorDoc.verificationStatus}
                  size="medium"
                  className="creator-profile-page__status"
                />
              )}
            </div>
            {creatorDoc.user?.username && (
              <span className="creator-profile-page__handle">@{creatorDoc.user.username}</span>
            )}
            <span className="creator-profile-page__id">ID: {creatorDoc.id}</span>
          </div>
          {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
            <div className="creator-profile-page__admin-actions">
              <button
                type="button"
                className="creator-profile-page__manage-btn"
                onClick={() => setShowManagementPopup(true)}
              >
                {t('creators.profile.manageButton', { defaultValue: 'Manage' })}
              </button>
            </div>
          )}
        </header>

        <section className="creator-profile-page__section">
          <h2 className="creator-profile-page__section-title">
            {t('creators.profile.stats.header')}
          </h2>
          <div className="creator-profile-page__stats">
            {STAT_KEYS.map((key) => (
              <div key={key} className="creator-profile-page__stat">
                <span className="creator-profile-page__stat-label">
                  {t(`creators.profile.stats.${key}`)}
                </span>
                <span className="creator-profile-page__stat-value">
                  {Math.trunc(Number(stats?.[key] ?? 0)).toLocaleString('en-US')}
                </span>
              </div>
            ))}
          </div>
        </section>

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
          <h2 className="creator-profile-page__section-title">
            {t('creators.profile.levels.header')}
          </h2>

          {/*
            Embed the full LevelPage rather than re-implementing search/sort/filter.
            Each creator gets its own LevelContextProvider with a unique storage
            prefix, so filters/sort/query persist independently per profile and
            stay isolated from the global /levels page state. The byCreatorId
            hidden filter scopes results to this creator without exposing it in
            the UI.
          */}
          <LevelContextProvider storagePrefix={`creator_${creatorId}_`}>
            <LevelPage
              embedded
              hiddenFilters={embeddedHiddenFilters}
              disabledFeatures={['myLikes']}
            />
          </LevelContextProvider>
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

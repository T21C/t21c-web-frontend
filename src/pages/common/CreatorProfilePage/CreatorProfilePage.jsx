import "./creatorprofilepage.css";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "@/utils/api";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useCreatorProfileContext } from "@/contexts/CreatorProfileContext";
import { LevelCard } from "@/components/cards";
import { UserAvatar } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { ScrollButton } from "@/components/common/buttons";
import { CustomSelect } from "@/components/common/selectors";
import { SortAscIcon, SortDescIcon } from "@/components/common/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import { formatNumber } from "@/utils";

const LIMIT = 30;

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

  const [levelsData, setLevelsData] = useState(null);
  const [totalLevels, setTotalLevels] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [pageNumber, setPageNumber] = useState(0);

  const cancelTokenRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const profileContext = useCreatorProfileContext();
  const settings = profileContext.getCreatorSettings(creatorId);
  const searchQuery = settings.searchQuery || '';
  const sortType = settings.sortType || 'RECENT_DESC';
  const sortOrder = settings.sortOrder || 'DESC';

  const setSearchQuery = (value) => profileContext.updateCreatorSettings(creatorId, { searchQuery: value });
  const setSortType = (value) => profileContext.updateCreatorSettings(creatorId, { sortType: value });
  const setSortOrder = (value) => profileContext.updateCreatorSettings(creatorId, { sortOrder: value });

  const sortOptions = [
    { value: 'RECENT', label: 'Recent' },
    { value: 'DIFF', label: 'Difficulty' },
    { value: 'CLEARS', label: 'Clears' },
    { value: 'LIKES', label: 'Likes' },
  ];

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
  }, [creatorId]);

  const fetchLevelsData = useCallback(async (resetPage = false) => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Request superseded');
    }
    const source = api.CancelToken.source();
    cancelTokenRef.current = source;

    try {
      const params = {
        limit: LIMIT,
        offset: resetPage ? 0 : pageNumber * LIMIT,
        query: searchQuery || '',
        sort: `${sortType}_${sortOrder}`,
        byCreatorId: creatorId,
        deletedFilter: 'hide',
        clearedFilter: 'show',
        availableDlFilter: 'show',
      };

      const response = await api.get(`${import.meta.env.VITE_LEVELS}`, {
        params,
        cancelToken: source.token,
      });

      const newLevels = response.data.results || [];
      setTotalLevels(response.data.total || 0);

      if (resetPage) {
        setLevelsData(newLevels);
        setPageNumber(0);
      } else {
        setLevelsData(prev => [...(prev || []), ...newLevels]);
      }

      setHasMore(Boolean(response.data.hasMore));
    } catch (error) {
      if (!api.isCancel(error)) {
        console.error('Error fetching creator levels:', error);
      }
    }
  }, [creatorId, searchQuery, sortType, sortOrder, pageNumber]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setLevelsData(null);
    debounceTimerRef.current = setTimeout(() => {
      fetchLevelsData(true);
    }, 400);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [creatorId, searchQuery, sortType, sortOrder]);

  useEffect(() => {
    if (pageNumber === 0) return;
    fetchLevelsData(false);
  }, [pageNumber]);

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
              {creatorDoc.isVerified && (
                <span className="creator-profile-page__verified" title={t('creators.profile.verified')}>
                  ✓
                </span>
              )}
            </div>
            {creatorDoc.user?.username && (
              <span className="creator-profile-page__handle">@{creatorDoc.user.username}</span>
            )}
            <span className="creator-profile-page__id">ID: {creatorDoc.id}</span>
          </div>
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
                  {formatNumber(stats?.[key] ?? 0)}
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

        <section className="creator-profile-page__section">
          <div className="creator-profile-page__levels-header">
            <h2 className="creator-profile-page__section-title">
              {t('creators.profile.levels.header')}
              <span className="creator-profile-page__levels-count"> ({totalLevels})</span>
            </h2>

            <div className="creator-profile-page__levels-controls">
              <input
                type="text"
                value={searchQuery}
                placeholder={t('creators.profile.levels.searchPlaceholder')}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="creator-profile-page__search-input"
              />

              <CustomSelect
                value={sortOptions.find(o => o.value === sortType) || sortOptions[0]}
                onChange={(opt) => setSortType(opt.value)}
                options={sortOptions}
                width="9rem"
              />

              <div className="creator-profile-page__sort-buttons">
                <SortAscIcon
                  style={{ backgroundColor: sortOrder === 'ASC' ? 'rgba(255,255,255,0.7)' : '' }}
                  onClick={() => setSortOrder('ASC')}
                />
                <SortDescIcon
                  style={{ backgroundColor: sortOrder === 'DESC' ? 'rgba(255,255,255,0.7)' : '' }}
                  onClick={() => setSortOrder('DESC')}
                />
              </div>
            </div>
          </div>

          {levelsData === null ? (
            <div className="loader loader-level-page"></div>
          ) : levelsData.length === 0 ? (
            <p className="creator-profile-page__levels-empty">
              {t('creators.profile.levels.empty')}
            </p>
          ) : (
            <InfiniteScroll
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              dataLength={levelsData.length}
              next={() => setPageNumber(prev => prev + 1)}
              hasMore={hasMore}
              loader={<div className="loader"></div>}
            >
              <div className="creator-profile-page__levels-list">
                {levelsData.map((level, idx) => (
                  <LevelCard
                    key={level.id ?? idx}
                    level={level}
                    user={user}
                    displayMode="list"
                  />
                ))}
              </div>
            </InfiniteScroll>
          )}
        </section>
      </div>
    </div>
  );
};

export default CreatorProfilePage;

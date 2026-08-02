import { routes } from '@/api/routes';
// tuf-search: #RatingPage #ratingPage #admin #rating — Rating Management

import { MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from '@/utils/meta';
import { StateDisplay } from "@/components/common/selectors";
import "./adminratingpage.css";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Link, useLocation } from 'react-router-dom';
import { VirtualList } from "@/components/common/VirtualList";
import { useAuth } from "@/contexts/AuthContext";
import { useRatingFilter } from "@/contexts/RatingFilterContext";
import { useTranslation } from "react-i18next";
import { RatingCard } from "@/components/cards";
import { EditLevelPopup } from "@/components/popups/Levels";
import { RaterManagementPopup, RatingDetailPopup, TopRatersPopup } from "@/components/popups/Rating";
import { ReferencesPopup } from "@/components/popups/Difficulties";
import { ScrollButton, ReferencesButton } from "@/components/common/buttons";
import { CustomSelect } from "@/components/common/selectors";
import api from "@/utils/api";
import { apiUrl } from '@/config/urls';
import { LeaderboardIcon, SortAscIcon, SortDescIcon } from "@/components/common/icons";
import { Tooltip } from "react-tooltip";
import { RatingHelpPopup } from "@/components/popups/Rating";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

const RATINGS_BATCH = 30;
const SEARCH_DEBOUNCE_MS = 300;

const RatingPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('rating.meta.title'),
        description: t('rating.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );
  const { user } = useAuth();
  const { 
    sortOrder, 
    hideRated, 
    lowDiffFilter,
    fourVoteFilter, 
    setHideRated, 
    setLowDiffFilter,
    setFourVoteFilter,
    sortType,
    setSortType,
    setSortOrder,
    searchQuery,
    setSearchQuery,
    showDetailedView,
    setShowDetailedView,
    showReferences,
    setShowReferences,
    showRaterManagement,
    setShowRaterManagement,
    showHelpPopup,
    setShowHelpPopup
  } = useRatingFilter();

  const [ratings, setRatings] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [selectedRating, setSelectedRating] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedManagers, setConnectedManagers] = useState(0);
  const [showTopRaters, setShowTopRaters] = useState(false);
  const [weeklyRaterActivity, setWeeklyRaterActivity] = useState([]);
  const fetchGenRef = useRef(0);
  const deepLinkHandledRef = useRef(false);
  const selectedRatingIdRef = useRef(null);
  const sseHandlersRef = useRef({});

  useEffect(() => {
    selectedRatingIdRef.current = selectedRating?.id ?? null;
  }, [selectedRating?.id]);

  useEffect(() => {
    // Clear immediately on keystroke; debounce only delays the request (LevelPage clears on query change too).
    if (searchQuery !== debouncedQuery) {
      setRatings(null);
      setHasMore(false);
      setOffset(0);
      setIsLoading(true);
      fetchGenRef.current += 1;
    }
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to searchQuery; compare against latest debounced value
  }, [searchQuery]);

  const buildListParams = useCallback((nextOffset) => {
    const params = {
      offset: nextOffset,
      limit: RATINGS_BATCH,
      sort: sortType,
      order: sortOrder,
      lowDiff: lowDiffFilter,
      fourVote: fourVoteFilter,
      hideRated: hideRated ? 'true' : 'false',
    };
    if (debouncedQuery) {
      params.query = debouncedQuery;
    }
    return params;
  }, [sortType, sortOrder, lowDiffFilter, fourVoteFilter, hideRated, debouncedQuery]);

  const normalizePageResults = (data) => {
    // New API: { results, total, hasMore }. Guard against accidental bare/non-array bodies.
    if (Array.isArray(data)) {
      return { results: data, total: data.length, hasMore: false };
    }
    if (data && typeof data === 'object' && Array.isArray(data.results)) {
      return {
        results: data.results,
        total: typeof data.total === 'number' ? data.total : data.results.length,
        hasMore: Boolean(data.hasMore),
      };
    }
    return { results: [], total: 0, hasMore: false };
  };

  const fetchRatingsPage = useCallback(async ({ append = false, nextOffset = 0 } = {}) => {
    const gen = ++fetchGenRef.current;
    if (append) {
      setIsLoadingMore(true);
    } else {
      // null = loading sentinel (same pattern as LevelPage); clears stale cards
      setRatings(null);
      setIsLoading(true);
      setOffset(0);
      setHasMore(false);
    }
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const listPromise = api.get(routes.admin.rating(), { params: buildListParams(nextOffset) });
      const weeklyPromise = append
        ? Promise.resolve(null)
        : api.get(`${routes.admin.statisticsRatingsPerUser()}?date=${weekAgo}&limit=1000`);

      const [ratingsResponse, weeklyActivityResponse] = await Promise.all([listPromise, weeklyPromise]);
      if (gen !== fetchGenRef.current) return;

      const page = normalizePageResults(ratingsResponse.data);
      const results = page.results;
      setTotalCount(page.total);
      setHasMore(page.hasMore);
      setOffset(nextOffset + results.length);

      if (append) {
        setRatings((prev) => {
          const base = Array.isArray(prev) ? prev : [];
          const existing = new Set(base.map((r) => r.id));
          const merged = [...base];
          for (const row of results) {
            if (!existing.has(row.id)) merged.push(row);
          }
          return merged;
        });
      } else {
        setRatings(results);
        if (weeklyActivityResponse?.data) {
          setWeeklyRaterActivity(weeklyActivityResponse.data.ratingsPerUser || []);
        }
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
      if (!append && gen === fetchGenRef.current) {
        setRatings([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      if (gen === fetchGenRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [buildListParams]);

  const reloadFromStart = useCallback(() => {
    return fetchRatingsPage({ append: false, nextOffset: 0 });
  }, [fetchRatingsPage]);

  const loadMoreRatings = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || ratings == null) return;
    fetchRatingsPage({ append: true, nextOffset: offset });
  }, [fetchRatingsPage, hasMore, isLoading, isLoadingMore, offset, ratings]);

  const patchRatingRow = useCallback((listRow) => {
    if (!listRow?.id) return;
    setRatings((prev) => {
      if (!Array.isArray(prev)) return prev;
      const idx = prev.findIndex((r) => r.id === listRow.id);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], ...listRow, level: listRow.level || next[idx].level };
      return next;
    });
    setSelectedRating((sel) => (sel?.id === listRow.id ? { ...sel, ...listRow } : sel));
  }, []);

  const removeRatingById = useCallback((ratingId) => {
    setRatings((prev) => (Array.isArray(prev) ? prev.filter((r) => r.id !== ratingId) : prev));
    setSelectedRating((sel) => (sel?.id === ratingId ? null : sel));
    setTotalCount((c) => Math.max(0, c - 1));
  }, []);

  const removeRatingByLevelId = useCallback((levelId) => {
    setRatings((prev) => (Array.isArray(prev) ? prev.filter((r) => r.level?.id !== levelId) : prev));
    setSelectedRating((sel) => (sel?.level?.id === levelId ? null : sel));
  }, []);

  const logUserCountChange = useCallback((total, managers) => {
    console.debug('SSE Client: User count update:', { total, managers });
    setConnectedUsers(total);
    setConnectedManagers(managers);
  }, []);

  // Keep SSE handlers on a ref so the EventSource effect does not reconnect on every fetch/filter change
  sseHandlersRef.current = {
    logUserCountChange,
    patchRatingRow,
    removeRatingById,
    removeRatingByLevelId,
    reloadFromStart,
  };

  useEffect(() => {
    reloadFromStart();
  }, [reloadFromStart]);

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const h = sseHandlersRef.current;

        switch (data.type) {
          case 'userCount':
            h.logUserCountChange(data.data.total, data.data.managers);
            break;
          case 'ratingUpdate': {
            const payload = data.data || {};
            if (payload.action === 'remove') {
              if (payload.ratingId) h.removeRatingById(payload.ratingId);
              else if (payload.levelId) h.removeRatingByLevelId(payload.levelId);
              break;
            }
            if (payload.listRow) {
              h.patchRatingRow(payload.listRow);
            }
            if (payload.complete && selectedRatingIdRef.current === payload.ratingId) {
              setSelectedRating(payload.complete);
            }
            break;
          }
          case 'levelUpdate': {
            const payload = data.data || {};
            if (!payload.levelId) break;
            if (payload.level == null || payload.level.toRate === false) {
              h.removeRatingByLevelId(payload.levelId);
              break;
            }
            setRatings((prev) =>
              Array.isArray(prev)
                ? prev.map((r) =>
                    r.level?.id === payload.levelId
                      ? { ...r, level: { ...r.level, ...payload.level } }
                      : r
                  )
                : prev
            );
            setSelectedRating((sel) =>
              sel?.level?.id === payload.levelId
                ? { ...sel, level: { ...sel.level, ...payload.level } }
                : sel
            );
            break;
          }
          case 'submissionUpdate':
            h.reloadFromStart();
            break;
          case 'ping':
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('SSE Client: Error processing message:', error);
      }
    };

    let eventSource = null;
    let reconnectTimeout = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const params = new URLSearchParams({ source: 'rating' });
      if (user?.id) {
        params.set('userId', user.id);
      }
      const url = `${apiUrl(routes.events())}?${params.toString()}`;
      eventSource = new EventSource(url, { withCredentials: true });
      eventSource.onopen = () => {
        setIsConnected(true);
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };
      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (!closed) {
          reconnectTimeout = setTimeout(connect, 5000);
        }
      };
      eventSource.onmessage = handleMessage;
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
      }
      setIsConnected(false);
      setConnectedUsers(0);
      setConnectedManagers(0);
    };
  }, [user?.id]);

  // Deep link #levelId → complete rating object
  useEffect(() => {
    if (deepLinkHandledRef.current) return;
    const hash = window.location.hash;
    const match = hash.match(/#(\d+)/);
    if (!match) return;
    deepLinkHandledRef.current = true;
    const levelId = parseInt(match[1], 10);
    (async () => {
      try {
        const { data } = await api.get(routes.admin.ratingByLevelId(levelId), {
          params: { completeObject: true },
        });
        if (data) setSelectedRating(data);
      } catch (err) {
        console.error('Error opening rating deep link:', err);
      }
    })();
  }, []);

  const handleLocalSort = (order) => {
    setSortOrder(order);
  };

  const handleEditLevel = (levelId) => {
    setSelectedLevel({ id: levelId, _ratingListMinimal: true });
    setOpenEditDialog(true);
  };

  const openRatingDetails = useCallback(async (rating) => {
    try {
      const { data } = await api.get(routes.admin.ratingById(rating.id), {
        params: { completeObject: true },
      });
      setSelectedRating(data || rating);
    } catch (err) {
      console.error('Error loading rating details:', err);
      setSelectedRating(rating);
    }
  }, []);

  const sortOptions = useMemo(() => [
    { value: 'id', label: t('rating.sort.byId') },
    { value: 'ratings', label: t('rating.sort.byRatings'), title: t('rating.sort.byRatingsFull') },
    { value: 'updatedAt', label: t('rating.sort.byDate') }
  ], [t]);

  const selectedSortOption = useMemo(() => 
    sortOptions.find(option => option.value === sortType),
    [sortOptions, sortType]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showHelpPopup) return;
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setRatings(null);
        reloadFromStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reloadFromStart, showHelpPopup]);

  if (user === undefined) {
    return (
      <div className="admin-rating-page">
        <MetaTags {...pageMeta} />
        <div className="admin-rating-body">
          <div className="loader-shell loader-shell--fill">
            <div className="loader loader-relative" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-rating-page">
      <MetaTags {...pageMeta} />

      <div className="admin-rating-body">
        <ScrollButton />
        <ReferencesButton />
        <div className="admin-buttons">
            <Link
              to="/rating/zen"
              className="admin-button"
            >
              {t('rating.buttons.zenMode', { defaultValue: 'Zen Mode' })}
            </Link>
            {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
              <>
                <button 
                  className="admin-button rater-management-button"
                  onClick={() => setShowRaterManagement(true)}
                >
                  {t('rating.buttons.manageRaters')}
                </button>
              </>
            )}
            <button 
              className="admin-button top-rater-button"
              onClick={() => setShowTopRaters(true)}
            >
              {t('rating.buttons.topRaters')} <LeaderboardIcon />
            </button>
          </div>
        <div className="view-controls">
          
          <div className="sort-controls">
            <CustomSelect
              options={sortOptions}
              value={selectedSortOption}
              onChange={(option) => setSortType(option.value)}
              width="14rem"
              menuPlacement="bottom"
              isSearchable={false}
            />
            <div className="sort-buttons">
              <Tooltip id="sa" place="top" noArrow>
                {t('rating.tooltips.sortAsc')}
              </Tooltip>
              <Tooltip id="sd" place="top" noArrow>
                {t('rating.tooltips.sortDesc')}
              </Tooltip>
              <SortAscIcon
                className="svg-fill"
                style={{
                  backgroundColor: sortOrder === 'ASC' ? "rgba(255, 255, 255, 0.4)" : "",
                }}
                onClick={() => handleLocalSort('ASC')}
                data-tooltip-id="sa"
              />
              <SortDescIcon
                className="svg-fill"
                style={{
                  backgroundColor: sortOrder === 'DESC' ? "rgba(255, 255, 255, 0.4)" : "",
                }}
                onClick={() => handleLocalSort('DESC')}
                data-tooltip-id="sd"
              />
            </div>
          </div>
          {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
            <div className="view-mode-toggle">
              <span className="toggle-label">{t('rating.toggles.detailedView.label')}</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={showDetailedView}
                  onChange={(e) => setShowDetailedView(e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          )}
          <div className="view-mode-toggle">
            <span className="toggle-label">{t('rating.toggles.hideRated.label')}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={hideRated}
                onChange={(e) => setHideRated(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
            <StateDisplay
              currentState={lowDiffFilter}
              states={['show','hide',  'only']}
              onChange={setLowDiffFilter}
              label={t('rating.toggles.lowDiff.label')}
              width={60}
            />
            <StateDisplay
              currentState={fourVoteFilter}
              states={['hide', 'show', 'only']}
              onChange={setFourVoteFilter}
              label={t('rating.toggles.fourVote.label')}
              width={60}
            />
        </div>


            <div className="ratings-header">
              <div className="search-container">
                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  className="search-input"
                  type="text"
                  placeholder={t('rating.search.placeholder')}
                  name="rating-level-search"
                  autoComplete="off"
                  aria-autocomplete="none"
                  data-form-type="other"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="ratings-header-container">
              <button 
                className="help-button"
                onClick={() => setShowHelpPopup(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M12 3C7.04 3 3 7.04 3 12C3 16.96 7.04 21 12 21C16.96 21 21 16.96 21 12C21 7.04 16.96 3 12 3ZM12 19.5C7.86 19.5 4.5 16.14 4.5 12C4.5 7.86 7.86 4.5 12 4.5C16.14 4.5 19.5 7.86 19.5 12C19.5 16.14 16.14 19.5 12 19.5ZM14.3 7.7C14.91 8.31 15.25 9.13 15.25 10C15.25 10.87 14.91 11.68 14.3 12.3C13.87 12.73 13.33 13.03 12.75 13.16V13.5C12.75 13.91 12.41 14.25 12 14.25C11.59 14.25 11.25 13.91 11.25 13.5V12.5C11.25 12.09 11.59 11.75 12 11.75C12.47 11.75 12.91 11.57 13.24 11.24C13.57 10.91 13.75 10.47 13.75 10C13.75 9.53 13.57 9.09 13.24 8.76C12.58 8.1 11.43 8.1 10.77 8.76C10.44 9.09 10.26 9.53 10.26 10C10.26 10.41 9.92 10.75 9.51 10.75C9.1 10.75 8.76 10.41 8.76 10C8.76 9.13 9.1 8.32 9.71 7.7C10.94 6.47 13.08 6.47 14.31 7.7H14.3ZM13 16.25C13 16.8 12.55 17.25 12 17.25C11.45 17.25 11 16.8 11 16.25C11 15.7 11.45 15.25 12 15.25C12.55 15.25 13 15.7 13 16.25Z" fill="#ffffff"></path> </g></svg>
                {t('rating.buttons.help')}
              </button>
              <div className="ratings-count">
                {t('rating.labels.totalRatings', { count: totalCount })}
              </div>
              <div className={`connected-users ${isConnected ? 'connected' : 'disconnected'}`}>
                <div className={`indicator`} />
                {isConnected ? (
                  <>
                    {t('rating.labels.connectedUsers', { count: connectedUsers })}
                    {connectedManagers > 0 && (
                      <span className="manager-count">
                        {t('rating.labels.connectedManagers', { count: connectedManagers })}
                      </span>
                    )}
                  </>
                ) : t('rating.labels.disconnected')}
              </div>
              </div>
            </div>
          {Array.isArray(ratings) && ratings.length > 0 ? (
          <>
            <VirtualList
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              items={ratings}
              loadMore={loadMoreRatings}
              hasMore={hasMore && ratings.length > 0}
              loadingMore={isLoadingMore}
              listClassName="rating-cards"
              loader={<div className="loader loader-relative" />}
              endMessage={
                ratings.length > 0 && !hasMore && (
                  <p className="end-message">
                    <b>{t('rating.infiniteScroll.end')}</b>
                  </p>
                )
              }
              renderItem={(rating, index) => (
                <RatingCard
                  rating={rating}
                  index={index}
                  setSelectedRating={openRatingDetails}
                  user={user}
                  isSuperAdmin={hasFlag(user, permissionFlags.SUPER_ADMIN)}
                  showDetailedView={showDetailedView}
                  onEditLevel={() => handleEditLevel(rating.level.id)}
                />
              )}
              computeItemKey={(index, rating) => rating?.id ?? index}
            />
          </>
        ) : 
        Array.isArray(ratings) && ratings.length === 0 && !isLoading ? (
          <div className="all-rated-message">
            <h2>{t('rating.messages.noRatings.title')}</h2>
            <p>{t('rating.messages.noRatings.subtitle')}</p>
          </div>
        ) : (
          <div className="loader loader-offset"/>
        )}

            {selectedRating && (
              <RatingDetailPopup
                selectedRating={selectedRating}
                setSelectedRating={setSelectedRating}
                setShowReferences={setShowReferences}
                ratings={Array.isArray(ratings) ? ratings : []}
                setRatings={setRatings}
                user={user}
                isSuperAdmin={hasFlag(user, permissionFlags.SUPER_ADMIN)}
                weeklyRaterActivity={weeklyRaterActivity}
              />
            )}

            {openEditDialog && selectedLevel && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
              <EditLevelPopup
                level={selectedLevel}
                onClose={() => {
                  setOpenEditDialog(false);
                  setSelectedLevel(null);
                }}
                onUpdate={(updatedData) => {
                  if (updatedData) {
                    if (updatedData.permanentDelete && updatedData.deletedLevelId != null) {
                      const rid = updatedData.deletedLevelId;
                      removeRatingByLevelId(rid);
                      setOpenEditDialog(false);
                      setSelectedLevel(null);
                      return;
                    }
                    const updatedLevel = updatedData.level || updatedData;
                    const shouldRemove = updatedLevel.toRate === false;
                    if (shouldRemove) {
                      removeRatingByLevelId(updatedLevel.id);
                    } else {
                      setRatings(prev =>
                        Array.isArray(prev)
                          ? prev.map(rating =>
                              rating.level.id === updatedLevel.id
                                ? {
                                    ...rating,
                                    level: {
                                      ...rating.level,
                                      ...updatedLevel
                                    }
                                  }
                                : rating
                            )
                          : prev
                      );
                    }
                  }
                  setOpenEditDialog(false);
                  setSelectedLevel(null);
                }}
              />
            )}

        {showReferences && (
          <ReferencesPopup onClose={() => setShowReferences(false)} />
        )}

        {showRaterManagement && hasFlag(user, permissionFlags.SUPER_ADMIN) && (
          <RaterManagementPopup 
            onClose={() => setShowRaterManagement(false)}
            currentUser={user}
          />
        )}

        {showHelpPopup && (
          <RatingHelpPopup onClose={() => setShowHelpPopup(false)} />
        )}

        {showTopRaters && (
          <TopRatersPopup onClose={() => setShowTopRaters(false)} />
        )}
      </div>
    </div>
  );
};

export default RatingPage;

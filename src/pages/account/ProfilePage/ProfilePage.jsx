import "../accountProfilePage.css"
import "./profilePage.css"
import api from "@/utils/api";
import axios from "axios";
import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom"
import { formatNumber } from "@/utils";
import { DifficultyGraph, MetaTags } from "@/components/common/display";
import { ScoreCard } from "@/components/cards";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPlayerPopup } from "@/components/popups/Users";
import { ShieldIcon, EditIcon, SortAscIcon, SortDescIcon, PackIcon, EyeIcon, EyeOffIcon, ChevronIcon } from "@/components/common/icons";
import { CaseOpenSelector, CustomSelect } from "@/components/common/selectors";
import caseOpen from "@/assets/icons/case.png";
import InfiniteScroll from "react-infinite-scroll-component";
import { ScrollButton } from "@/components/common/buttons";
import { useProfileContext } from "@/contexts/ProfileContext";
import { useDebouncedRequest } from "@/hooks/useDebouncedRequest";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { CreatorIcon } from "@/components/common/icons/CreatorIcon";
import { AccountStatusBanners } from "@/components/account/AccountStatusBanners/AccountStatusBanners";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildPlayerStatGroups } from "@/utils/profileStatGroups";
import { buildPlayerIconSlots } from "@/utils/profileIconSlots";
import { toDifficultyGraphData } from "@/utils/statFormatters";
import { getEffectiveProfileBannerUrl } from "@/utils/profileBanners";
const ENABLE_ROULETTE = import.meta.env.VITE_APRIL_FOOLS === "true";

const PASSES_PER_PAGE = 50;

const ProfilePage = () => {
    const params = useParams()
    let playerId = params.playerId
    const [playerData, setPlayerData] = useState(null)
    const [showCaseOpen, setShowCaseOpen] = useState(false);
    const { t } = useTranslation('pages');
    const { user } = useAuth();
    const [showEditPopup, setShowEditPopup] = useState(false);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;
    const navigate = useNavigate();
    const [isSpinning, setIsSpinning] = useState(false);

    // Server-paginated passes (infinite scroll).
    const [displayedPasses, setDisplayedPasses] = useState([]);
    const [passesTotal, setPassesTotal] = useState(0);
    const [passesInitialLoading, setPassesInitialLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [showHiddenPasses, setShowHiddenPasses] = useState(false);
    const [bioCollapsed, setBioCollapsed] = useState(false);
    const [scoresCollapsed, setScoresCollapsed] = useState(false);
    const [difficultyCollapsed, setDifficultyCollapsed] = useState(false);
    const [includeDupes, setIncludeDupes] = useState(false);
    const runPassesRequest = useDebouncedRequest(350);
    // Guard against stale responses when filters change mid-flight.
    const passesRequestIdRef = useRef(0);

    const isOwnProfile = !playerId || Number(playerId) === user?.playerId;

    if (!playerId) {
      playerId = user?.playerId;
    }

    useEffect(() => {
      const urlPlayerId = params.playerId;
      if (!urlPlayerId && user?.playerId) {
        navigate(`/profile/${user.playerId}`, { replace: true });
      }
    }, [params.playerId, user?.playerId, navigate]);
    
    // Get context for search and sort state (per player)
    const profileContext = useProfileContext();
    const { difficultyDict, difficulties } = useDifficultyContext();
    const currentSettings = profileContext.getPlayerSettings(playerId);
    
    const searchQuery = currentSettings.searchQuery;
    const sortType = currentSettings.sortType || 'score';
    const sortOrder = currentSettings.sortOrder || 'DESC';
    
    const setSearchQuery = (query) => profileContext.setSearchQuery(playerId, query);
    const setSortType = (type) => profileContext.setSortType(playerId, type);
    const setSortOrder = (order) => profileContext.setSortOrder(playerId, order);

    var valueLabels = {
      rankedScore: t('profile.valueLabels.rankedScore'),
      generalScore: t('profile.valueLabels.generalScore'),
      averageXacc: t('profile.valueLabels.averageXacc'),
      worldsFirstCount: t('profile.valueLabels.worldsFirstCount'),
    };

    useEffect(() => {
        const id =
          playerId != null && playerId !== ''
            ? Number(playerId)
            : NaN;
        if (!Number.isFinite(id) || id <= 0) {
          return;
        }
        const fetchPlayer = async () => {
          try {
            const qs =
              isOwnProfile && showHiddenPasses
                ? '?showHidden=true'
                : '';
            const response = await api.get(
              `${import.meta.env.VITE_PLAYERS_V3}/${id}/profile${qs}`,
            );
            setPlayerData(response.data);

          } catch (error) {
            console.error('Error fetching player data:', error);
          }
        };

        fetchPlayer();
      }, [playerId, isOwnProfile, showHiddenPasses]);

      // Passes are served from a paginated endpoint so we only fetch what is
      // visible. Sorting and searching happen server-side; the infinite
      // scroll handler below pulls the next page as the user scrolls.
      const fetchPassesPage = async (offset, { immediate = false } = {}) => {
        if (!playerId) return;
        const params = new URLSearchParams({
          limit: String(PASSES_PER_PAGE),
          offset: String(offset),
          sortBy: sortType,
          order: sortOrder,
        });
        if (searchQuery) params.append('query', searchQuery);
        if (isOwnProfile && showHiddenPasses) params.append('showHidden', 'true');

        const url = `${import.meta.env.VITE_PLAYERS_V3}/${playerId}/passes?${params.toString()}`;
        const requestId = ++passesRequestIdRef.current;
        const runner = immediate ? runPassesRequest.flush : runPassesRequest;
        if (offset === 0) setPassesInitialLoading(true);
        try {
          const response = await runner(({ signal }) => api.get(url, { signal }));
          if (requestId !== passesRequestIdRef.current) return;
          const results = Array.isArray(response.data?.passes) ? response.data.passes : [];
          const total = Number(response.data?.total) || 0;
          setPassesTotal(total);
          if (offset === 0) {
            setDisplayedPasses(results);
          } else {
            setDisplayedPasses(prev => [...prev, ...results]);
          }
          setHasMore((offset + results.length) < total);
        } catch (error) {
          if (axios.isCancel(error)) return;
          console.error('Error fetching player passes:', error);
          if (requestId === passesRequestIdRef.current && offset === 0) {
            setDisplayedPasses([]);
            setPassesTotal(0);
            setHasMore(false);
          }
        } finally {
          if (requestId === passesRequestIdRef.current && offset === 0) {
            setPassesInitialLoading(false);
          }
        }
      };

      useEffect(() => {
        if (!playerId) {
          setDisplayedPasses([]);
          setPassesTotal(0);
          setHasMore(false);
          return;
        }
        // Reset the list when filter inputs change; fetch the first page.
        setDisplayedPasses([]);
        setHasMore(true);
        fetchPassesPage(0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [playerId, searchQuery, sortType, sortOrder, showHiddenPasses]);

      const handlePlayerUpdate = (updatedPlayer) => {
        setPlayerData(updatedPlayer);
      };

      const handleAdminEditClick = () => {
        if (!playerData) {
          console.error('No player data available');
          return;
        }
        setShowEditPopup(true);
      };

      const handleCreatorUserLinkedUpdate = () => {
        if (isOwnProfile && user) {
          window.dispatchEvent(new CustomEvent('auth:permission-changed'));
        }
      };

      const handleSearchForOther = () => {
        navigate('/leaderboard');
      }

      const handleCaseOpenClick = () => {
        setShowCaseOpen(true);
      };

      const handleCaseOpenClose = () => {
        setShowCaseOpen(false);
      };

      const handleViewUserPacks = () => {
        const handle = playerData?.user?.username;
        if (handle) {
          window.packSearchContext = {
            query: `owner:${handle}`,
            timestamp: Date.now()
          };
          navigate('/packs');
        }
      };

      /*
      const handleDiscordRoleRefresh = async () => {
        try {
          // Determine which user ID to sync
          let targetUserId;
          let response;
          
          if (hasFlag(user, permissionFlags.SUPER_ADMIN)) {
            // Super admin can sync any user's roles
            if (!playerData?.user?.id) {
              toast.error(t('profile.discordRoleSync.errors.noUser'));
              return;
            }
            targetUserId = playerData.user.id;
            response = await api.post(`/v2/admin/discord/sync/user/${targetUserId}`);
          } else {
            // Non-admin users can only sync their own roles
            if (!user?.id) {
              toast.error(t('profile.discordRoleSync.errors.noUser'));
              return;
            }
            targetUserId = user.id;
            response = await api.post(`/v2/auth/profile/sync-roles`);
          }


          if (response.data?.success) {
            toast.success(
              hasFlag(user, permissionFlags.SUPER_ADMIN) 
                ? t('profile.discordRoleSync.success.other')
                : t('profile.discordRoleSync.success.own')
            );
          }
          else {
            toast.error(t('profile.discordRoleSync.errors.generic'));
          }
        } catch (error) {
          
          if (error.response?.status === 429 && error.response?.data?.retryAfter) {
            // Format retryAfter (which is in ms) into MM:SS
            const retryAfterMs = error.response?.data?.retryAfter;
            let retryAfterFormatted = retryAfterMs;
            if (typeof retryAfterMs === 'number' && !isNaN(retryAfterMs) && retryAfterMs > 0) {
              const totalSeconds = Math.ceil(retryAfterMs / 1000);
              const minutes = Math.floor(totalSeconds / 60);
              const seconds = totalSeconds % 60;
              retryAfterFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
            toast.error(t('profile.discordRoleSync.errors.tooManyRequests', { retryAfter: retryAfterFormatted }));
          } else {
            const errorMessage = error.response?.data?.error || error.message || t('profile.discordRoleSync.errors.generic');
            toast.error(errorMessage);
          }
        }
      };
      */

      const lowestImpactScore = playerData?.topScores?.reduce((minItem, score) =>
        minItem == null || score.impact < minItem.impact ? score : minItem
      , null);

      const scoresExpanded = !scoresCollapsed;
      const difficultyExpanded = !difficultyCollapsed;
      const bioExpanded = !bioCollapsed;

      // Sort options are pure labels now — ordering is resolved server-side.
      const sortOptions = useMemo(() => [
        { value: 'score', label: t('profile.sort.byScore') },
        { value: 'impact', label: t('profile.sort.byImpact') },
        { value: 'speed', label: t('profile.sort.bySpeed') },
        { value: 'date', label: t('profile.sort.byDate') },
        { value: 'xacc', label: t('profile.sort.byXacc') },
        { value: 'difficulty', label: t('profile.sort.byDifficulty') },
      ], [t]);

      const selectedSortOption = useMemo(
        () => sortOptions.find(option => option.value === sortType),
        [sortOptions, sortType]
      );

      const statGroups = useMemo(
        () => buildPlayerStatGroups(playerData?.funFacts, t),
        [playerData?.funFacts, t],
      );

      const clearsByDifficultyForHeader =
        playerData?.funFacts?.clearsByDifficultyNoDupes ?? playerData?.funFacts?.clearsByDifficulty;

      const iconSlots = useMemo(
        () => buildPlayerIconSlots(
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

      const profileBannerUrl = useMemo(() => {
        if (!playerData) return null;
        return getEffectiveProfileBannerUrl({
          bannerPreset: playerData.bannerPreset,
          customBannerUrl: playerData.customBannerUrl,
          subjectUser: { permissionFlags: playerData.user?.permissionFlags ?? 0 },
        });
      }, [playerData]);

      const difficultyGraphDataWithDupes = useMemo(
        () => toDifficultyGraphData(playerData?.funFacts?.clearsByDifficulty, difficultyDict || {}, "passes"),
        [playerData?.funFacts?.clearsByDifficulty, difficultyDict],
      );

      const difficultyGraphDataNoDupes = useMemo(
        () => toDifficultyGraphData(playerData?.funFacts?.clearsByDifficultyNoDupes, difficultyDict || {}, "passes"),
        [playerData?.funFacts?.clearsByDifficultyNoDupes, difficultyDict],
      );

      // Swap the reference directly so recharts animates between the two
      // datasets (same length/order, only `passCount` values change).
      const difficultyGraphData = includeDupes
        ? difficultyGraphDataWithDupes
        : difficultyGraphDataNoDupes;

      const loadMorePasses = () => {
        if (displayedPasses.length >= passesTotal) {
          setHasMore(false);
          return;
        }
        // Subsequent pages skip the debounce — they are a direct response to
        // the user scrolling and would feel laggy otherwise.
        fetchPassesPage(displayedPasses.length, { immediate: true });
      };

      // Conditional renders after all hooks
      if (playerId && !playerData) {
        return (
          <div className="account-profile-page player-page">
            <div className="player-body" style={{height: "85vh"}}>
              <div className="loader"/>  
            </div>
          </div>
        );
      }

      if (!playerId && !user) {
        return (
          <div className="account-profile-page player-page">
            <MetaTags
              title={t('profile.meta.defaultTitle')}
              description={t('profile.meta.description')}
              url={currentUrl}
              image={'/default-avatar.jpg'}
              type="profile"
          />
            <div className="player-body" style={{height: "85vh"}}>
                <h1 className="player-notfound">{t('profile.notLoggedIn')}</h1>
                <h2 className="player-search-for-other" onClick={handleSearchForOther}>{t('profile.searchForOther')}</h2>
            </div>  
          </div>
        );
      }

      return (
        <>
        {user && isOwnProfile ? (
          <AccountStatusBanners variant="profile" user={user} navigate={navigate} />
        ) : null}
        <div className="account-profile-page player-page">
          <MetaTags
            title={playerData?.name ? t('profile.meta.title', { name: playerData.name }) : t('profile.meta.defaultTitle')}
            description={t('profile.meta.description', { name: playerData?.name || 'Unknown Player' })}
            url={currentUrl}
            image={playerData?.user?.avatarUrl || playerData?.pfp || '/default-avatar.jpg'}
            type="profile"
          />
          
          <ScrollButton />

          {playerData != null ? (Object.keys(playerData).length > 0 ? (
            <div className="player-body">
              <div className="player-content">
                <div className="player-page__hero">
                  {ENABLE_ROULETTE ? (
                    <button
                      type="button"
                      className="case-open-button"
                      onClick={handleCaseOpenClick}
                      disabled={!user && !playerId}
                    >
                      <img src={caseOpen} alt="Case Open" />
                    </button>
                  ) : null}
                  <ProfileHeader
                    mode="player"
                    className="player-page__profile-header"
                    bannerUrl={profileBannerUrl}
                    iconSlots={iconSlots}
                    playerDifficultyPanelDifficulties={difficulties}
                    playerDifficultyPanelClearsByDifficulty={clearsByDifficultyForHeader}
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
                        {user && isOwnProfile ? (
                          <Link
                            className="profile-header__action-btn"
                            to="/settings/player"
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
                            onClick={handleAdminEditClick}
                            title={t("profile.adminEdit")}
                            aria-label={t("profile.adminEdit")}
                          >
                            <ShieldIcon color="var(--color-white)" size={32} />
                          </button>
                        ) : null}
                        
                        {playerData?.user?.username ? (
                          <button
                            type="button"
                            className="profile-header__action-btn"
                            onClick={handleViewUserPacks}
                            title={t("profile.viewUserPacks")}
                            aria-label={t("profile.viewUserPacks")}
                          >
                            <PackIcon color="var(--color-white)" size={32} />
                          </button>
                        ) : null}
                        {playerData?.user?.creator?.id ? (
                          <Link
                            className="profile-header__action-btn"
                            to={`/creator/${playerData.user.creator.id}`}
                            title={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                            aria-label={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                          >
                            <CreatorIcon color="var(--color-white)" size={28} />
                          </Link>
                        ) : null}
                      </>
                    }
                  />
                </div>
              </div>

              <section className="player-page__section">
                <div className="account-profile-page__section-title-row">
                  <h2 className="account-profile-page__section-title">{t('profile.bio.header')}</h2>
                  <button
                    type="button"
                    className="account-profile-page__chevron-btn"
                    aria-expanded={bioExpanded}
                    aria-label={
                      bioCollapsed
                        ? t('profile.bio.expand', { defaultValue: 'Expand bio' })
                        : t('profile.bio.collapse', { defaultValue: 'Collapse bio' })
                    }
                    onClick={() => setBioCollapsed((v) => !v)}
                  >
                    <ChevronIcon direction={bioExpanded ? 'down' : 'right'} />
                  </button>
                </div>
                <div className={["account-profile-page__collapsible", bioCollapsed ? "hidden" : ""].join(" ").trim()}>
                  <div className="player-page__bio">
                    {typeof playerData?.bio === 'string' && playerData.bio.trim().length > 0 ? (
                      <p className="player-page__bio-text">{playerData.bio}</p>
                    ) : (
                      <p className="player-page__bio-placeholder">{t('profile.bio.placeholder')}</p>
                    )}
                  </div>
                </div>
              </section>

              {difficultyGraphData.length > 0 ? (
                <section className="player-page__difficulty-section">
                  <div className="account-profile-page__section-title-row">
                    <h2 className="account-profile-page__section-title">{t("profile.sections.difficultyBreakdown.title")}</h2>
                    <button
                      type="button"
                      className="account-profile-page__chevron-btn"
                      aria-expanded={difficultyExpanded}
                      aria-label={
                        difficultyCollapsed
                          ? t('profile.sections.difficultyBreakdown.expand')
                          : t('profile.sections.difficultyBreakdown.collapse')
                      }
                      onClick={() => setDifficultyCollapsed((v) => !v)}
                    >
                      <ChevronIcon direction={difficultyExpanded ? 'down' : 'right'} />
                    </button>
                  </div>
                  <div style={{ overflow: "visible" }} className={["account-profile-page__collapsible", "player-page__difficulty-collapsible", difficultyCollapsed ? "hidden" : ""].join(" ").trim()}>
                    <label className="player-page__difficulty-dupes-toggle">
                      <input
                        type="checkbox"
                        checked={includeDupes}
                        onChange={(e) => setIncludeDupes(e.target.checked)}
                      />
                      <span>{t('profile.sections.difficultyBreakdown.includeDupes')}</span>
                    </label>
                    <DifficultyGraph data={difficultyGraphData} mode="passes" />
                  </div>
                </section>
              ) : null}

              {(passesInitialLoading || displayedPasses.length > 0 || passesTotal > 0 || (playerData?.funFacts?.counts?.totalPasses ?? 0) > 0) && (
                <div className="scores-section">
                  <div className="account-profile-page__section-title-row">
                    <h2 className="account-profile-page__section-title">{t('profile.sections.scores.title')}</h2>
                    <button
                      type="button"
                      className="account-profile-page__chevron-btn"
                      aria-expanded={scoresExpanded}
                      aria-label={
                        scoresCollapsed
                          ? t('profile.sections.scores.expand', { defaultValue: 'Expand scores' })
                          : t('profile.sections.scores.collapse', { defaultValue: 'Collapse scores' })
                      }
                      onClick={() => setScoresCollapsed((v) => !v)}
                    >
                      <ChevronIcon direction={scoresExpanded ? 'down' : 'right'} />
                    </button>
                  </div>

                  <div
                    id="player-scores-scroll-container"
                    className={["player-page__scores-container", scoresCollapsed ? "hidden" : ""].join(" ").trim()}
                  >
                  <div className="scores-controls">
                    <div className="search-container">
                      <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <input
                        type="text"
                        className="search-input"
                        placeholder={t('profile.search.placeholder')}
                        name="search"
                        autoComplete="off"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="scores-controls-row">
                      <div className="sort-controls">
                        <CustomSelect
                          options={sortOptions}
                          value={selectedSortOption}
                          onChange={(option) => setSortType(option.value)}
                          width="12rem"
                          menuPlacement="bottom"
                          isSearchable={false}
                        />
                        <div className="sort-buttons">
                          <SortAscIcon
                            className="svg-fill"
                            style={{
                              backgroundColor: sortOrder === 'ASC' ? "rgba(255, 255, 255, 0.4)" : "",
                            }}
                            onClick={() => setSortOrder('ASC')}
                          />
                          <SortDescIcon
                            className="svg-fill"
                            style={{
                              backgroundColor: sortOrder === 'DESC' ? "rgba(255, 255, 255, 0.4)" : "",
                            }}
                            onClick={() => setSortOrder('DESC')}
                          />
                        </div>
                      </div>
                      
                      {isOwnProfile && (
                        <button
                          className="toggle-hidden-passes-button"
                          onClick={() => setShowHiddenPasses(!showHiddenPasses)}
                          title={showHiddenPasses ? t('profile.hideHiddenPasses') : t('profile.showHiddenPasses')}
                        >
                          {showHiddenPasses ? <EyeIcon size="20px" /> : <EyeOffIcon size="20px" />}
                        </button>
                      )}
                    </div>
                    
                    <div className="results-count">
                      {t('profile.labels.totalPasses', { count: passesTotal })}
                    </div>
                  </div>

                  {passesInitialLoading && displayedPasses.length === 0 ? (
                    <div className="scores-section__list-loading" aria-busy="true" aria-live="polite">
                      <div className="loader loader-relative" />
                    </div>
                  ) : (
                  <InfiniteScroll
                    dataLength={displayedPasses.length}
                    next={loadMorePasses}
                    hasMore={hasMore}
                    endMessage={
                      displayedPasses.length > 0 && (
                        <p style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <b>{t('profile.infiniteScroll.end')}</b>
                        </p>
                      )
                    }
                    loader={<div className="loader loader-relative"/>}
                    scrollableTarget="player-scores-scroll-container"
                    style={{ overflow: 'visible', paddingBottom: '6rem' }}
                  >
                    <div className="scores-list">
                      {displayedPasses.map((score, index) => (
                        <div key={index}>
                        <li key={index}>
                          <ScoreCard scoreData={score} topScores={playerData?.topScores || []} potentialTopScores={playerData?.potentialTopScores || []} />
                        </li>
                        {lowestImpactScore && lowestImpactScore.id === score.id && passesTotal > 20 && sortType === 'score' && sortOrder === 'DESC' && (
                          <div className="lowest-impact-score-indicator">
                            <p>
                              {(() => {
                                const text = t('profile.sections.scores.lowestImpactScore');
                                const parts = text.split('{{score}}');
                                return (
                                  <>
                                    {parts[0]}
                                    <b style={{color: '#0f0'}}>{(score.scoreV2+0.01).toFixed(2)}PP</b>
                                    {parts[1]}
                                  </>
                                );
                              })()}
                            </p>
                          </div>
                        )}
                        </div>
                      ))}
                    </div>
                  </InfiniteScroll>
                  )}
                  </div>
                </div>
              )}
            </div>
          ) : <h1 className="player-notfound">{t('profile.notFound')}</h1>)
          : <div className="loader"></div>}
          
          {showEditPopup && playerData && (
            <AdminPlayerPopup
              player={playerData}
              onClose={() => setShowEditPopup(false)}
              onUpdate={handlePlayerUpdate}
              onCreatorUserLinkedUpdate={handleCreatorUserLinkedUpdate}
            />
          )}

          {showCaseOpen && ENABLE_ROULETTE && (
            <div className={`case-open-popup ${isSpinning ? 'case-open-popup--spinning' : ''}`}>
              <div className="case-open-popup__overlay" onClick={!isSpinning ? handleCaseOpenClose : undefined}></div>
              <div className="case-open-popup__content">
                <CaseOpenSelector 
                  targetPlayerId={playerId || user?.playerId} 
                  onClose={handleCaseOpenClose}
                  isSpinning={setIsSpinning}
                />
              </div>
            </div>
          )}

        </div>
        </>
      );
}

export default ProfilePage
import "./profilePage.css"
import api from "@/utils/api";
import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { formatNumber } from "@/utils";
import { MetaTags } from "@/components/common/display";
import { ScoreCard } from "@/components/cards";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPlayerPopup } from "@/components/popups/Users";
import { ShieldIcon, EditIcon, SortAscIcon, SortDescIcon, PackIcon, EyeIcon, EyeOffIcon } from "@/components/common/icons";
import { CaseOpenSelector, CustomSelect } from "@/components/common/selectors";
import caseOpen from "@/assets/icons/case.png";
import InfiniteScroll from "react-infinite-scroll-component";
import { ScrollButton } from "@/components/common/buttons";
import { useProfileContext } from "@/contexts/ProfileContext";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { CreatorIcon } from "@/components/common/icons/CreatorIcon";
import { AccountStatusBanners } from "@/components/account/AccountStatusBanners/AccountStatusBanners";
import ProfileHeader from "@/components/account/ProfileHeader/ProfileHeader";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildPlayerStatGroups } from "@/utils/profileStatGroups";
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
    
    // Infinite scroll state
    const [displayedPasses, setDisplayedPasses] = useState([]);
    const [hasMore, setHasMore] = useState(true);
    const [showHiddenPasses, setShowHiddenPasses] = useState(false);

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
    const { difficultyDict } = useDifficultyContext();
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
        const fetchPlayer = async () => {
          try {
            const response = await api.get(`${import.meta.env.VITE_PLAYERS_V3}/${playerId}/profile`);
            setPlayerData(response.data);

          } catch (error) {
            console.error('Error fetching player data:', error);
          }
        };
      
        fetchPlayer();
      }, [playerId]);

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

      const sortByScore = (a, b) => {
        return sortOrder === 'DESC' ? (b.scoreV2 || 0) - (a.scoreV2 || 0) : (a.scoreV2 || 0) - (b.scoreV2 || 0);
      }
      // Define sort options (extendable)
      const sortOptions = useMemo(() => [
        { value: 'score', label: t('profile.sort.byScore'), sortFn: sortByScore },
        { value: 'speed', label: t('profile.sort.bySpeed'), sortFn: (a, b) => {
          const speedA = a.speed || 0;
          const speedB = b.speed || 0;
          if (speedA !== speedB) {
            return sortOrder === 'DESC' ? speedB - speedA : speedA - speedB;
          }
          return sortByScore(a, b);
        }},
        { value: 'date', label: t('profile.sort.byDate'), sortFn: (a, b) => {
          const dateA = new Date(a.vidUploadTime).getTime() || 0;
          const dateB = new Date(b.vidUploadTime).getTime() || 0;
          if (dateA !== dateB) {
            return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
          }
          return sortByScore(a, b);
        }},
        { value: 'xacc', label: t('profile.sort.byXacc'), sortFn: (a, b) => {
          const xaccA = a.judgements?.accuracy || 0;
          const xaccB = b.judgements?.accuracy || 0;
          if (xaccA !== xaccB) {
            return sortOrder === 'DESC' ? xaccB - xaccA : xaccA - xaccB;
          }
          return sortByScore(a, b);
        }},
        { 
          value: 'difficulty', 
          label: t('profile.sort.byDifficulty'), 
          sortFn: (a, b) => {
            // First: PGU difficulties sorted before others
            const diffA = difficultyDict[a.level?.diffId];
            const diffB = difficultyDict[b.level?.diffId];
            const typeA = diffA?.type === "PGU" ? 0 : 1;
            const typeB = diffB?.type === "PGU" ? 0 : 1;
            if (typeA !== typeB) {
              return sortOrder !== 'DESC' ? typeB - typeA : typeA - typeB;
            }

            const sortOrderA = diffA?.sortOrder || 0;
            const sortOrderB = diffB?.sortOrder || 0;
            if (sortOrderA !== sortOrderB) {
              return sortOrder === 'DESC' ? sortOrderB - sortOrderA : sortOrderA - sortOrderB;
            }

            const baseScoreA = a.level?.baseScore || diffA?.baseScore || 0;
            const baseScoreB = b.level?.baseScore || diffB?.baseScore || 0;
            if (baseScoreA !== baseScoreB) {
              return sortOrder !== 'DESC' ? baseScoreB - baseScoreA : baseScoreA - baseScoreB;
            }
          }
        }
      ], [t, sortOrder, playerData?.topScores, difficultyDict]);

      const selectedSortOption = useMemo(() => 
        sortOptions.find(option => option.value === sortType),
        [sortOptions, sortType]
      );

      const statGroups = useMemo(
        () => buildPlayerStatGroups(playerData?.funFacts, t, difficultyDict || {}),
        [playerData?.funFacts, t, difficultyDict],
      );

      // Define searchable fields (extendable)
      const searchableFields = useMemo(() => ({
        song: (pass) => pass.level?.song?.toLowerCase() || '',
        artist: (pass) => pass.level?.artist?.toLowerCase() || '',
        difficulty: (pass) => difficultyDict[pass.level?.diffId]?.name?.toLowerCase() || '',
        creators: (pass) => pass.level?.levelCredits?.map(credit => 
          credit.creator?.name?.toLowerCase() || ''
        ).join(' ') || '',
        team: (pass) => pass.level?.teamObject?.name?.toLowerCase() || '',
      }), [difficultyDict]);

      // Filtered and sorted passes
      const filteredAndSortedPasses = useMemo(() => {
        if (!playerData?.passes) return [];


        let filtered = playerData.passes;
        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered
          .filter(pass => {
            return Object.values(searchableFields).some(fieldFn => 
              fieldFn(pass).includes(query)
            );
          })
          .filter(pass => {
            // Always filter out deleted passes
            if (pass.isDeleted) return false;
            
            // Filter hidden passes based on toggle state (only for own profile)
              // If toggle is off, hide hidden passes
              if (showHiddenPasses && pass.isHidden) return false;
              // For other profiles, always hide hidden passes
              if (pass.isHidden) return false;
            
            return true;
          });
        }

        // Apply sorting
        const sortFn = sortOptions.find(opt => opt.value === sortType)?.sortFn;
        if (sortFn) {
          filtered = [...filtered].sort((a, b) => (b.id - a.id)).sort(sortFn);
        }

        return filtered;
      }, [playerData?.passes, searchQuery, sortType, sortOrder, sortOptions, searchableFields, showHiddenPasses, isOwnProfile]);

      // Update displayed passes when filter/sort changes (not when filteredAndSortedPasses object changes)
      useEffect(() => {
        if (filteredAndSortedPasses.length > 0) {
          setDisplayedPasses(filteredAndSortedPasses.slice(0, PASSES_PER_PAGE));
          setHasMore(filteredAndSortedPasses.length > PASSES_PER_PAGE);
        } else {
          setDisplayedPasses([]);
          setHasMore(false);
        }
      }, [searchQuery, sortType, sortOrder, showHiddenPasses, playerData?.passes]);

      // Load more passes for infinite scroll
      const loadMorePasses = () => {
        if (displayedPasses.length >= filteredAndSortedPasses.length) {
          setHasMore(false);
          return;
        }
        const currentLength = displayedPasses.length;
        const nextPasses = filteredAndSortedPasses.slice(currentLength, currentLength + PASSES_PER_PAGE);
        if (nextPasses.length > 0) {
          setDisplayedPasses(prev => [...prev, ...nextPasses]);
          setHasMore(currentLength + nextPasses.length < filteredAndSortedPasses.length);
        } else {
          setHasMore(false);
        }
      };

      // Conditional renders after all hooks
      if (playerId && !playerData) {
        return (
          <div className="player-page">
            <div className="player-body" style={{height: "85vh"}}>
              <div className="loader"/>  
            </div>
          </div>
        );
      }

      if (!playerId && !user) {
        return (
          <div className="player-page">
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
        <div className="player-page">
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
                          <button
                            type="button"
                            className="profile-header__action-btn"
                            onClick={() => navigate("/profile/edit")}
                            title={t("profile.editProfile")}
                            aria-label={t("profile.editProfile")}
                          >
                            <EditIcon color="var(--color-white)" size={"24px"} />
                          </button>
                        ) : null}
                        {hasFlag(user, permissionFlags.SUPER_ADMIN) ? (
                          <button
                            type="button"
                            className="profile-header__action-btn"
                            onClick={handleAdminEditClick}
                            title={t("profile.adminEdit")}
                            aria-label={t("profile.adminEdit")}
                          >
                            <ShieldIcon color="var(--color-white)" size={"24px"} />
                          </button>
                        ) : null}
                        {playerData?.user?.creator?.id ? (
                          <button
                            type="button"
                            className="profile-header__action-btn"
                            onClick={() => navigate(`/creator/${playerData.user.creator.id}`)}
                            title={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                            aria-label={t("profile.linkToCreator", { defaultValue: "View creator profile" })}
                          >
                            <CreatorIcon color="var(--color-white)" size={24} />
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
                            <PackIcon color="var(--color-white)" size={"24px"} />
                          </button>
                        ) : null}
                      </>
                    }
                  />
                </div>
              </div>
              {playerData?.passes && playerData.passes.length > 0 && (
                <div className="scores-section">
                  <h2>{t('profile.sections.scores.title')}</h2>
                  
                  {/* Search and Sort Controls */}
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
                      {t('profile.labels.totalPasses', { count: filteredAndSortedPasses.length })}
                    </div>
                  </div>

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
                    scrollableTarget="scrollableDiv"
                    style={{ overflow: 'visible' }}
                  >
                    <div className="scores-list">
                      {displayedPasses.map((score, index) => (
                        <div key={index}>
                        <li key={index}>
                          <ScoreCard scoreData={score} topScores={playerData?.topScores || []} potentialTopScores={playerData?.potentialTopScores || []} />
                        </li>
                        {lowestImpactScore && lowestImpactScore.id === score.id && playerData?.passes?.length > 20 && sortType === 'score' && sortOrder === 'DESC' && (
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
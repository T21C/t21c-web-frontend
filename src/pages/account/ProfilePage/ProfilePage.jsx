import "./profilePage.css"
import api from "@/utils/api";
import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom"
import { isoToEmoji, formatNumber } from "@/utils";
import { CompleteNav, UserAvatar } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { ScoreCard } from "@/components/cards";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AdminPlayerPopup, CreatorAssignmentPopup } from "@/components/popups";
import { DefaultAvatar, ShieldIcon, EditIcon, SearchIcon, SortAscIcon, SortDescIcon } from "@/components/common/icons";
import { CaseOpenSelector, CustomSelect } from "@/components/common/selectors";
import caseOpen from "@/assets/icons/case.png";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import InfiniteScroll from "react-infinite-scroll-component";
import { ScrollButton } from "@/components/common/buttons";
import { useProfileContext } from "@/contexts/ProfileContext";
const ENABLE_ROULETTE = import.meta.env.VITE_APRIL_FOOLS === "true";

const PASSES_PER_PAGE = 20;

const parseRankColor = (rank) => {
  var clr;
  switch(rank) {
    case 1: clr = "#efff63"; break;
    case 2: clr = "#eeeeee"; break;
    case 3: clr = "#ff834a"; break;
    default: clr = "#777777"; break;
  }
  return clr
}

const ProfilePage = () => {
    let {playerId} = useParams()
    const [playerData, setPlayerData] = useState(null)
    const [showCaseOpen, setShowCaseOpen] = useState(false);
    const { t } = useTranslation('pages');
    const tProfile = (key, params = {}) => t(`profile.${key}`, params);
    const { user } = useAuth();
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [showCreatorAssignment, setShowCreatorAssignment] = useState(false);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;
    const navigate = useNavigate();
    const [isSpinning, setIsSpinning] = useState(false);
    
    // Infinite scroll state
    const [displayedPasses, setDisplayedPasses] = useState([]);
    const [hasMore, setHasMore] = useState(true);

    const isOwnProfile = !playerId || Number(playerId) === user?.playerId;

    if (!playerId) {
      playerId = user?.playerId;
    }
    
    // Get context for search and sort state (per player)
    const profileContext = useProfileContext();
    const currentSettings = profileContext.getPlayerSettings(playerId);
    
    const searchQuery = currentSettings.searchQuery;
    const sortType = currentSettings.sortType || 'score';
    const sortOrder = currentSettings.sortOrder || 'DESC';
    
    const setSearchQuery = (query) => profileContext.setSearchQuery(playerId, query);
    const setSortType = (type) => profileContext.setSortType(playerId, type);
    const setSortOrder = (order) => profileContext.setSortOrder(playerId, order);
    

    var valueLabels = {
      rankedScore: tProfile('valueLabels.rankedScore'),
      generalScore: tProfile('valueLabels.generalScore'),
      ppScore: tProfile('valueLabels.ppScore'),
      wfScore: tProfile('valueLabels.wfScore'),
      score12K: tProfile('valueLabels.score12K'),
      averageXacc: tProfile('valueLabels.averageXacc'),
      totalPasses: tProfile('valueLabels.totalPasses'),
      universalPassCount: tProfile('valueLabels.universalPassCount'),
      worldsFirstCount: tProfile('valueLabels.worldsFirstCount'),
      topDiff: tProfile('valueLabels.topDiff'),
      top12kDiff: tProfile('valueLabels.top12kDiff')
    };

    useEffect(() => {
        const fetchPlayer = async () => {
          try {
            const response = await api.get(import.meta.env.VITE_PLAYERS+"/"+playerId);
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

      const handleCreatorAssignmentClick = () => {
        setShowCreatorAssignment(true);
      };

      const handleCreatorAssignmentClose = () => {
        setShowCreatorAssignment(false);
      };

      const handleCreatorAssignmentUpdate = () => {
        // Refresh player data to get updated creator information
        if (playerId) {
          const fetchPlayer = async () => {
            try {
              const response = await api.get(import.meta.env.VITE_PLAYERS+"/"+playerId);
              setPlayerData(response.data);
            } catch (error) {
              console.error('Error fetching updated player data:', error);
            }
          };
          fetchPlayer();
        }
        
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
        if (playerData?.username) {
          // Use window context to pass the search query
          window.packSearchContext = {
            query: `owner:${playerData.username}`,
            timestamp: Date.now()
          };
          navigate('/packs');
        }
      };

      const lowestImpactScore = playerData?.topScores?.reduce((minItem, score) =>
        minItem == null || score.impact < minItem.impact ? score : minItem
      , null);

      const sortByScore = (a, b) => {
        return sortOrder === 'DESC' ? (b.scoreV2 || 0) - (a.scoreV2 || 0) : (a.scoreV2 || 0) - (b.scoreV2 || 0);
      }
      // Define sort options (extendable)
      const sortOptions = useMemo(() => [
        { value: 'score', label: tProfile('sort.byScore'), sortFn: sortByScore },
        { value: 'speed', label: tProfile('sort.bySpeed'), sortFn: (a, b) => {
          const speedA = a.speed || 0;
          const speedB = b.speed || 0;
          if (speedA !== speedB) {
            return sortOrder === 'DESC' ? speedB - speedA : speedA - speedB;
          }
          return sortByScore(a, b);
        }},
        { value: 'date', label: tProfile('sort.byDate'), sortFn: (a, b) => {
          const dateA = new Date(a.vidUploadTime).getTime() || 0;
          const dateB = new Date(b.vidUploadTime).getTime() || 0;
          if (dateA !== dateB) {
            return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
          }
          return sortByScore(a, b);
        }},
        { value: 'xacc', label: tProfile('sort.byXacc'), sortFn: (a, b) => {
          const xaccA = a.judgements?.accuracy || 0;
          const xaccB = b.judgements?.accuracy || 0;
          if (xaccA !== xaccB) {
            return sortOrder === 'DESC' ? xaccB - xaccA : xaccA - xaccB;
          }
          return sortByScore(a, b);
        }},
        { 
          value: 'difficulty', 
          label: tProfile('sort.byDifficulty'), 
          sortFn: (a, b) => {
            // First: .difficulty.type == "PGU" sorted before others
            const typeA = a.level?.difficulty?.type === "PGU" ? 0 : 1;
            const typeB = b.level?.difficulty?.type === "PGU" ? 0 : 1;
            if (typeA !== typeB) {
              return sortOrder !== 'DESC' ? typeB - typeA : typeA - typeB;
            }

            const sortOrderA = a.level?.difficulty?.sortOrder || 0;
            const sortOrderB = b.level?.difficulty?.sortOrder || 0;
            if (sortOrderA !== sortOrderB) {
              return sortOrder === 'DESC' ? sortOrderB - sortOrderA : sortOrderA - sortOrderB;
            }

            const baseScoreA = a.level?.baseScore || a.level?.difficulty?.baseScore || 0;
            const baseScoreB = b.level?.baseScore || b.level?.difficulty?.baseScore || 0;
            if (baseScoreA !== baseScoreB) {
              return sortOrder !== 'DESC' ? baseScoreB - baseScoreA : baseScoreA - baseScoreB;
            }
          }
        }
      ], [tProfile, sortOrder, playerData?.topScores]);

      const selectedSortOption = useMemo(() => 
        sortOptions.find(option => option.value === sortType),
        [sortOptions, sortType]
      );

      // Define searchable fields (extendable)
      const searchableFields = useMemo(() => ({
        song: (pass) => pass.level?.song?.toLowerCase() || '',
        artist: (pass) => pass.level?.artist?.toLowerCase() || '',
        difficulty: (pass) => pass.level?.difficulty?.name?.toLowerCase() || '',
        creators: (pass) => pass.level?.levelCredits?.map(credit => 
          credit.creator?.name?.toLowerCase() || ''
        ).join(' ') || '',
        team: (pass) => pass.level?.teamObject?.name?.toLowerCase() || '',
      }), []);

      // Filtered and sorted passes
      const filteredAndSortedPasses = useMemo(() => {
        if (!playerData?.passes) return [];

        let filtered = playerData.passes.filter(pass => !pass.isDeleted);

        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(pass => {
            return Object.values(searchableFields).some(fieldFn => 
              fieldFn(pass).includes(query)
            );
          });
        }

        // Apply sorting
        const sortFn = sortOptions.find(opt => opt.value === sortType)?.sortFn;
        if (sortFn) {
          filtered = [...filtered].sort(sortFn);
        }

        return filtered;
      }, [playerData?.passes, searchQuery, sortType, sortOrder, sortOptions, searchableFields]);

      // Update displayed passes when filter/sort changes
      useEffect(() => {
        if (filteredAndSortedPasses.length > 0) {
          setDisplayedPasses(filteredAndSortedPasses.slice(0, PASSES_PER_PAGE));
          setHasMore(filteredAndSortedPasses.length > PASSES_PER_PAGE);
        } else {
          setDisplayedPasses([]);
          setHasMore(false);
        }
      }, [playerData?.passes, searchQuery, sortType, sortOrder]);

      // Load more passes for infinite scroll
      const loadMorePasses = () => {
        const currentLength = displayedPasses.length;
        const nextPasses = filteredAndSortedPasses.slice(currentLength, currentLength + PASSES_PER_PAGE);
        setDisplayedPasses(prev => [...prev, ...nextPasses]);
        setHasMore(currentLength + PASSES_PER_PAGE < filteredAndSortedPasses.length);
      };

      // Conditional renders after all hooks
      if (playerId && !playerData) {
        return (
          <div className="player-page">
            <CompleteNav />
            <div className="background-level"></div>
            <div className="loader"/>  
          </div>
        );
      }

      if (!playerId && !user) {
        return (
          <div className="player-page">
            <MetaTags
              title={tProfile('meta.defaultTitle')}
              description={tProfile('meta.description')}
              url={currentUrl}
              image={'/default-avatar.jpg'}
              type="profile"
          />
            <CompleteNav />
            <div className="background-level"></div>
            <h1 className="player-notfound">{tProfile('notLoggedIn')}</h1>
            <h2 className="player-search-for-other" onClick={handleSearchForOther}>{tProfile('searchForOther')}</h2>
          </div>
        );
      }

      return (
        <div className="player-page">
          <MetaTags
            title={playerData?.name ? tProfile('meta.title', { name: playerData.name }) : tProfile('meta.defaultTitle')}
            description={tProfile('meta.description', { name: playerData?.name || 'Unknown Player' })}
            url={currentUrl}
            image={playerData?.avatar || playerData?.avatarUrl || playerData?.pfp || '/default-avatar.jpg'}
            type="profile"
          />
          <CompleteNav />
          <ScrollButton />
          {user && isOwnProfile ? (
            hasFlag(user, permissionFlags.BANNED) ? (
              <div className="profile-banner banned">
                <span className="profile-banner-text">{tProfile('banned')}</span>
              </div>
            ) : hasFlag(user, permissionFlags.SUBMISSIONS_PAUSED) ? (
            <div className="profile-banner submissions-paused">
              <span className="profile-banner-text">{tProfile('submissionSuspended')}</span>
            </div>
            ) : !hasFlag(user, permissionFlags.EMAIL_VERIFIED) ? (
              <div className="profile-banner email-verification" onClick={() => navigate('/profile/verify-email')}>
                <span className="profile-banner-text">{tProfile('emailVerification')}</span>
                <span className="email-verification-arrow">→</span>
              </div>
            ) : <br />
          ): <br />}
          <div className="background-level"></div>
          {playerData != null ? (Object.keys(playerData).length > 0 ? (
            <div className="player-body">
              <div className="player-content">
                <div className="player-header">
                  {ENABLE_ROULETTE && (
                    <button 
                      className="case-open-button" 
                      onClick={handleCaseOpenClick}
                      disabled={!user && !playerId}
                  >
                    <img src={caseOpen} alt="Case Open" />
                  </button>
                  )}
                  <div className="player-header-content">

                    <div className="player-info-container">
                      <div className="player-picture-container">
                      <div className="player-picture-and-info">
                      <UserAvatar 
                        primaryUrl={playerData?.avatarUrl || playerData?.pfp}
                        fallbackUrl={playerData?.pfp || '/default-avatar.jpg'}
                        className="player-picture"
                      />
                      <div className="player-id">ID: {playerData?.id || 'N/A'}</div>
                      </div>
                      {/* Mobile difficulty display */}
                      <div className="mobile-diff-info">
                      <div className="diff-info">
                      <p>{valueLabels?.topDiff}</p>
                      <img
                        src={playerData?.stats?.topDiff?.icon || "/placeholder-difficulty.png"}
                        alt={playerData?.stats?.topDiff?.name || 'No difficulty set'}
                        className="diff-image"
                      />
                    </div>

                    <div className="diff-info">
                      <p>{valueLabels?.top12kDiff}</p>
                      <img
                        src={playerData?.stats?.top12kDiff?.icon || "/placeholder-difficulty.png"}
                        alt={playerData?.stats?.top12kDiff?.name || 'No 12K difficulty set'}
                        className="diff-image"
                      />
                    </div>
                      </div>
                    </div>
                      <div className="player-info">
                       <div className="player-name-rank">
                         <div className="player-name-container">
                           <h1>{playerData?.name || 'Unknown Player'}</h1>
                           {playerData?.username && (
                             <span className="player-discord-handle">@{playerData.username}</span>
                           )}
                         </div>
                         <div className="player-rank-flag">
                           <h2
                             style={{
                               color: parseRankColor(playerData?.stats?.rankedScoreRank || 0), 
                               backgroundColor: `${parseRankColor(playerData?.stats?.rankedScoreRank || 0)}27`,
                           }}
                           className={playerData.username ? "shift-rank-display" : ""}
                           
                           >#{playerData?.stats?.rankedScoreRank || 'Unranked'}</h2>
                           <img
                             src={isoToEmoji(playerData?.country || 'XX')}
                             alt={playerData?.country || 'Unknown Country'}
                             className="country-flag"
                           />
                         </div>
                       </div>
                     </div>
                  </div>
                  <div className="diff-container">
                    <div className="diff-info">
                      <p>{valueLabels?.topDiff}</p>
                      <img
                        src={playerData?.stats?.topDiff?.icon || "/placeholder-difficulty.png"}
                        alt={playerData?.stats?.topDiff?.name || 'No difficulty set'}
                        className="diff-image"
                      />
                    </div>

                    <div className="diff-info">
                      <p>{valueLabels?.top12kDiff}</p>
                      <img
                        src={playerData?.stats?.top12kDiff?.icon || "/placeholder-difficulty.png"}
                        alt={playerData?.stats?.top12kDiff?.name || 'No 12K difficulty set'}
                        className="diff-image"
                      />
                    </div>
                  </div>
                  </div>
                  <div className="profile-button-container">
                  {user && isOwnProfile && (
                    <button 
                      className="edit-button"
                      //style={{cursor: "not-allowed", pointerEvents: "none"}}
                      onClick={() => navigate('/profile/edit')}
                    >
                      <EditIcon color="#fff" size={"24px"} />
                    </button>
                  )}
                  {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                    <button 
                      className="edit-button"
                      onClick={handleAdminEditClick}
                    >
                      <ShieldIcon color="#fff" size={"24px"} />
                    </button>
                  )}
                  {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                    <button 
                      className="edit-button"
                      onClick={handleCreatorAssignmentClick}
                      title="Assign Creator"
                    >
                      <span className="creator-assignment-icon"
                        style={{
                          color: playerData?.user?.creator ? '#5f5' : '#fff'
                        }}
                      >🛠</span>
                    </button>
                  )}
                  {playerData?.username && (
                    <button 
                      className="edit-button"
                      onClick={handleViewUserPacks}
                      title="View User's Packs"
                    >
                      <SearchIcon color="#fff" size={"24px"} />
                    </button>
                  )}
                  </div>
                </div>
            
              
                <div className="score-container">
                  <div className="score-item">
                    <p className="score-name">{valueLabels.rankedScore}</p>
                    <p className="score-value">{formatNumber(playerData?.rankedScore || 0)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.generalScore}</p>
                    <p className="score-value">{formatNumber(playerData?.generalScore || 0)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.ppScore}</p>
                    <p className="score-value">{formatNumber(playerData?.ppScore || 0)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.wfScore}</p>
                    <p className="score-value">{formatNumber(playerData?.wfScore || 0)}</p>
                  </div>
                  <br />
                  <div className="score-item">
                    <p className="score-name">{valueLabels.score12K}</p>
                    <p className="score-value">{formatNumber(playerData?.score12K || 0)}</p>
                  </div>
                </div>
            
                <div className="passes-container">
                  <div className="score-item">
                    <p className="score-name">{valueLabels.worldsFirstCount}</p>
                    <p className="score-value">{playerData?.worldsFirstCount || 0}</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.averageXacc}</p>
                    <p className="score-value">{((playerData?.averageXacc || 0) * 100).toFixed(2)}%</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.totalPasses}</p>
                    <p className="score-value">{playerData?.totalPasses || 0}</p>
                  </div>
                  <div className="score-item">
                    <p className="score-name">{valueLabels.universalPassCount}</p>
                    <p className="score-value">{playerData?.universalPassCount || 0}</p>
                  </div>
                </div>
              </div>
              {playerData?.passes && playerData.passes.length > 0 && (
                <div className="scores-section">
                  <h2>{tProfile('sections.scores.title')}</h2>
                  
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
                        placeholder={tProfile('search.placeholder')}
                        name="search"
                        autoComplete="off"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
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
                    
                    <div className="results-count">
                      {tProfile('labels.totalPasses', { count: filteredAndSortedPasses.length })}
                    </div>
                  </div>

                  <InfiniteScroll
                    dataLength={displayedPasses.length}
                    next={loadMorePasses}
                    hasMore={hasMore}
                    endMessage={
                      displayedPasses.length > 0 && (
                        <p style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                          <b>{tProfile('infiniteScroll.end')}</b>
                        </p>
                      )
                    }
                    scrollableTarget="scrollableDiv"
                    style={{ overflow: 'visible' }}
                  >
                    <div className="scores-list">
                      {displayedPasses.map((score, index) => (
                        <>
                        <li key={index}>
                          <ScoreCard scoreData={score} topScores={playerData?.topScores || []} potentialTopScores={playerData?.potentialTopScores || []} />
                        </li>
                        {lowestImpactScore && lowestImpactScore.id === score.id && playerData?.passes?.length > 20 && sortType === 'score' && sortOrder === 'DESC' && (
                          <div className="lowest-impact-score-indicator">
                            <p>
                              {(() => {
                                const text = tProfile('sections.scores.lowestImpactScore');
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
                        </>
                      ))}
                    </div>
                  </InfiniteScroll>
                </div>
              )}
            </div>
          ) : <h1 className="player-notfound">{tProfile('notFound')}</h1>)
          : <div className="loader"></div>}
          
          {showEditPopup && playerData && (
            <AdminPlayerPopup
              player={playerData}
              onClose={() => setShowEditPopup(false)}
              onUpdate={handlePlayerUpdate}
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

          {showCreatorAssignment && playerData?.user && (
            <CreatorAssignmentPopup
              user={playerData.user}
              onClose={handleCreatorAssignmentClose}
              onUpdate={handleCreatorAssignmentUpdate}
            />
          )}
        </div>
      );
}

export default ProfilePage
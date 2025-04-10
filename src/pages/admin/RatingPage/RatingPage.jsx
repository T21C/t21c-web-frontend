import { CompleteNav} from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { StateDisplay } from "@/components/common/selectors";
import "./adminratingpage.css";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRatingFilter } from "@/contexts/RatingFilterContext";
import { useTranslation } from "react-i18next";
import { RatingCard } from "@/components/cards";
import { EditLevelPopup, RaterManagementPopup, ReferencesPopup, DetailPopup } from "@/components/popups";
import { ScrollButton, ReferencesButton } from "@/components/common/buttons";
import { CustomSelect } from "@/components/common/selectors";
import api from "@/utils/api";
import { SortAscIcon, SortDescIcon } from "@/components/common/icons";
import { Tooltip } from "react-tooltip";
import { RatingHelpPopup } from "@/components/popups";
import { useDifficultyContext } from "@/contexts/DifficultyContext";

const truncateString = (str, maxLength) => {
  if (!str) return "";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

const RatingPage = () => {
  const { t } = useTranslation('pages');
  const tRating = (key, params = {}) => t(`rating.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;
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
    setSortOrder
  } = useRatingFilter();

  const { difficultyDict } = useDifficultyContext();
  const [ratings, setRatings] = useState(null);
  const [sortedRatings, setSortedRatings] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showRaterManagement, setShowRaterManagement] = useState(false);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedManagers, setConnectedManagers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");


  const fetchRatings = useCallback(async () => {
    try {
      const response = await api.get(import.meta.env.VITE_RATING_API);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const data = response.data;
      setRatings(data);
      setSortedRatings(data);
    } catch (error) {
      console.error("Error fetching ratings:", error);
    }
  }, []);

  const logUserCountChange = useCallback((total, managers) => {
    console.debug('SSE Client: User count update:', { total, managers });
    setConnectedUsers(total);
    setConnectedManagers(managers);
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchRatings();
    
    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.debug('SSE Client: Received message:', data);

        switch (data.type) {
          case 'userCount':
            logUserCountChange(data.data.total, data.data.managers);
            break;
          case 'ratingUpdate':
          case 'levelUpdate':
          case 'submissionUpdate':
            console.debug('SSE Client: Received update event:', data.type);
            fetchRatings();
            break;
          case 'ping':
            console.debug('SSE Client: Received ping');
            break;
          default:
            console.debug('SSE Client: Received unknown event type:', data.type);
        }
      } catch (error) {
        console.error('SSE Client: Error processing message:', error);
      }
    };

    let eventSource = null;
    let reconnectTimeout = null;
    
    const connect = () => {
      // Only set up SSE for authenticated users
        const params = new URLSearchParams({
          source: 'rating',
        });
        
        if (user) {
          params.set('userId', user.id);
        }

        const url = `${import.meta.env.VITE_API_URL}/events?${params.toString()}`;
        console.debug('SSE Client: Connecting to', url);

        eventSource = new EventSource(url, {
          withCredentials: true
        });

        eventSource.onopen = () => {
          console.debug('SSE Client: Connection opened');
          setIsConnected(true);
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE Client: Connection error:', error);
          setIsConnected(false);
          
          // Only attempt reconnect if component is still mounted
          if (eventSource) {
            eventSource.close();
            console.debug('SSE Client: Attempting reconnect in 5s...');
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };

        eventSource.onmessage = handleMessage;
      
    };

    connect();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        console.debug('SSE Client: Cleaning up connection');
        eventSource.close();
        setIsConnected(false);
        setConnectedUsers(0);
        setConnectedManagers(0);
      }
    };
  }, [fetchRatings, logUserCountChange, user]);

  useEffect(() => {
    if (!ratings) return;
    
    const newSortedRatings = [...ratings].sort((a, b) => {
      switch (sortType) {
        case 'id':
          const levelIdA = a.level?.id || 0;
          const levelIdB = b.level?.id || 0;
          const levelIdCompare = sortOrder === 'ASC' ? levelIdA - levelIdB : levelIdB - levelIdA;
          return levelIdCompare;
        case 'ratings':
          const ratingCountA = a.details?.length || 0;
          const ratingCountB = b.details?.length || 0;
          const ratingCompare = sortOrder === 'ASC' 
            ? ratingCountA - ratingCountB
            : ratingCountB - ratingCountA;
          return ratingCompare;
        case 'updatedAt':
          const dateA = new Date(a.updatedAt);
          const dateB = new Date(b.updatedAt);
          const dateCompare = sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
          return dateCompare;
        default:
          const defaultLevelIdA = a.level?.id || 0;
          const defaultLevelIdB = b.level?.id || 0;
          return sortOrder === 'ASC' ? defaultLevelIdA - defaultLevelIdB : defaultLevelIdB - defaultLevelIdA;
      }
    });

    setSortedRatings(newSortedRatings);
  }, [sortOrder, sortType, ratings]);

  const handleLocalSort = (order) => {
    setSortOrder(order);
  };

  useEffect(() => {
    if (selectedRating) {
      const updatedSelectedRating = ratings?.find(r => r.id === selectedRating.id);
      if (updatedSelectedRating) {
        setSelectedRating(updatedSelectedRating);
      }
    }
  }, [ratings, selectedRating]);

  const handleEditLevel = async (levelId) => {
    try {
      // Fetch full level data
      const response = await api.get(`${import.meta.env.VITE_LEVELS}/${levelId}`);
      if (response && response.data) {
        setSelectedLevel(response.data);
        setOpenEditDialog(true);
      }
    } catch (error) {
      console.error("Error fetching level data:", error);
    }
  };

  const sortOptions = useMemo(() => [
    { value: 'id', label: tRating('sort.byId') },
    { value: 'ratings', label: tRating('sort.byRatings'), title: tRating('sort.byRatingsFull') },
    { value: 'updatedAt', label: tRating('sort.byDate') }
  ], [tRating]);

  const selectedSortOption = useMemo(() => 
    sortOptions.find(option => option.value === sortType),
    [sortOptions, sortType]
  );

  // Add search filter function
  const filteredRatings = useMemo(() => {
    if (!sortedRatings) return [];
    
    return sortedRatings.filter(rating => {
      if (hideRated) {
        const userDetail = rating.details?.find(detail => detail.userId === user?.id);
        if (userDetail || /^vote/i.test(rating.level.rerateNum)) return false;
      }
      if (lowDiffFilter === 'hide' && rating.lowDiff) return false;
      if (lowDiffFilter === 'only' && !rating.lowDiff) return false;
      if (fourVoteFilter === 'hide' && 
        rating.details.filter(detail => !detail.isCommunityRating).length >= 4
      ) return false;
      if (fourVoteFilter === 'only' && 
        rating.details.filter(detail => !detail.isCommunityRating).length < 4)
         return false;
      if (searchQuery === "vote") 
        return /^vote/i.test(rating.level.rerateNum);
      // Search functionality
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        
        // Basic level info search
        const basicMatch = 
          rating.level.song?.toLowerCase().includes(query) ||
          rating.level.artist?.toLowerCase().includes(query) ||
          rating.level.id?.toString().includes(query) ||
          rating.level.difficulty?.name?.toLowerCase().includes(query) ||
          difficultyDict[rating.averageDifficultyId]?.name?.toLowerCase().includes(query) ||
          difficultyDict[rating.communityDifficultyId]?.name?.toLowerCase().includes(query)
          //  || difficultyDict[rating.level.difficultyId]?.name?.toLowerCase().includes(query); idk about this one

        if (basicMatch) return true;

        // Search in level credits (creators)
        const creatorMatch = rating.level.levelCredits?.some(credit => 
          credit.creator?.name?.toLowerCase().includes(query) ||
          credit.creator?.aliases?.some(alias => 
            alias.toLowerCase().includes(query)
          )
        );

        if (creatorMatch) return true;

        // Search in team
        const teamMatch = rating.level.teamObject && (
          rating.level.teamObject.name?.toLowerCase().includes(query) ||
          rating.level.teamObject.aliases?.some(alias => 
            alias.toLowerCase().includes(query)
          )
        );

        if (teamMatch) return true;

        // Search in level aliases
        const aliasMatch = rating.level.aliases?.some(alias =>
          (alias.field === 'song' && alias.alias.toLowerCase().includes(query)) ||
          (alias.field === 'artist' && alias.alias.toLowerCase().includes(query))
        );

        if (aliasMatch) return true;

        return false;
      }
      
      return true;
    });
  }, [sortedRatings, hideRated, lowDiffFilter, fourVoteFilter, searchQuery, user?.id]);

  // Add keyboard shortcut handler for force-refresh
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if help popup is open
      if (showHelpPopup) return;

      // Check for Ctrl + Alt + R
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault(); // Prevent browser refresh
        setRatings(null); 
        fetchRatings();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchRatings, showHelpPopup]);

  if (user?.isSuperAdmin === undefined && user?.isRater === undefined && user) {
    return (
      <div className="admin-rating-page">
        <MetaTags
          title={tRating('meta.title')}
          description={tRating('meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />
        <CompleteNav />
        <div className="background-level"></div>
        <div className="admin-rating-body">
          <div className="loader loader-level-detail"/>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-rating-page">
      <MetaTags
        title={tRating('meta.title')}
        description={tRating('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="admin-rating-body">
        <ScrollButton />
        <ReferencesButton />
        <div className="admin-buttons">
            {user?.isSuperAdmin && (
              <>
                <button 
                  className="admin-button"
                  onClick={() => setShowRaterManagement(true)}
                >
                  {tRating('buttons.manageRaters')}
                </button>
              </>
            )}
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
                {tRating('tooltips.sortAsc')}
              </Tooltip>
              <Tooltip id="sd" place="top" noArrow>
                {tRating('tooltips.sortDesc')}
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
          {user?.isSuperAdmin && (
            <div className="view-mode-toggle">
              <span className="toggle-label">{tRating('toggles.detailedView.label')}</span>
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
            <span className="toggle-label">{tRating('toggles.hideRated.label')}</span>
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
              label={tRating('toggles.lowDiff.label')}
              width={60}
            />
            <StateDisplay
              currentState={fourVoteFilter}
              states={['hide', 'show', 'only']}
              onChange={setFourVoteFilter}
              label={tRating('toggles.fourVote.label')}
              width={60}
            />
        </div>

        {ratings && ratings.length > 0 ? (
          <>
            <div className="ratings-header">
              <div className="search-container">
                <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  className="search-input"
                  placeholder={tRating('search.placeholder')}
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
                {tRating('buttons.help')}
              </button>
              <div className="ratings-count">
                {tRating('labels.totalRatings', { count: filteredRatings?.length || 0 })}
              </div>
              <div className={`connected-users ${isConnected ? 'connected' : 'disconnected'}`}>
                <div className={`indicator`} />
                {isConnected ? (
                  <>
                    {tRating('labels.connectedUsers', { count: connectedUsers })}
                    {connectedManagers > 0 && (
                      <span className="manager-count">
                        {tRating('labels.connectedManagers', { count: connectedManagers })}
                      </span>
                    )}
                  </>
                ) : tRating('labels.disconnected')}
              </div>
              </div>
            </div>
            <div className="rating-cards">
              {filteredRatings
                .map((rating, index) => (
                  <RatingCard
                    key={rating.id}
                    rating={rating}
                    index={index}
                    setSelectedRating={setSelectedRating}
                    user={user}
                    isSuperAdmin={user?.isSuperAdmin}
                    showDetailedView={showDetailedView}
                    onEditLevel={() => handleEditLevel(rating.level.id)}
                  />
                ))}
            </div>

            {selectedRating && (
              <DetailPopup
                selectedRating={selectedRating}
                setSelectedRating={setSelectedRating}
                setShowReferences={setShowReferences}
                ratings={ratings}
                setRatings={setRatings}
                user={user}
                isSuperAdmin={user?.isSuperAdmin}
              />
            )}

            {openEditDialog && selectedLevel && user?.isSuperAdmin && (
              <EditLevelPopup
                level={selectedLevel}
                onClose={() => {
                  setOpenEditDialog(false);
                  setSelectedLevel(null);
                }}
                onUpdate={(updatedData) => {
                  if (updatedData) {
                    const updatedLevel = updatedData.level || updatedData;
                    setRatings(prev => prev.map(rating => 
                      rating.level.id === updatedLevel.id 
                        ? {
                            ...rating,
                            level: {
                              ...rating.level,
                              ...updatedLevel
                            }
                          }
                        : rating
                    ));
                  }
                  setOpenEditDialog(false);
                  setSelectedLevel(null);
                }}
              />
            )}
          </>
        ) : 
        ratings && ratings.length === 0 ? (
          <div className="all-rated-message">
            <h2>{tRating('messages.noRatings.title')}</h2>
            <p>{tRating('messages.noRatings.subtitle')}</p>
          </div>
        ) : (
          <div className="loader"/>
        )}

        {showReferences && (
          <ReferencesPopup onClose={() => setShowReferences(false)} />
        )}

        {showRaterManagement && user?.isSuperAdmin && (
          <RaterManagementPopup 
            onClose={() => setShowRaterManagement(false)}
            currentUser={user}
          />
        )}

        {showHelpPopup && (
          <RatingHelpPopup onClose={() => setShowHelpPopup(false)} />
        )}
      </div>
    </div>
  );
};

export default RatingPage;

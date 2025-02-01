/* eslint-disable no-unused-vars */
import "./leaderboardpage.css";
import { useContext, useEffect, useState } from "react";
import { CompleteNav, PlayerCard, StateDisplay } from "../../components";
import { Tooltip } from "react-tooltip";
import CustomSelect from "../../components/Select/Select";
import InfiniteScroll from "react-infinite-scroll-component";
import api from '../../utils/api';
import { PlayerContext } from "../../contexts/PlayerContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import bgImgDark from "../../assets/important/dark/theme-background.jpg";
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import { MetaTags } from "../../components";
import { useAuth } from "../../contexts/AuthContext";

const currentUrl = window.location.origin + location.pathname;
const limit = 30;

const LeaderboardPage = () => {
  const { t } = useTranslation('pages');
  const tLeaderboard = (key, params = {}) => t(`leaderboard.${key}`, params);
  const { user } = useAuth();
  const [error, setError] = useState(false);
  const [filteredData, setFilteredData] = useState([]);
  const location = useLocation();

  const sortOptions = [
    { value: 'rankedScore', label: tLeaderboard('sortOptions.rankedScore') },
    { value: 'generalScore', label: tLeaderboard('sortOptions.generalScore') },
    { value: 'ppScore', label: tLeaderboard('sortOptions.ppScore') },
    { value: 'wfScore', label: tLeaderboard('sortOptions.wfScore') },
    { value: 'averageXacc', label: tLeaderboard('sortOptions.averageXacc') },
    { value: 'totalPasses', label: tLeaderboard('sortOptions.totalPasses') },
    { value: 'universalPassCount', label: tLeaderboard('sortOptions.universalPassCount') },
    { value: 'worldsFirstCount', label: tLeaderboard('sortOptions.worldsFirstCount') },
    { value: 'topDiff', label: tLeaderboard('sortOptions.topDiff') },
    { value: 'top12kDiff', label: tLeaderboard('sortOptions.top12kDiff') }
  ];

  const {
    playerData,
    setPlayerData,
    displayedPlayers,
    setDisplayedPlayers,
    filterOpen,
    setFilterOpen,
    sortOpen,
    setSortOpen,
    query,
    setQuery,
    sort,
    setSort,
    sortBy,
    setSortBy,
    showBanned,
    setShowBanned,
    forceUpdate,
    setForceUpdate
  } = useContext(PlayerContext);

  useEffect(() => {
    let cancelToken = api.CancelToken.source();

    const fetchPlayers = async () => {
      try {
        setPlayerData(null); // Set to null to indicate loading
        // If query starts with #, it's a Discord ID search
        const endpoint = query.startsWith('#') 
          ? `${import.meta.env.VITE_FULL_LEADERBOARD}?query=${encodeURIComponent(query)}&sortBy=${sortBy}&order=${sort.toLowerCase()}`
          : `${import.meta.env.VITE_FULL_LEADERBOARD}?sortBy=${sortBy}&order=${sort.toLowerCase()}`;
        
        const response = await api.get(endpoint, {
          cancelToken: cancelToken.token
        });
        
        setPlayerData(response.data);
        setDisplayedPlayers(response.data.slice(0, limit));
      } catch (error) {
        if (!api.isCancel(error)) {
          setError(true);
          console.error('Error fetching leaderboard data:', error);
        }
      }
    };
  
    fetchPlayers();

    // Cleanup function to cancel pending requests
    return () => {
      cancelToken.cancel('Request cancelled due to component update');
    };
  }, [forceUpdate, query, sort, sortBy]);
  
  useEffect(() => {
    if (playerData && playerData.length >= 0) {
      // Only filter by name if not doing a Discord ID search
      const filteredPlayers = !query.startsWith('#') 
        ? playerData.filter(playerStat => {
            const player = playerStat.player;
            if (!player) return false;

            const matchesQuery = player.name.toLowerCase().includes(query.toLowerCase()) 
              || player.discordUsername?.toLowerCase().includes(query.toLowerCase());
            const matchesBannedFilter = 
              (showBanned === 'show') ? true :
              (showBanned === 'hide') ? !player.isBanned :
              (showBanned === 'only') ? player.isBanned :
              true;
            
            return matchesQuery && matchesBannedFilter;
          })
        : playerData;
      
      // Store filtered data separately
      setFilteredData(filteredPlayers);
      // Only show the first 'limit' players initially
      setDisplayedPlayers(filteredPlayers.slice(0, limit));
    }
  }, [playerData, query, showBanned, t]);

  function handleQueryChange(e) {
    setQuery(e.target.value);
  }

  function handleFilterOpen() {
    //setFilterOpen(!filterOpen);
  }

  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  function handleSortBy(selectedOption) {
    setSortBy(selectedOption.value);
  }

  function handleSort(value) {
    setSort(value);
  }

  function resetAll() {
    setSortBy(sortOptions[0].value)
    setSort("DESC");
    setQuery("");
    setShowBanned('hide');
    setForceUpdate((f) => !f);
  }

  return (
    <div className="leaderboard-page">
      <MetaTags
        title={tLeaderboard('meta.title')}
        description={tLeaderboard('meta.description')}
        url={currentUrl}
        image="/leaderboard-preview.jpg"
        type="website"
      />
      <CompleteNav />

      <div className="background-level"></div>

      <div className="leaderboard-body">
        <ScrollButton />  
        <div className="input-option">
          <input
            value={query}
            type="text"
            placeholder={tLeaderboard('input.placeholder')}
            onChange={handleQueryChange}
          />

          <Tooltip id="filter" place="bottom" noArrow>
            {tLeaderboard('tooltips.filter')}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {tLeaderboard('tooltips.sort')}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {tLeaderboard('tooltips.reset')}
          </Tooltip>

          <svg
            className="svg-fill-stroke"
            data-tooltip-id="filter"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            style={{
              //backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
              padding: ".2rem",
            }}
            onClick={() => handleFilterOpen()}
          >
            <path d="M5.05 3C3.291 3 2.352 5.024 3.51 6.317l5.422 6.059v4.874c0 .472.227.917.613 1.2l3.069 2.25c1.01.742 2.454.036 2.454-1.2v-7.124l5.422-6.059C21.647 5.024 20.708 3 18.95 3H5.05Z" />
          </svg>

          <svg
            className="svg-fill"
            data-tooltip-id="sort"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              backgroundColor: sortOpen ? "rgba(255, 255, 255, 0.7)" : "",
            }}
            onClick={() => handleSortOpen()}
          >
            <g id="SVGRepo_bgCarrier" strokeWidth="0" />
            <g
              id="SVGRepo_tracerCarrier"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g id="SVGRepo_iconCarrier">
              <path
                d="M20 10.875C20.3013 10.875 20.5733 10.6948 20.6907 10.4173C20.8081 10.1399 20.7482 9.81916 20.5384 9.60289L16.5384 5.47789C16.3972 5.33222 16.2029 5.25 16 5.25C15.7971 5.25 15.6029 5.33222 15.4616 5.47789L11.4616 9.60289C11.2519 9.81916 11.1919 10.1399 11.3093 10.4173C11.4268 10.6948 11.6988 10.875 12 10.875H15.25V18C15.25 18.4142 15.5858 18.75 16 18.75C16.4142 18.75 16.75 18.4142 16.75 18L16.75 10.875H20Z"
                fill="#ffffff"
              />
              <path
                opacity="0.5"
                d="M12 13.125C12.3013 13.125 12.5733 13.3052 12.6907 13.5827C12.8081 13.8601 12.7482 14.1808 12.5384 14.3971L8.53844 18.5221C8.39719 18.6678 8.20293 18.75 8.00002 18.75C7.79711 18.75 7.60285 18.6678 7.46159 18.5221L3.46159 14.3971C3.25188 14.1808 3.19192 13.8601 3.30934 13.5827C3.42676 13.3052 3.69877 13.125 4.00002 13.125H7.25002L7.25002 6C7.25002 5.58579 7.5858 5.25 8.00002 5.25C8.41423 5.25 8.75002 5.58579 8.75002 6L8.75002 13.125L12 13.125Z"
                fill="#ffffff"
              />
            </g>
          </svg>

          <svg
            className="svg-stroke"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            onClick={() => resetAll()}
            data-tooltip-id="reset"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"
            />
          </svg>
          
        </div>
        <div className="input-setting">
          <div
            className={`filter settings-class ${filterOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">
              {tLeaderboard('settings.filter.header')}
            </h2>
            {/* ... rest of filter content ... */}
          </div>

          <div
            className={`sort settings-class ${sortOpen ? 'visible' : 'hidden'}`}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">
              {tLeaderboard('settings.sort.header')}
            </h2>

            <div className="sort-option">
              <div className="recent">
                <p>{tLeaderboard('settings.sort.sortOrder')}</p>
                <Tooltip id="ra" place="top" noArrow>
                  {tLeaderboard('tooltips.recentAsc')}
                </Tooltip>
                <Tooltip id="rd" place="top" noArrow>
                  {tLeaderboard('tooltips.recentDesc')}
                </Tooltip>

                <div className="wrapper">
                  <svg
                    className="svg-fill"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      backgroundColor:
                        sort == "ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="ASC"
                    onClick={() => handleSort("ASC")}
                    data-tooltip-id="ra"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      {/* arrow */}
                      <path
                        d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
                        fill="#ffffff"
                      ></path>
                      {/* AZ */}
                      <path
                        d="M14 11.21C14.39 11.35 14.82 11.15 14.96 10.76L15.24 9.98001H17.27L17.55 10.76C17.66 11.07 17.95 11.26 18.26 11.26C18.34 11.26 18.43 11.25 18.51 11.22C18.9 11.08 19.1 10.65 18.96 10.26L17.25 5.47001C17.08 5.04001 16.69 4.76001 16.25 4.76001C15.81 4.76001 15.42 5.04001 15.25 5.49001L13.55 10.26C13.41 10.65 13.61 11.08 14 11.22V11.21Z"
                        fill="#ffffff"
                      ></path>
                      <path
                        d="M18.67 13.46C18.48 13.02 18.08 12.75 17.62 12.75H14.51C14.1 12.75 13.76 13.09 13.76 13.5C13.76 13.91 14.1 14.25 14.51 14.25H16.9L14.07 17.2C13.73 17.56 13.64 18.08 13.83 18.54C14.02 18.98 14.42 19.25 14.88 19.25H18.01C18.42 19.25 18.76 18.91 18.76 18.5C18.76 18.09 18.42 17.75 18.01 17.75H15.62L18.44 14.82C18.78 14.46 18.88 13.93 18.68 13.47L18.67 13.46Z"
                        fill="#ffffff"
                      ></path>
                    </g>
                  </svg>

                  <svg
                    className="svg-fill"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      backgroundColor:
                        sort == "DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("DESC")}
                    value="DESC"
                    data-tooltip-id="rd"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      {/* arrow */}
                      <path
                        d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
                        fill="#ffffff"
                      ></path>
                      {/* ZA */}
                      <path
                        d="M13.83 10.54C14.02 10.98 14.42 11.25 14.88 11.25H18.01C18.42 11.25 18.76 10.91 18.76 10.5C18.76 10.09 18.42 9.75001 18.01 9.75001H15.62L18.44 6.82001C18.78 6.46001 18.88 5.93001 18.68 5.47001C18.49 5.03001 18.09 4.76001 17.63 4.76001H14.52C14.11 4.76001 13.77 5.10001 13.77 5.51001C13.77 5.92001 14.11 6.26001 14.52 6.26001H16.91L14.08 9.21001C13.74 9.57001 13.65 10.09 13.84 10.55L13.83 10.54Z"
                        fill="#ffffff"
                      ></path>
                      <path
                        d="M18.96 18.25L17.25 13.46C17.08 13.03 16.69 12.75 16.25 12.75C15.81 12.75 15.42 13.03 15.25 13.48L13.55 18.25C13.41 18.64 13.61 19.07 14 19.21C14.39 19.35 14.82 19.15 14.96 18.76L15.24 17.98H17.27L17.55 18.76C17.66 19.07 17.95 19.26 18.26 19.26C18.34 19.26 18.43 19.25 18.51 19.22C18.9 19.08 19.1 18.65 18.96 18.26V18.25ZM15.77 16.48L16.25 15.14L16.73 16.48H15.77Z"
                        fill="#ffffff"
                      ></path>
                    </g>
                  </svg>
                </div>
              </div>
              <div className="recent">
                <p>{tLeaderboard('settings.sort.sortBy')}</p>
                <CustomSelect
                  value={sortOptions.find(option => option.value === sortBy)}
                  onChange={handleSortBy}
                  options={sortOptions}
                  width="11rem"
                />
              </div>
              {user?.isSuperAdmin && (
                <div className="recent" style={{ display: "grid", alignItems: "end" }}>
                  <StateDisplay
                    label={tLeaderboard('bannedPlayers.label')}
                  currentState={showBanned}
                  onChange={(newState) => {
                    setShowBanned(newState);
                    setDisplayedPlayers([]);
                    setForceUpdate(prev => !prev);
                  }}
                  states={['show', 'hide', 'only']}
                  width={60}
                  height={24}
                  padding={3}
                />
              </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ minHeight: "200px" }}>
          {playerData === null ? (
            <div className="loader"></div>
          ) : (
            <InfiniteScroll
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              dataLength={displayedPlayers.length}
              next={() => {
                const currentLength = displayedPlayers.length;
                const newPagePlayers = filteredData.slice(
                  currentLength,
                  currentLength + limit
                );
                if (newPagePlayers.length > 0) {
                  setDisplayedPlayers(prev => [...prev, ...newPagePlayers]);
                }
              }}
              hasMore={displayedPlayers.length < filteredData.length}
              loader={<div className="loader"></div>}
              endMessage={
                displayedPlayers.length > 0 && (
                  <p style={{ textAlign: "center" }}>
                    <b>{tLeaderboard('infiniteScroll.end')}</b>
                  </p>
                )
              }
            >
              {displayedPlayers.map((playerStat, index) => (
                <PlayerCard
                  key={index}
                  currSort={sortBy}
                  player={{
                    ...playerStat,
                    name: playerStat.player.name,
                    country: playerStat.player.country,
                    isBanned: playerStat.player.isBanned,
                    pfp: playerStat.player.pfp,
                  }}
                />
              ))}
            </InfiniteScroll>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;

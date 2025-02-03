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
import SortDescIcon from "../../components/Icons/SortDescIcon";
import SortAscIcon from "../../components/Icons/SortAscIcon";
import { SortIcon } from "../../components/Icons/SortIcon";
import { FilterIcon } from "../../components/Icons/FilterIcon";
import { ResetIcon } from "../../components/Icons/ResetIcon";
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

          <FilterIcon
            data-tooltip-id="filter"
            color="#ffffff"
            onClick={() => handleFilterOpen()}
            style={{
              //backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
              padding: ".2rem",
            }}
          />

          <SortIcon
            data-tooltip-id="sort"

            color="#ffffff"
            style={{
              backgroundColor: sortOpen ? "rgba(255, 255, 255, 0.7)" : "",
            }}
            onClick={() => handleSortOpen()}

          />
          
          <ResetIcon
            color="#ffffff"
            onClick={() => resetAll()}
            data-tooltip-id="reset"
          />

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
                  <SortAscIcon 
                  data-tooltip-id="ra"
                  style={{
                    backgroundColor:
                      sort == "ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                  }}
                  onClick={() => handleSort("ASC")}
                  value="ASC"
                  />

                  <SortDescIcon
                  data-tooltip-id="rd"
                  style={{
                    backgroundColor:
                      sort == "DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                  }}
                  onClick={() => handleSort("DESC")}
                  value="DESC" />
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

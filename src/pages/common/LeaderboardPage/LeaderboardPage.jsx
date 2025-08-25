/* eslint-disable no-unused-vars */
import "./leaderboardpage.css";
import { useContext, useEffect, useState } from "react";
import { CompleteNav, } from "@/components/layout";
import { PlayerCard } from "@/components/cards";
import { StateDisplay } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import { CustomSelect } from "@/components/common/selectors";
import InfiniteScroll from "react-infinite-scroll-component";
import api from '@/utils/api';
import { PlayerContext } from "@/contexts/PlayerContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { useAuth } from "@/contexts/AuthContext";
import { SortDescIcon, SortAscIcon, SortIcon, FilterIcon, ResetIcon } from "@/components/common/icons";
import { CreatorAssignmentPopup } from "@/components/popups";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

const currentUrl = window.location.origin + location.pathname;
const limit = 30;

const LeaderboardPage = () => {
  const { t } = useTranslation('pages');
  const tLeaderboard = (key, params = {}) => t(`leaderboard.${key}`, params);
  const { user } = useAuth();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showCreatorAssignment, setShowCreatorAssignment] = useState(false);
  const [selectedPlayerUser, setSelectedPlayerUser] = useState(null);
  const location = useLocation();

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

  const fetchPlayers = async (offset = 0) => {
    try {
      setLoading(true);
      const endpoint = `/v2/database/leaderboard?query=${encodeURIComponent(query)}&sortBy=${sortBy}&order=${sort.toLowerCase()}&offset=${offset}&limit=${limit}&showBanned=${showBanned}`;

      const response = await api.get(endpoint);
      
      if (offset === 0) {
        // First page, replace all data
        setPlayerData(response.data.results);
        setDisplayedPlayers(response.data.results);
      } else {
        // Subsequent pages, append data
        setPlayerData(prev => [...prev, ...response.data.results]);
        setDisplayedPlayers(prev => [...prev, ...response.data.results]);
      }
      
      setHasMore(displayedPlayers.length < response.data.count);
    } catch (error) {
      if (!api.isCancel(error)) {
        setError(true);
        console.error('Error fetching leaderboard data:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelToken = api.CancelToken.source();
    setDisplayedPlayers([]);
    fetchPlayers(0);

    return () => {
      cancelToken.cancel('Request cancelled due to component update');
    };
  }, [forceUpdate, query, sort, sortBy, showBanned]);

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setDisplayedPlayers([]);
    setForceUpdate(prev => !prev);
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

  const handleCreatorAssignmentClick = (playerUser) => {
    setSelectedPlayerUser(playerUser);
    setShowCreatorAssignment(true);
  };

  const handleCreatorAssignmentClose = () => {
    setShowCreatorAssignment(false);
    setSelectedPlayerUser(null);
  };

  const handleCreatorAssignmentUpdate = () => {
    // Refresh the leaderboard data to reflect any changes
    setForceUpdate(prev => !prev);
    setShowCreatorAssignment(false);
    setSelectedPlayerUser(null);
  };

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
              {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
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
          {!playerData ? (
            <div className="loader"></div>
          ) : (
            <InfiniteScroll
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              dataLength={displayedPlayers.length}
              next={() => fetchPlayers(displayedPlayers.length)}
              hasMore={hasMore}
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
                  key={playerStat.id}
                  currSort={sortBy}
                  player={{
                    ...playerStat,
                    name: playerStat.player.name,
                    country: playerStat.player.country,
                    isBanned: hasFlag(playerStat.player.user, permissionFlags.BANNED),
                    pfp: playerStat.player.pfp,
                  }}
                  onCreatorAssignmentClick={handleCreatorAssignmentClick}
                />
              ))}
            </InfiniteScroll>
          )}
        </div>
      </div>

      {showCreatorAssignment && selectedPlayerUser && (
        <CreatorAssignmentPopup
          user={selectedPlayerUser}
          onClose={handleCreatorAssignmentClose}
          onUpdate={handleCreatorAssignmentUpdate}
        />
      )}
    </div>
  );
};

export default LeaderboardPage;

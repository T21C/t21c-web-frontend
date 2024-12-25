/* eslint-disable no-unused-vars */
import "./leaderboardpage.css";
import { useContext, useEffect, useState } from "react";
import { CompleteNav, PlayerCard } from "../../components";
import { Tooltip } from "react-tooltip";
import Select from "react-select";
import InfiniteScroll from "react-infinite-scroll-component";
import api from '../../utils/api';
import { PlayerContext } from "../../contexts/PlayerContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import bgImgDark from "../../assets/important/dark/theme-background.jpg";
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import { MetaTags } from "../../components";

const currentUrl = window.location.origin + location.pathname;



const limit = 30;

const LeaderboardPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const location = useLocation();
  const [displayedPlayers, setDisplayedPlayers] = useState([])
  const [playerList, setPlayerList] = useState([])
  const {
    playerData,
    setPlayerData,
    sortBy,
    setSortBy,
    sortOpen,
    setSortOpen,
    query,
    setQuery,
    sort,
    setSort,
  } = useContext(PlayerContext);
  const [showBanned, setShowBanned] = useState('hide');
  const bannedOptions = [
    { value: 'show', label: "Show" },
    { value: 'hide', label: "Hide" },
    { value: 'only', label: "Only" }
  ];
  var sortOptions = [
    { value: 'rankedScore', label:  t("valueLabels.rankedScore") },
    { value: 'generalScore', label: t("valueLabels.generalScore") },
    { value: 'ppScore', label: t("valueLabels.ppScore") },
    { value: 'wfScore', label: t("valueLabels.wfScore") },
    { value: '12kScore', label: t("valueLabels.12kScore") },
    { value: 'avgXacc', label: t("valueLabels.avgXacc") },
    { value: 'totalPasses', label: t("valueLabels.totalPasses") },
    { value: 'universalPasses', label: t("valueLabels.universalPasses") },
    { value: 'WFPasses', label: t("valueLabels.WFPasses") },
    { value: 'topDiff', label: t("valueLabels.topDiff") },
    { value: 'top12kDiff', label: t("valueLabels.top12kDiff") },
  ];

  function sortByField(data) {
    return data.sort((a, b) => {
      if (sortBy === "topDiff" || sortBy === "top12kDiff") {
        // Use the difficulty object's sort order directly, treating null as 0
        const diffA = a[sortBy]?.sortOrder || 0;
        const diffB = b[sortBy]?.sortOrder || 0;
        
        // Compare sort orders
        return diffB - diffA;
      } else {
        // For all other fields, simple numeric sort in descending order
        return b[sortBy] - a[sortBy];
      }
    });
  }
  
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        setPlayerData([])
        const response = await api.get(`${import.meta.env.VITE_FULL_LEADERBOARD}`, {
        });
        
        setPlayerData(response.data);
        setPlayerList(response.data);
        setDisplayedPlayers(response.data.slice(0, limit))
      } catch (error) {
        setError(true);
        console.error('Error fetching leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchPlayers();
  }, [forceUpdate]);
  
  useEffect(() => {
    if (playerData && playerData.length > 0) {
      var filteredPlayers = playerData.filter(player => {
        // First filter by search query
        const matchesQuery = player.name.toLowerCase().includes(query.toLowerCase());
        
        // Then filter by banned status
        const matchesBannedFilter = 
          (showBanned === 'show') ? true :  // Show all players
          (showBanned === 'hide') ? !player.isBanned :  // Hide banned players
          (showBanned === 'only') ? player.isBanned :  // Show only banned players
          true;  // Default fallback
        
        return matchesQuery && matchesBannedFilter;
      });

      filteredPlayers = sortByField(filteredPlayers);
      if(sort === "ASC"){
        filteredPlayers = filteredPlayers.reverse();
      }
      setPlayerList(filteredPlayers);
      
      const currentDisplayCount = Math.min(displayedPlayers.length || limit, filteredPlayers.length);
      setDisplayedPlayers(filteredPlayers.slice(0, currentDisplayCount));
    } else {
      setPlayerList([]);
      setDisplayedPlayers([]);
    }
    setLoading(false);
    
  }, [playerData, query, sort, sortBy, forceUpdate, t, showBanned]);

  function handleQueryChange(e) {
    setLoading(true);
    setDisplayedPlayers([]);
    setQuery(e.target.value);
  }

  function handleFilterOpen() {
    //setFilterOpen(!filterOpen);
  }

  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  function handleSortBy(selectedOption) {
    setLoading(true); 
    setSortBy(selectedOption.value);
  }


  function handleSort(value) {
    setLoading(true);
    setSort(value);
  }

  function resetAll() {
    setLoading(true)
    setDisplayedPlayers([]);
    setSortBy(sortOptions[0].value)
    setSort("DESC");
    setQuery("");
    setShowBanned('hide');
    setForceUpdate((f) => !f);
  }

  if (playerData == null)
    return (
      <div
        style={{ height: "100vh", width: "100vw", backgroundColor: "#090909" }}
      >
        <CompleteNav />
        <div className="background-level"></div>
        <div className="loader loader-level-detail"></div>
      </div>
    );

  return (
    <div className="leaderboard-page">
      <MetaTags
        title="Leaderboard"
        description="View top players and rankings"
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
            placeholder={t("leaderboardPage.inputPlaceholder")}
            onChange={handleQueryChange}
          />

          <Tooltip id="filter" place="bottom" noArrow>
            {t("leaderboardPage.toolTip.filter")}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {t("leaderboardPage.toolTip.sort")}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {t("leaderboardPage.toolTip.reset")}
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
            className="sort settings-class"
            style={{
              height: sortOpen ? "10rem" : "0",
              opacity: sortOpen ? "1" : "0",
            }}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">
              {t("leaderboardPage.settingExp.headerSort")}
            </h2>

            <div className="sort-option">
              <div className="recent">
                <p>{t("leaderboardPage.settingExp.sortOrder")}</p>
                <Tooltip id="ra" place="top" noArrow>
                  {t("leaderboardPage.toolTip.recentAsc")}
                </Tooltip>
                <Tooltip id="rd" place="top" noArrow>
                  {t("leaderboardPage.toolTip.recentDesc")}
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
                        d="M14 11.21C14.39 11.35 14.82 11.15 14.96 10.76L15.24 9.98001H17.27L17.55 10.76C17.66 11.07 17.95 11.26 18.26 11.26C18.34 11.26 18.43 11.25 18.51 11.22C18.9 11.08 19.1 10.65 18.96 10.26L17.25 5.47001C17.08 5.04001 16.69 4.76001 16.25 4.76001C15.81 4.76001 15.42 5.04001 15.25 5.49001L13.55 10.26C13.41 10.65 13.61 11.08 14 11.22V11.21ZM16.73 8.48001H15.77L16.25 7.14001L16.73 8.48001Z"
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
                
              <p>Sort by</p>
              <Select
                value={sortOptions.find(option => option.value === sortBy)}
                onChange={handleSortBy}
                options={sortOptions}
                menuPortalTarget={document.body}
                styles={{
                  input: (base) => ({
                    ...base, 
                    color: "#fff"
                  }),
                  menuPortal: (base) => ({
                    ...base,
                    zIndex: 9999 
                  }),
                  container: (provided) => ({
                    ...provided,
                    zIndex: 20,
                  }),
                  control: (provided, state) => ({
                    ...provided,
                    width: "11rem",
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    boxShadow: 
                      state.isFocused
                      && "0 0 0 2px #757575"
                  }),
                  singleValue: (provided) => ({
                    ...provided,
                    color: "#FFFFFF !important",
                  }),
                  indicatorSeparator: (provided) => ({
                    ...provided,
                    backgroundColor: "#000000aa",
                  }),
                  menu: (provided) => ({
                    ...provided,
                    width: "11rem",
                    backgroundColor: "#070711ef",
                    borderRadius: "3px",
                    border: "none",
                    boxShadow: "none",
                    textDecoration: "bold",
                    color: "#fff",
                    zIndex: 9999,
                  }),
                  option: (provided, state) => ({
                    ...provided,
                    backgroundColor: state.isSelected
                      ? "#303040ee"
                      : "transparent",
                    zIndex: 9999,
                    "&:hover": {
                      backgroundColor: "#555555",
                    }
                  }),
                }}
              />
              </div>
              <div className="recent">
                <p>Show banned players</p>
                <Select
                  value={bannedOptions.find(option => option.value === showBanned)}
                  onChange={(option) => setShowBanned(option.value)}
                  options={bannedOptions}
                  menuPortalTarget={document.body}
                  styles={{
                    input: (base) => ({
                      ...base, 
                      color: "#fff"
                    }),
                    menuPortal: (base) => ({
                      ...base,
                      zIndex: 9999 
                    }),
                    container: (provided) => ({
                      ...provided,
                      zIndex: 20,
                    }),
                    control: (provided, state) => ({
                      ...provided,
                      width: "11rem",
                      backgroundColor: "rgba(255, 255, 255, 0.3)",
                      border: "none",
                      outline: "none",
                      color: "#fff",
                      boxShadow: 
                        state.isFocused
                        && "0 0 0 2px #757575"
                    }),
                    singleValue: (provided) => ({
                      ...provided,
                      color: "#FFFFFF !important",
                    }),
                    indicatorSeparator: (provided) => ({
                      ...provided,
                      backgroundColor: "#000000aa",
                    }),
                    menu: (provided) => ({
                      ...provided,
                      width: "11rem",
                      backgroundColor: "#070711ef",
                      borderRadius: "3px",
                      border: "none",
                      boxShadow: "none",
                      textDecoration: "bold",
                      color: "#fff",
                      zIndex: 9999,
                    }),
                    option: (provided, state) => ({
                      ...provided,
                      backgroundColor: state.isSelected
                        ? "#303040ee"
                        : "transparent",
                      zIndex: 9999,
                      "&:hover": {
                        backgroundColor: "#555555",
                      }
                    }),
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {!loading ? (
          <InfiniteScroll
            style={{ paddingBottom: "5rem" }}
            dataLength={displayedPlayers.length}
            next={() => {
              const currentLength = displayedPlayers.length;
              const newPagePlayers = playerList.slice(
                currentLength,
                currentLength + limit
              );
              if (newPagePlayers.length > 0) {
                setDisplayedPlayers(prev => [...prev, ...newPagePlayers]);
              }
            }}
            hasMore={displayedPlayers.length < playerList.length}
            loader={<h1>{t("leaderboardPage.infScroll.loading")}</h1>}
            endMessage={
              <p style={{ textAlign: "center" }}>
                <b>{t("leaderboardPage.infScroll.end")}</b>
              </p>
            }
          >
            {displayedPlayers.map((l, index) => (
              <PlayerCard
                key={index}
                currSort={sortBy}
                player={l}
                pfp={l.pfp}
              />
            ))}
          </InfiniteScroll>)
          :
          <div className="loader"></div>
        }
      </div>
    </div>
  );
};

export default LeaderboardPage;

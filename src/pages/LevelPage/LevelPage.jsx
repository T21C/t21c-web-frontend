/* eslint-disable no-unused-vars */
import "./levelpage.css";
import { useContext, useEffect, useState, useCallback } from "react";
import { CompleteNav, LevelCard, StateDisplay } from "@/components";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import api from '@/utils/api';
import { LevelContext } from "@/contexts/LevelContext";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ScrollButton from "@/components/ScrollButton/ScrollButton";
import { useAuth } from "@/contexts/AuthContext";
import { DifficultyContext } from "@/contexts/DifficultyContext";
import ReferencesButton from "../../components/ReferencesButton/ReferencesButton";
import { MetaTags } from "../../components";
import DifficultySlider from '@/components/DifficultySlider/DifficultySlider';
import SpecialDifficulties from '@/components/SpecialDifficulties/SpecialDifficulties';
import SortAscIcon from '@/components/Icons/SortAscIcon';
import SortDescIcon from '@/components/Icons/SortDescIcon';
import RandomIcon from '@/components/Icons/RandomIcon';
const currentUrl = window.location.origin + location.pathname;

const limit = 30;

const LevelPage = () => {
  const { t } = useTranslation('pages');
  const tLevel = (key, params = {}) => t(`level.${key}`, params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { difficulties } = useContext(DifficultyContext);
  const {
    levelsData,
    setLevelsData,
    legacyDiff,
    setLegacyDiff,
    filterOpen,
    setFilterOpen,
    sortOpen,
    setSortOpen,
    query,
    setQuery,
    selectedLowFilterDiff,
    setSelectedLowFilterDiff,
    selectedHighFilterDiff,
    setSelectedHighFilterDiff,
    sort,
    setSort,
    hasMore,
    setHasMore,
    pageNumber,
    setPageNumber,
    deletedFilter,
    setDeletedFilter,
    clearedFilter,
    setClearedFilter,
    sliderRange,
    setSliderRange,
    selectedSpecialDiffs,
    setSelectedSpecialDiffs
  } = useContext(LevelContext);

  // Filter difficulties by type
  const pguDifficulties = difficulties.filter(d => d.type === 'PGU');
  const specialDifficulties = difficulties.filter(d => d.type === 'SPECIAL');

  // Handle slider value updates without triggering immediate fetches
  function handleSliderChange(newRange) {
    setSliderRange(newRange);
    
    // Find difficulties corresponding to slider values
    const lowDiff = pguDifficulties.find(d => d.sortOrder === newRange[0]);
    const highDiff = pguDifficulties.find(d => d.sortOrder === newRange[1]);
    
    setSelectedLowFilterDiff(lowDiff?.name || null);
    setSelectedHighFilterDiff(highDiff?.name || null);
  }

  // Handle slider changes complete (after drag or click)
  const handleSliderChangeComplete = useCallback((newRange) => {
    handleSliderChange(newRange);
    // Only reset page and trigger fetch when dragging is complete
    setPageNumber(0);
    setLevelsData([]);
    setForceUpdate(f => !f);
  }, []);

  function toggleSpecialDifficulty(diffName) {
    setSelectedSpecialDiffs(prev => {
      const newSelection = prev.includes(diffName)
        ? prev.filter(d => d !== diffName)
        : [...prev, diffName];
      
      setPageNumber(0);
      setLevelsData([]);
      setForceUpdate(f => !f);
      return newSelection;
    });
  }

  useEffect(() => {
    let cancel;
    
    const fetchLevels = async () => {
      setLoading(true);
      try {
        // Query parameters for pagination and basic filtering
        const params = {
          limit,
          offset: pageNumber * limit,
          query,
          sort,
          deletedFilter,
          clearedFilter
        };

        // Request body for difficulty filtering
        const requestBody = {
          pguRange: {
            from: selectedLowFilterDiff,
            to: selectedHighFilterDiff
          },
          specialDifficulties: selectedSpecialDiffs
        };

        const response = await api.post(
          `${import.meta.env.VITE_LEVELS}/filter`,
          requestBody,
          {
            params,
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );

        const newLevels = response.data.results;
        
        const existingIds = new Set(levelsData.map((level) => level.id));
        const uniqueLevels = newLevels.filter(
          (level) => !existingIds.has(level.id)
        );

        setLevelsData((prev) => [...prev, ...uniqueLevels]);
        setHasMore(response.data.count > levelsData.length + newLevels.length);
      } catch (error) {
        if (!axios.isCancel(error)) setError(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchLevelById = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `${import.meta.env.VITE_LEVELS}/byId/${query.slice(1)}`,
          {
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );

       setLevelsData([response.data]);
        setHasMore(false);
      } catch (error) {
        if (!axios.isCancel(error)) setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (query[0] == "#" && !isNaN(parseInt(query.slice(1)))) {
      fetchLevelById();
    } else {
      fetchLevels();
    }
    return () => cancel && cancel();
  }, [query, sort, pageNumber, forceUpdate, deletedFilter]);

  function toggleLegacyDiff() {
    setLegacyDiff(!legacyDiff);
  }

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setPageNumber(0);
    setLevelsData([]);
  }
  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  function handleSort(value) {
    setSort(value);
    setPageNumber(0);
    setLevelsData([]);
    setLoading(true);
    setForceUpdate((f) => !f);
  }

  function resetAll() {
    setPageNumber(0);
    setSort("RECENT_DESC");
    setQuery("");
    // Reset to initial PGU range
    setSelectedLowFilterDiff("P1");
    setSelectedHighFilterDiff("U20");
    setSliderRange([1, 60]);
    // Reset special difficulties
    setSelectedSpecialDiffs([]);
    // Reset filters
    if (user.isSuperAdmin) {
      setDeletedFilter("hide");
    }
    setClearedFilter("show");
    // Clear and reload data
    setLevelsData([]);
    setLoading(true);
    setForceUpdate(f => !f);
  }


  if (difficulties.length === 0) {
    return (
      <div className="level-page">
        <MetaTags
          title={tLevel('meta.title')}
          description={tLevel('meta.description')}
          url={currentUrl}
          image={''}
          type="article"
        />
        <CompleteNav />
  
        <div className="background-level"></div>
        <div className="level-body">
          <div className="level-body-content" style={{marginTop: "45vh"}} >
            <div className="loader loader-level-page" style={{top: "-6rem"}}></div>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", justifyContent: "center", textAlign: "center"}}>
              {tLevel('loading.difficulties')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="level-page">
      <MetaTags
        title={tLevel('meta.title')}
        description={tLevel('meta.description')}
        url={currentUrl}
        image={''}
        type="article"
      />
      <CompleteNav />

      <div className="background-level"></div>
      <div className="level-body">
        <ScrollButton />
        <ReferencesButton />
        <div className="input-option">
          <svg
            className="svg-fill"
            data-tooltip-id="legacy"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              backgroundColor: legacyDiff ? "rgba(255, 255, 255, 0.7)" : "",
              width: "3rem",
              paddingLeft: ".1rem",
              paddingRight: ".3rem",
            }}
            onClick={() => toggleLegacyDiff()}
          >
            <polygon points="11 19 2 12 11 5 11 19"></polygon>
            <polygon points="22 19 13 12 22 5 22 19"></polygon>
          </svg>

          <input
            value={query}
            type="text"
            placeholder={tLevel('input.placeholder')}
            onChange={handleQueryChange}
          />

          <Tooltip id="legacy" place="bottom" noArrow>
            {tLevel('toolTip.legacy')}
          </Tooltip>
          <Tooltip id="filter" place="bottom" noArrow>
            {tLevel('toolTip.filter')}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {tLevel('toolTip.sort')}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {tLevel('toolTip.reset')}
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
              backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
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
              stroke="currentCcolor"
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
              {tLevel('settingExp.headerFilter')}
            </h2>
            <div className="filter-section">
              <div className="filter-row">
                <DifficultySlider
                  values={sliderRange}
                  onChange={handleSliderChange}
                  onChangeComplete={handleSliderChangeComplete}
                  difficulties={pguDifficulties}
                  min={1}
                  max={60}
                />
              </div>
              
              <div className="filter-row">
                <SpecialDifficulties
                  difficulties={specialDifficulties}
                  selectedDiffs={selectedSpecialDiffs}
                  onToggle={toggleSpecialDifficulty}
                />
                <StateDisplay
                  currentState={clearedFilter}
                  onChange={(newState) => {
                    setClearedFilter(newState);
                    setPageNumber(0);
                    setLevelsData([]);
                    setForceUpdate(prev => !prev);
                  }}
                  label="Cleared Levels"
                  states={['show', 'hide', 'only']}
                />
                {user.isSuperAdmin && (
                  <StateDisplay
                    currentState={deletedFilter}
                    onChange={(newState) => {
                      setDeletedFilter(newState);
                      setPageNumber(0);
                      setLevelsData([]);
                      setForceUpdate(prev => !prev);
                    }}
                    label="Deleted Levels"
                  />
                )}
              </div>


            </div>
          </div>

          <div
            className={`sort sort-class ${sortOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">
              {tLevel('settingExp.headerSort')}
            </h2>

            <div className="sort-option">
              <div className="recent">
                <p>{tLevel('settingExp.sortRecent')}</p>
                <Tooltip id="ra" place="top" noArrow>
                  {tLevel('toolTip.recentAsc')}
                </Tooltip>
                <Tooltip id="rd" place="top" noArrow>
                  {tLevel('toolTip.recentDesc')}
                </Tooltip>

                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort == "RECENT_ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="RECENT_ASC"
                    onClick={() => handleSort("RECENT_ASC")}
                    data-tooltip-id="ra"
                  />

                  <SortDescIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort == "RECENT_DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("RECENT_DESC")}
                    value="RECENT_DESC"
                    data-tooltip-id="rd"
                  />
                </div>
              </div>

              <div className="diff">
                <p>{tLevel('settingExp.filterDiffs')}</p>

                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort == "DIFF_ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="DIFF_ASC"
                    onClick={() => handleSort("DIFF_ASC")}
                    data-tooltip-id="da"
                  />

                  <SortDescIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort == "DIFF_DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("DIFF_DESC")}
                    value="DIFF_DESC"
                    data-tooltip-id="dd"
                  />
                </div>
              </div>

              <div className="random">
                <p>{tLevel('settingExp.sortRandom')}</p>
                <Tooltip id="rnd" place="top" noArrow>
                  {tLevel('toolTip.random')}
                </Tooltip>

                <div className="wrapper">
                  <RandomIcon
                    className="svg-fill-stroke"
                    style={{
                      backgroundColor:
                        sort == "RANDOM" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("RANDOM")}
                    value="RANDOM"
                    data-tooltip-id="rnd"
                  />
                </div>
              </div>

              <div className={`clears ${clearedFilter === 'only' ? 'visible' : ''}`}>
                <p>{tLevel('settingExp.sortClears')}</p>
                <Tooltip id="ca" place="top" noArrow>
                  {tLevel('toolTip.clearsAsc')}
                </Tooltip>
                <Tooltip id="cd" place="top" noArrow>
                  {tLevel('toolTip.clearsDesc')}
                </Tooltip>

                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort == "CLEARS_ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="CLEARS_ASC"
                    onClick={() => handleSort(sort === "CLEARS_ASC" ? "" : "CLEARS_ASC")}
                    data-tooltip-id="ca"
                  />

                  <SortDescIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort == "CLEARS_DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort(sort === "CLEARS_DESC" ? "" : "CLEARS_DESC")}
                    value="CLEARS_DESC"
                    data-tooltip-id="cd"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <InfiniteScroll
          style={{ paddingBottom: "25rem", overflow: "visible" }}
          dataLength={levelsData.length}
          next={() => setPageNumber((prevPageNumber) => prevPageNumber + 1)}
          hasMore={hasMore}
          loader={<div className="loader loader-level-page" style={{zIndex: 1}}></div>}
          endMessage={
            <p className="end-message">
              <b>{tLevel('infScroll.end')}</b>
            </p>}
        >
          {levelsData.map((l, index) => (
            <LevelCard
              key={index}
              level={l}
              legacyMode={legacyDiff}
              isSuperAdmin={user.isSuperAdmin}
            />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default LevelPage;

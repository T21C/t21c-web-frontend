/* eslint-disable no-unused-vars */
import "./levelpage.css";
import { useContext, useEffect, useState, useCallback } from "react";
import { CompleteNav } from "@/components/layout";
import { LevelCard } from "@/components/cards";
import { StateDisplay } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import api from '@/utils/api';
import { LevelContext } from "@/contexts/LevelContext";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { DifficultyContext } from "@/contexts/DifficultyContext";
import { ReferencesButton, ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { DifficultySlider, SpecialDifficulties } from "@/components/common/selectors";
import { SortAscIcon, SortDescIcon, RandomIcon, ResetIcon, SortIcon , FilterIcon} from "@/components/common/icons";
import { LevelHelpPopup } from "@/components/popups";
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

  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [viewMode, setViewMode] = useState('normal');
  const [cardSize, setCardSize] = useState('medium');

  // Filter difficulties by type
  const pguDifficulties = difficulties.filter(d => d.type === 'PGU');
  const specialDifficulties = difficulties.filter(d => d.type === 'SPECIAL');

  // Handle slider value updates without triggering immediate fetches
  function handleSliderChange(newRange) {
    setSliderRange(newRange);
    
    // Find difficulties corresponding to slider values
    const lowDiff = pguDifficulties.find(d => d.sortOrder === newRange[0]) || 
                   pguDifficulties.find(d => d.sortOrder >= newRange[0]);
    const highDiff = pguDifficulties.find(d => d.sortOrder === newRange[1]) || 
                    [...pguDifficulties].reverse().find(d => d.sortOrder <= newRange[1]);
                    
    setSelectedLowFilterDiff(lowDiff?.name || "P1");  // Fallback to P1
    setSelectedHighFilterDiff(highDiff?.name || "U20"); // Fallback to U20
  }

  // Handle slider changes complete (after drag or click)
  const handleSliderChangeComplete = useCallback((newRange) => {
    // Don't call handleSliderChange here, do the logic directly
    setSliderRange(newRange);
    
    // Find difficulties corresponding to slider values
    const lowDiff = pguDifficulties.find(d => d.sortOrder === newRange[0]) || 
                   pguDifficulties.find(d => d.sortOrder >= newRange[0]);
    const highDiff = pguDifficulties.find(d => d.sortOrder === newRange[1]) || 
                    [...pguDifficulties].reverse().find(d => d.sortOrder <= newRange[1]);

    setSelectedLowFilterDiff(lowDiff?.name || "P1");
    setSelectedHighFilterDiff(highDiff?.name || "U20");
    
    // Only reset page and trigger fetch when dragging is complete
    setPageNumber(0);
    setLevelsData([]);
    setForceUpdate(f => !f);
  }, [pguDifficulties]); // Add pguDifficulties to dependencies

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

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setPageNumber(0);
    setLevelsData([]);
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
        if (!axios.isCancel(error)) {
          console.error('Error fetching levels:', error);
          setError(true);
        }
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
        if (response.data) {
          setLevelsData([response.data]);
          setHasMore(false);
        } else {
          setLevelsData([]);
          setHasMore(false);
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Error fetching level by ID:', error);
          setError(true);
        }
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
    if (user?.isSuperAdmin) {
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
          <button 
            className="help-button"
            onClick={() => setShowHelpPopup(true)}
            data-tooltip-id="search"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M12 3C7.04 3 3 7.04 3 12C3 16.96 7.04 21 12 21C16.96 21 21 16.96 21 12C21 7.04 16.96 3 12 3ZM12 19.5C7.86 19.5 4.5 16.14 4.5 12C4.5 7.86 7.86 4.5 12 4.5C16.14 4.5 19.5 7.86 19.5 12C19.5 16.14 16.14 19.5 12 19.5ZM14.3 7.7C14.91 8.31 15.25 9.13 15.25 10C15.25 10.87 14.91 11.68 14.3 12.3C13.87 12.73 13.33 13.03 12.75 13.16V13.5C12.75 13.91 12.41 14.25 12 14.25C11.59 14.25 11.25 13.91 11.25 13.5V12.5C11.25 12.09 11.59 11.75 12 11.75C12.47 11.75 12.91 11.57 13.24 11.24C13.57 10.91 13.75 10.47 13.75 10C13.75 9.53 13.57 9.09 13.24 8.76C12.58 8.1 11.43 8.1 10.77 8.76C10.44 9.09 10.26 9.53 10.26 10C10.26 10.41 9.92 10.75 9.51 10.75C9.1 10.75 8.76 10.41 8.76 10C8.76 9.13 9.1 8.32 9.71 7.7C10.94 6.47 13.08 6.47 14.31 7.7H14.3ZM13 16.25C13 16.8 12.55 17.25 12 17.25C11.45 17.25 11 16.8 11 16.25C11 15.7 11.45 15.25 12 15.25C12.55 15.25 13 15.7 13 16.25Z" fill="#ffffff"></path>
              </g>
            </svg>
            {tLevel('buttons.searchHelp')}
          </button>

          <input
            value={query}
            type="text"
            placeholder={tLevel('input.placeholder')}
            onChange={handleQueryChange}
          />

          <Tooltip id="search" place="bottom" noArrow>
            {tLevel('toolTip.search')}
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


          <FilterIcon
            color="#ffffff"
            onClick={() => handleFilterOpen()}
            style={{
              backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
              padding: ".2rem",
            }}
            data-tooltip-id="filter"
          />

          
          <SortIcon
            color="#ffffff"
            onClick={() => handleSortOpen()}
            data-tooltip-id="sort"
            style={{
              backgroundColor: sortOpen ? "rgba(255, 255, 255, 0.7)" : "",
            }}
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
                  label={tLevel('settingExp.clearedLevels')}
                  states={['show', 'hide', 'only']}
                />
                {user?.isSuperAdmin && (
                  <StateDisplay
                    currentState={deletedFilter}
                    onChange={(newState) => {
                      setDeletedFilter(newState);
                      setPageNumber(0);
                      setLevelsData([]);
                      setForceUpdate(prev => !prev);
                    }}
                    label={tLevel('settingExp.deletedLevels')}
                    states={['show', 'hide', 'only']}
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

                <Tooltip id="da" place="top" noArrow>
                  {tLevel('toolTip.diffAsc')}
                </Tooltip>
                <Tooltip id="dd" place="top" noArrow>
                  {tLevel('toolTip.diffDesc')}
                </Tooltip>

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
                    value="DIFF_DESC"
                    onClick={() => handleSort("DIFF_DESC")}
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

              <div className={`clears ${clearedFilter !== 'hide' ? 'visible' : ''}`}>
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

        <div className="view-mode-section">
          <p>{tLevel('settingExp.viewMode')}</p>
          <div className="view-mode-buttons">
            <button 
              className={`view-mode-button ${viewMode === 'normal' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('normal');
                setPageNumber(0);
                setLevelsData([]);
                setForceUpdate(f => !f);
              }}
              title={tLevel('toolTip.normalView')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z"/>
              </svg>
            </button>
            <button 
              className={`view-mode-button ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('compact');
                setPageNumber(0);
                setLevelsData([]);
                setForceUpdate(f => !f);
              }}
              title={tLevel('toolTip.compactView')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 4h18v1H3V4zm0 7h18v1H3v-1zm0 7h18v1H3v-1z"/>
              </svg>
            </button>
            <button 
              className={`view-mode-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('grid');
                setPageNumber(0);
                setLevelsData([]);
                setForceUpdate(f => !f);
              }}
              title={tLevel('toolTip.gridView')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zm-11 0h7v7H3v-7z"/>
              </svg>
            </button>
          </div>

          {viewMode === 'grid' && (
            <div className="size-slider-container">
              <p>{tLevel('settingExp.cardSize')}</p>
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                className="size-slider"
                value={cardSize === 'small' ? 0 : cardSize === 'medium' ? 1 : 2}
                onChange={(e) => {
                  const sizes = ['small', 'medium', 'large'];
                  setCardSize(sizes[e.target.value]);
                }}
              />
            </div>
          )}
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
          <div className={viewMode === 'grid' ? 'level-cards-grid' : ''}>
            {levelsData.map((l, index) => (
              <LevelCard
                key={index}
                level={l}
                legacyMode={legacyDiff}
                user={user}
                displayMode={viewMode}
                size={cardSize}
              />
            ))}
          </div>
        </InfiniteScroll>

        {showHelpPopup && (
          <LevelHelpPopup onClose={() => setShowHelpPopup(false)} />
        )}
      </div>
    </div>
  );
};

export default LevelPage;

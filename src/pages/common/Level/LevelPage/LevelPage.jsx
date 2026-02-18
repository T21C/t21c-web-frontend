
import "./levelpage.css";
import "../../sort.css";
import "../../search-section.css";
import { useContext, useEffect, useState, useCallback, useRef } from "react";

import { LevelCard } from "@/components/cards";
import { StateDisplay, CustomSelect } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import api from '@/utils/api';
import { LevelContext } from "@/contexts/LevelContext";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { DifficultyContext } from "@/contexts/DifficultyContext";
import { ReferencesButton, ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { DifficultySlider, TagSelector } from "@/components/common/selectors";
import { SortAscIcon, SortDescIcon, ResetIcon, SortIcon , FilterIcon, LikeIcon, SwitchIcon, EyeIcon, EyeOffIcon} from "@/components/common/icons";
import { LevelHelpPopup } from "@/components/popups/Levels";
import toast from 'react-hot-toast';
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

const currentUrl = window.location.origin + location.pathname;

const limit = 50;

const LevelPage = () => {
  const { t } = useTranslation('pages');

  const { user } = useAuth();
  const { difficulties, curationTypes, tags } = useContext(DifficultyContext);
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
    order,
    setOrder,
    hasMore,
    setHasMore,
    totalLevels,
    setTotalLevels,
    pageNumber,
    setPageNumber,
    deletedFilter,
    setDeletedFilter,
    availableDlFilter,
    setAvailableDlFilter,
    clearedFilter,
    setClearedFilter,
    sliderRange,
    setSliderRange,
    selectedSpecialDiffs,
    sliderQRange,
    setSliderQRange,
    sliderQRangeDrag,
    setSliderQRangeDrag,
    setSelectedSpecialDiffs,
    qSliderVisible,
    setQSliderVisible,
    onlyMyLikes,
    setOnlyMyLikes,
    selectedCurationTypes,
    setSelectedCurationTypes,
    selectedTags,
    setSelectedTags
  } = useContext(LevelContext);

  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [viewMode, setViewMode] = useState('normal');
  const [cardSize, setCardSize] = useState('medium');
  const [stateDisplayOpen, setStateDisplayOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  const [showTagsInCards, setShowTagsInCards] = useState(true);
  
  // Timeout ref for debounced fetch
  const fetchTimeoutRef = useRef(null);
  const cancelTokenRef = useRef(null);

  // Filter difficulties by type
  const pguDifficulties = difficulties.filter(d => d.type === 'PGU').sort((a, b) => a.sortOrder - b.sortOrder);
  const qDifficulties = difficulties.filter(d => d.name.includes('Q')).sort((a, b) => a.sortOrder - b.sortOrder);
  const specialDifficulties = difficulties.filter(d => d.type === 'SPECIAL');

  // Add sort options similar to PassPage
  const sortOptions = [
    { value: 'RECENT', label: t('level.settings.sort.recent') },
    { value: 'DIFF', label: t('level.settings.sort.difficulty') },
    { value: 'CLEARS', label: t('level.settings.sort.clears') },
    { value: 'LIKES', label: t('level.settings.sort.likes') },
    { value: 'RANDOM', label: t('level.settings.sort.random') }
  ];

  // Fetch function
  const fetchLevelsData = useCallback(async (resetPage = false) => {
    // Cancel any pending request
    if (cancelTokenRef.current) {
      cancelTokenRef.current();
    }
    
    const fetchLevels = async () => {
      try {
        // Combine slider special diffs with manually selected ones
        const allSpecialDiffs = [
          ...(qSliderVisible ? sliderQRange : []),
          ...selectedSpecialDiffs
        ].filter(Boolean);
        const uniqueSpecialDiffs = [...new Set(allSpecialDiffs)];

        const params = {
          limit,
          offset: resetPage ? 0 : pageNumber * limit,
          query: query || '',
          sort: sort + "_" + order,
          deletedFilter: deletedFilter || 'hide',
          clearedFilter: clearedFilter || 'show',
          pguRange: `${selectedLowFilterDiff},${selectedHighFilterDiff}`,
          specialDifficulties: uniqueSpecialDiffs.length > 0 ? uniqueSpecialDiffs.join(',') : undefined,
          onlyMyLikes: user ? onlyMyLikes : undefined,
          availableDlFilter: availableDlFilter || 'show',
          curatedTypesFilter: selectedCurationTypes.length > 0 ? selectedCurationTypes.join(',') : undefined,
          tagsFilter: selectedTags.length > 0 ? selectedTags.join(',') : undefined
        };
        
        const response = await api.get(
          `${import.meta.env.VITE_LEVELS}`,
          {
            params,
            cancelToken: new axios.CancelToken((c) => (cancelTokenRef.current = c)),
          }
        );

        const newLevels = response.data.results;
        setTotalLevels(response.data.total);
        
        if (resetPage) {
          // Replace entire list for new search/filter
          setLevelsData(newLevels);
          setPageNumber(0);
        } else {
          // Append new results for pagination
          setLevelsData(prev => [...prev, ...newLevels]);
        }
        
        setHasMore(response.data.hasMore);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Error fetching levels:', error);
        }
      }
    };

    const fetchLevelById = async () => {
      try {
        const response = await api.get(
          `${import.meta.env.VITE_LEVELS}/byId/${query.slice(1)}`,
          {
            cancelToken: new axios.CancelToken((c) => (cancelTokenRef.current = c)),
          }
        );
        if (response.data) {
          setLevelsData([response.data]);
          setTotalLevels(1);
          setHasMore(false);
        } else {
          setTotalLevels(0);
          setLevelsData([]);
          setHasMore(false);
        }
      } catch (error) {
        setTotalLevels(0);
        setLevelsData([]);
        if (!axios.isCancel(error) && error.response?.status !== 404) {
          console.error('Error fetching level by ID:', error);
        }
      }
    };

    if (query[0] == "#" && !isNaN(parseInt(query.slice(1)))) {
      await fetchLevelById();
    } else {
      await fetchLevels();
    }
  }, [
    query, 
    sort, 
    order, 
    pageNumber, 
    deletedFilter, 
    clearedFilter, 
    availableDlFilter,
    selectedLowFilterDiff, 
    selectedHighFilterDiff, 
    sliderQRange, 
    qSliderVisible, 
    selectedCurationTypes, 
    selectedTags, 
    selectedSpecialDiffs, 
    onlyMyLikes, 
    user,
  ]);


  function handleLikeToggle() {
    if (!user) {
      toast.error(t('level.errors.loginRequired'));
      return;
    }
    setOnlyMyLikes(!onlyMyLikes);
  }

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

  function handleSliderQChange(newRange) {
    // If newRange is a list of difficulty names, keep it as is
    if (newRange && newRange.length > 0 && typeof newRange[0] === 'string') {
      // For display purposes, convert to sortOrder values
      const sortOrderValues = newRange.map(name => {
        const diff = difficulties.find(d => d.name === name);
        return diff ? diff.sortOrder : 1;
      });
      
      // Ensure we have at least two values for the slider display
      if (sortOrderValues.length === 1) {
        setSliderQRangeDrag([sortOrderValues[0], sortOrderValues[0]]);
      } else {
        setSliderQRangeDrag([sortOrderValues[0], sortOrderValues[sortOrderValues.length - 1]]);
      }
    } else if (newRange && newRange.length === 2) {
      // Already sortOrder values
      setSliderQRangeDrag(newRange);
    } else if (newRange && newRange.length === 1) {
      // If we only have one value, duplicate it
      setSliderQRangeDrag([newRange[0], newRange[0]]);
    } else {
      // If we have no values, use the first Q difficulty
      const firstQ = qDifficulties[0]?.sortOrder || 1;
      setSliderQRangeDrag([firstQ, firstQ]);
    }
  }

  const handleSliderQChangeComplete = useCallback((newRange) => {
    // If newRange is a list of difficulty names, keep it as is
    // newrange = ["Q1", "Q2", "Q3"]

    if (!newRange) {
      setSliderQRange(qDifficulties.map(d => d.name));
      setSliderQRangeDrag([qDifficulties[0]?.sortOrder || 1, qDifficulties[qDifficulties.length - 1]?.sortOrder || 1]);
      return;
    }
    // Keep the list of difficulty names
    
    // For display purposes, convert to sortOrder values
    const sortOrderValues = newRange.map(name => {
      const diff = difficulties.find(d => d.name === name);
      return diff ? diff.sortOrder : 1;
    }).sort((a, b) => a - b);
    
    setSliderQRangeDrag([sortOrderValues[0], sortOrderValues[sortOrderValues.length - 1]]);
    setSliderQRange(newRange);
  }, [qDifficulties, difficulties]);

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
  }, [pguDifficulties]);

  function toggleSpecialDifficulty(diffName) {
    setSelectedSpecialDiffs(prev => {
      const newSelection = prev.includes(diffName)
        ? prev.filter(d => d !== diffName)
        : [...prev, diffName];
      
      return newSelection;
    });
  }

  function toggleCurationType(typeName) {
    setSelectedCurationTypes(prev => {
      const newSelection = prev.includes(typeName)
        ? prev.filter(name => name !== typeName)
        : [...prev, typeName];
      
      return newSelection;
    });
  }

  function toggleTag(tagName) {
    setSelectedTags(prev => {
      const newSelection = prev.includes(tagName)
        ? prev.filter(name => name !== tagName)
        : [...prev, tagName];
      
      return newSelection;
    });
  }

  function handleQueryChange(e) {
    const newValue = e.target.value;
    setSearchInput(newValue);
    setQuery(newValue);
    setPageNumber(0);
    setLevelsData([]);
  }

  // Note: Removed auto-clearing of curation types when filter changes to 'hide'
  // to preserve user's selection for when they switch back to 'only' mode

  // Clean up timeout when component unmounts
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (cancelTokenRef.current) {
        cancelTokenRef.current();
      }
    };
  }, []);

  // Debounced fetch on filter/query changes
  useEffect(() => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    setPageNumber(0);
    setLevelsData([]);
    setHasMore(true);

    // Set a new timeout to trigger fetch after 500ms
    fetchTimeoutRef.current = setTimeout(() => {
      fetchLevelsData(true);
    }, 500);
    
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      if (cancelTokenRef.current) {
        cancelTokenRef.current();
      }
    };
  }, [query, sort, order, deletedFilter, clearedFilter, availableDlFilter, selectedLowFilterDiff, selectedHighFilterDiff, sliderQRange, qSliderVisible, selectedCurationTypes, selectedTags, selectedSpecialDiffs, onlyMyLikes, user]);

  // Direct fetch for page number changes (pagination)
  useEffect(() => {
    if (pageNumber === 0) return; // Skip initial page load, handled by debounced effect
    
    fetchLevelsData(false);
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current();
      }
    };
  }, [pageNumber, fetchLevelsData]);

  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  function handleStateDisplayOpen() {
    setStateDisplayOpen(!stateDisplayOpen);
  }

  function handleSortType(value) {
    setSort(value);
    setPageNumber(0);
    setLevelsData([]);
    setHasMore(true);
  }

  function handleSortOrder(value) {
    setOrder(value);
    setPageNumber(0);
    setLevelsData([]);
    setHasMore(true);
  }

  function resetAll() {
    setSort("RECENT_DESC");
    setSearchInput("");
    setQuery("");
    // Reset to initial PGU range
    setSelectedLowFilterDiff("P1");
    setSelectedHighFilterDiff("U20");
    setSliderRange([1, difficulties.find(d => d.name === "U20").sortOrder]);
    
    // Reset Q range to first and last Q difficulty (includes GQ)
    if (qDifficulties.length > 0) {
      setSliderQRange(qDifficulties.map(d => d.name));
      setSliderQRangeDrag([qDifficulties[0].sortOrder, qDifficulties[qDifficulties.length - 1].sortOrder]);
    } else {
      setSliderQRange([]);
      setSliderQRangeDrag([1, 1]);
    }
    
    // Reset special difficulties
    setSelectedSpecialDiffs([]);
    // Reset filters
    setDeletedFilter("hide");
    setClearedFilter("show");
    setAvailableDlFilter("show");
    setSelectedCurationTypes([]);
    setQSliderVisible(false);
    setPageNumber(0);
    setLevelsData([]);
    setHasMore(true);
  }


  if (difficulties.length === 0) {
    return (
      <div className="level-page">
        <MetaTags
          title={t('level.meta.title')}
          description={t('level.meta.description')}
          url={currentUrl}
          image={''}
          type="article"
        />
        
  
        <div className="level-body page-content-70rem">
          <div className="level-body-content" style={{marginTop: "45vh"}} >
            <div className="loader loader-level-page" style={{top: "-6rem"}}></div>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", justifyContent: "center", textAlign: "center"}}>
              {t('level.loading.difficulties')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="level-page">
      <MetaTags
        title={t('level.meta.title')}
        description={t('level.meta.description')}
        url={currentUrl}
        image={''}
        type="article"
      />
      

      <div className="level-body page-content-70rem">
        <ScrollButton />
        <ReferencesButton />
        <div className="search-section">
           {/* Search Row */}
           <div className="search-row">
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
               <span>{t('level.buttons.searchHelp')}</span>
             </button>

             <input
               value={searchInput}
               autoComplete='off'
               type="text"
               placeholder={t('level.input.placeholder')}
               onChange={handleQueryChange}
               className={searchInput != query ? 'search-pending' : ''}
             />
           </div>

           {/* Buttons Row */}
           <div className="buttons-row">
             <FilterIcon
               color="#ffffff"
               onClick={() => handleFilterOpen()}
               data-tooltip-id="filter"
               className={`action-button ${filterOpen ? 'active' : ''}`}
             />

             <SortIcon
               color="#ffffff"
               onClick={() => handleSortOpen()}
               data-tooltip-id="sort"
               className={`action-button ${sortOpen ? 'active' : ''}`}
             />

             <SwitchIcon
               color="#ffffff"
               onClick={() => handleStateDisplayOpen()}
               data-tooltip-id="state-display"
               className={`action-button ${stateDisplayOpen ? 'active' : ''}`}
             />

             <ResetIcon
               color="#ffffff"
               onClick={() => resetAll()}
               data-tooltip-id="reset"
               className="action-button"
             />
           </div>

           <Tooltip id="search" place="bottom" noArrow>
             {t('level.toolTip.search')}
           </Tooltip>
           <Tooltip id="filter" place="bottom" noArrow>
             {t('level.toolTip.filter')}
           </Tooltip>
           <Tooltip id="sort" place="bottom" noArrow>
             {t('level.toolTip.sort')}
           </Tooltip>
           <Tooltip id="reset" place="bottom" noArrow>
             {t('level.toolTip.reset')}
           </Tooltip>
           <Tooltip id="state-display" place="bottom" noArrow>
             {t('level.toolTip.stateDisplay')}
           </Tooltip>
        </div>

        <div className="input-setting">

          <div
            className={`filter settings-class ${filterOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">
              {t('level.settingExp.headerFilter')}
            </h2>
            <div className="filter-section">
              <div className="filter-row">
                <DifficultySlider
                  values={sliderRange}
                  onChange={handleSliderChange}
                  onChangeComplete={handleSliderChangeComplete}
                  mode="pgu"
                />
              </div>
              <div className={`sliders-container ${qSliderVisible ? 'has-sliders' : ''}`}>
                <div className={`q-slider-wrapper ${qSliderVisible ? 'visible' : 'hidden'}`}>
                  <DifficultySlider
                    values={sliderQRangeDrag}
                    onChange={handleSliderQChange}
                    onChangeComplete={handleSliderQChangeComplete}
                    mode="q"
                  />
                </div>
              </div>
              <div className="filter-row">
                <div className={`special-difficulties-wrapper`}>
                <TagSelector
                  items={specialDifficulties}
                  selectedItems={selectedSpecialDiffs}
                  disableQuantum={true}
                  onToggle={toggleSpecialDifficulty}
                  title={t('level.settingExp.specialDifficulties')}
                />
                </div>
                <div className={`curation-types-wrapper`}>
                <TagSelector
                  items={curationTypes}
                  selectedItems={selectedCurationTypes}
                  onToggle={toggleCurationType}
                  enableGrouping={false}
                  title={t('level.settingExp.curationTypes')}
                />
                </div>
                <div className={`tags-selector-group`}>
                  <div className={`tags-wrapper`}>
                    <TagSelector
                      items={tags}
                      selectedItems={selectedTags}
                      onToggle={toggleTag}
                      title={t('level.settingExp.tags')}
                    />
                  </div>
                  <button
                    className={`tags-visibility-toggle ${!showTagsInCards ? 'hidden' : ''}`}
                    onClick={() => setShowTagsInCards(!showTagsInCards)}
                    title={showTagsInCards ? 'Hide tags in cards' : 'Show tags in cards'}
                  >
                    {showTagsInCards ? <EyeIcon size="18px" /> : <EyeOffIcon size="18px" />}
                  </button>
                </div>
                <button 
                  className={`q-toggle-button ${qSliderVisible ? 'active' : ''}`}
                  onClick={() => {
                    setQSliderVisible(!qSliderVisible);
                  }}
                  title={t('level.toolTip.toggleQSlider')}
                  data-tooltip-id="q-toggle"
                >
                  <img src={difficulties.find(d => d.name === "Qq" || d.name.startsWith("Q")).icon} alt="Q Slider" />
                </button>
                <Tooltip id="q-toggle" place="bottom" noArrow>
                  {t('level.toolTip.toggleQSlider')}
                </Tooltip>
              </div>

            </div>
          </div>

          <div
            className={`sort sort-class ${sortOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">
              {t('level.settingExp.headerSort')}
            </h2>
            <div className="sort-option">
            <CustomSelect
                  value={sortOptions.find(option => sort === option.value)}
                  onChange={(option) => handleSortType(option.value)}
                  options={sortOptions}
                  label={t('level.settings.sort.header')}
                />
                
                <div className="order">
                <p>{t('level.settingExp.sortOrder')}</p>
                <Tooltip id="ascending" place="bottom" noArrow>
                  {t('level.toolTip.orderAsc')}
                </Tooltip>
                <Tooltip id="descending" place="bottom" noArrow>
                  {t('level.toolTip.orderDesc')}
                </Tooltip>

                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        order === 'ASC' ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="RECENT_ASC"
                    onClick={() => handleSortOrder("ASC")}
                    data-tooltip-id="ascending"
                  />

                  <SortDescIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        order === 'DESC' ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSortOrder("DESC")}
                    value="RECENT_DESC"
                    data-tooltip-id="descending"
                  />
                </div>
              </div>
              
              {user && (
              <div className="order" >
                <div className={`wrapper-like ${onlyMyLikes ? 'active' : ''}`} onClick={() => handleLikeToggle()}>
                  <LikeIcon color={onlyMyLikes ? "var(--color-white)" : "none"} size={"22px"} />
                  <p>{t('level.settingExp.myLikes')}</p>
                </div>
              </div>
              )}
            </div>
          </div>

          <div
            className={`state-switches state-switches-class ${stateDisplayOpen ? 'visible' : 'hidden'}`}
          >
            <div className="state-switches-option">
              <div className="state-switches-item">
                <span className="state-switches-label">{t('level.settingExp.clearedLevels')}</span>
                <StateDisplay
                  currentState={clearedFilter}
                  onChange={(newState) => {
                    setClearedFilter(newState);
                  }}
                  states={['show', 'hide', 'only']}
                />
              </div>
              <div className="state-switches-item">
                <span className="state-switches-label">{t('level.settingExp.availableDl')}</span>
                <StateDisplay
                  currentState={availableDlFilter}
                  onChange={(newState) => {
                    setAvailableDlFilter(newState);
                  }}
                  states={['show', 'hide', 'only']}
                />
              </div>
              {user && (
                <div className="state-switches-item">
                  <span className="state-switches-label">{
                  hasFlag(user, permissionFlags.SUPER_ADMIN) 
                  ? t('level.settingExp.deletedLevels') 
                  : t('level.settingExp.myHiddenLevels')}</span>
                  <StateDisplay
                    currentState={deletedFilter}
                    onChange={(newState) => {
                      setDeletedFilter(newState);
                    }}
                    states={['show', 'hide', 'only']}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <span className="total-search-results">{t('level.totalResults', { count: totalLevels })}</span>
        <div className="view-mode-section">
          <p>{t('level.settingExp.viewMode')}</p>
          <div className="view-mode-buttons">
            <button 
              className={`view-mode-button ${viewMode === 'normal' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('normal');
                // View mode change doesn't need refresh, it's just UI
              }}
              title={t('level.toolTip.normalView')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z"/>
              </svg>
            </button>
            <button 
              className={`view-mode-button ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('compact');
                // View mode change doesn't need refresh, it's just UI
              }}
              title={t('level.toolTip.compactView')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 4h18v1H3V4zm0 7h18v1H3v-1zm0 7h18v1H3v-1z"/>
              </svg>
            </button>
            <button 
              className={`view-mode-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('grid');
                // View mode change doesn't need refresh, it's just UI
              }}
              title={t('level.toolTip.gridView')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm0 11h7v7h-7v-7zm-11 0h7v7H3v-7z"/>
              </svg>
            </button>
          </div>

          {viewMode === 'grid' && (
            <div className="size-slider-container">
              <p>{t('level.settingExp.cardSize')}</p>
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
          style={{ paddingBottom: "7rem", overflow: "visible", "position": "relative", "zIndex": "5" }}
          dataLength={levelsData.length}
          next={() => setPageNumber((prevPageNumber) => prevPageNumber + 1)}
          hasMore={hasMore}
          loader={<div className="loader loader-level-page"></div>}
          endMessage={
            <p className="end-message">
              <b>{t('level.infScroll.end')}</b>
            </p>}
        >
          <div className={`${viewMode === 'grid' ? 'level-cards-grid' : ''} infinite-scroll-container`}>
            {levelsData.map((l, index) => (
              <LevelCard
                key={index}
                level={l}
                legacyMode={legacyDiff}
                user={user}
                sortBy={sort}
                displayMode={viewMode}
                size={cardSize}
                showTags={showTagsInCards}
              />
            ))}
          </div>
        </InfiniteScroll>

        {showHelpPopup && (<LevelHelpPopup onClose={() => setShowHelpPopup(false)} />)}
      </div>
    </div>
  );
};

export default LevelPage;

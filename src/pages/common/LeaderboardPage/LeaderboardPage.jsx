import "./leaderboardpage.css";
import { useContext, useEffect, useState, useRef } from "react";
import { PlayerCard } from "@/components/cards";
import { StateDisplay, CustomSelect, CountrySelect, RangeSelector } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import api from '@/utils/api';
import { PlayerContext } from "@/contexts/PlayerContext";
import { useTranslation } from "react-i18next";
import { ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { useAuth } from "@/contexts/AuthContext";
import { SortDescIcon, SortAscIcon, SortIcon, FilterIcon, ResetIcon } from "@/components/common/icons";
import { CreatorAssignmentPopup } from "@/components/popups/Creators";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

const currentUrl = window.location.origin + location.pathname;
const limit = 30;

const LeaderboardPage = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
  const [hasMore, setHasMore] = useState(true);
  const [showCreatorAssignment, setShowCreatorAssignment] = useState(false);
  const [selectedPlayerUser, setSelectedPlayerUser] = useState(null);
  const [selectedFilterField, setSelectedFilterField] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedFilterKey, setSelectedFilterKey] = useState(null);
  const debounceTimerRef = useRef(null);

  const {
    playerData,
    setPlayerData,
    displayedPlayers,
    setDisplayedPlayers,
    filterOpen,
    setFilterOpen,
    sortOpen,
    setSortOpen,
    maxFields,
    setMaxFields,
    filters,
    setFilters,
    country,
    setCountry,
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
    { value: 'rankedScore', label: t('leaderboard.sortOptions.rankedScore') },
    { value: 'generalScore', label: t('leaderboard.sortOptions.generalScore') },
    { value: 'ppScore', label: t('leaderboard.sortOptions.ppScore') },
    { value: 'wfScore', label: t('leaderboard.sortOptions.wfScore') },
    { value: 'averageXacc', label: t('leaderboard.sortOptions.averageXacc') },
    { value: 'totalPasses', label: t('leaderboard.sortOptions.totalPasses') },
    { value: 'universalPassCount', label: t('leaderboard.sortOptions.universalPassCount') },
    { value: 'score12K', label: t('leaderboard.sortOptions.score12K') },
    { value: 'worldsFirstCount', label: t('leaderboard.sortOptions.worldsFirstCount') },
    { value: 'topDiff', label: t('leaderboard.sortOptions.topDiff') },
    { value: 'top12kDiff', label: t('leaderboard.sortOptions.top12kDiff') }
  ];

  const filterableFields = [
    { key: 'rankedScore', label: t('leaderboard.sortOptions.rankedScore'), maxKey: 'maxRankedScore', step: 1 },
    { key: 'generalScore', label: t('leaderboard.sortOptions.generalScore'), maxKey: 'maxGeneralScore', step: 1 },
    { key: 'ppScore', label: t('leaderboard.sortOptions.ppScore'), maxKey: 'maxPpScore', step: 1 },
    { key: 'wfScore', label: t('leaderboard.sortOptions.wfScore'), maxKey: 'maxWfScore', step: 1 },
    { key: 'score12K', label: t('leaderboard.sortOptions.score12K'), maxKey: 'maxScore12K', step: 1 },
    { key: 'averageXacc', label: t('leaderboard.sortOptions.averageXacc'), maxKey: 'maxAverageXacc', step: 0.01, isPercentage: true },
    { key: 'totalPasses', label: t('leaderboard.sortOptions.totalPasses'), maxKey: 'maxTotalPasses', step: 1 },
    { key: 'universalPassCount', label: t('leaderboard.sortOptions.universalPassCount'), maxKey: 'maxUniversalPassCount', step: 1 },
    { key: 'worldsFirstCount', label: t('leaderboard.sortOptions.worldsFirstCount'), maxKey: 'maxWorldsFirstCount', step: 1 },
  ];

  const fetchPlayers = async (offset = 0) => {
    try {
      const params = new URLSearchParams({
        query: query,
        sortBy: sortBy,
        order: sort.toLowerCase(),
        offset: offset,
        limit: limit,
        showBanned: showBanned
      });

      // Add filters if they exist
      if (filters && Object.keys(filters).length > 0 || country) {
        // Convert percentage filters back to decimal values for API
        const apiFilters = { ...filters };
        if (apiFilters.averageXacc) {
          apiFilters.averageXacc = [
            apiFilters.averageXacc[0] / 100,
            apiFilters.averageXacc[1] / 100
          ];
        }
        params.append('filters', JSON.stringify({...apiFilters, country: country}));
      }
      
      const endpoint = `/v2/database/leaderboard?${params.toString()}`;
      const response = await api.get(endpoint);
      
      if (offset === 0) {
        setPlayerData(response.data.results);
        setDisplayedPlayers(response.data.results);
        
        // Store maxFields if they're in the response
        if (response.data.maxFields) {
          setMaxFields(response.data.maxFields);
        }
      } else {
        setPlayerData(prev => [...prev, ...response.data.results]);
        setDisplayedPlayers(prev => [...prev, ...response.data.results]);
      }
      
      setHasMore(displayedPlayers.length < response.data.count);
    } catch (error) {
      if (!api.isCancel(error)) {
        console.error('Error fetching leaderboard data:', error);
      }
    }
  };

  // Sync activeFilters with filters from context
  useEffect(() => {
    if (filters && Object.keys(filters).length > 0) {
      setActiveFilters(filters);
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      let cancelToken = api.CancelToken.source();
      setPlayerData(null);
      
      fetchPlayers(0);

      return () => {
        cancelToken.cancel('Request cancelled due to component update');
      };
    }, 500);
  }, [forceUpdate, query, sort, sortBy, showBanned, country, filters]);

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setForceUpdate(prev => !prev);
  }

  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
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

  const addFilter = () => {
    if (selectedFilterField && !activeFilters[selectedFilterField.key]) {
      let maxValue = maxFields[selectedFilterField.maxKey] || 1000;
      
      // Convert to percentage if needed
      if (selectedFilterField.isPercentage) {
        maxValue = maxValue * 100;
      }
      
      const newFilterValue = [0, Math.ceil(maxValue)];
      
      setActiveFilters(prev => ({
        ...prev,
        [selectedFilterField.key]: newFilterValue
      }));
      
      setFilters(prev => ({
        ...prev,
        [selectedFilterField.key]: newFilterValue
      }));
      
      setSelectedFilterKey(selectedFilterField.key);
      setSelectedFilterField(null);
    }
  };

  const removeFilter = (key) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    
    if (selectedFilterKey === key) {
      const remainingKeys = Object.keys(activeFilters).filter(k => k !== key);
      setSelectedFilterKey(remainingKeys[0] || null);
    }
  };

  function resetAll() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSortBy(sortOptions[0].value);
    setSort("DESC");
    setQuery("");
    setShowBanned('hide');
    setCountry('');
    setActiveFilters({});
    setFilters({});
    setSelectedFilterField(null);
    setSelectedFilterKey(null);
    setForceUpdate(prev => !prev);
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
        title={t('leaderboard.meta.title')}
        description={t('leaderboard.meta.description')}
        url={currentUrl}
        image="/leaderboard-preview.jpg"
        type="website"
      />
      

      <div className="leaderboard-body page-content-70rem">
        <ScrollButton />  
        
        <div className="leaderboard-input-option">
          <div className="search-container">
            <input
              value={query}
              autoComplete='off'
              type="text"
              placeholder={t('leaderboard.input.placeholder')}
              onChange={handleQueryChange}
            />
          </div>

          <div className="button-container">
            <Tooltip id="filter" place="bottom" noArrow>
              {t('leaderboard.tooltips.filter')}
            </Tooltip>
            <Tooltip id="sort" place="bottom" noArrow>
              {t('leaderboard.tooltips.sort')}
            </Tooltip>
            <Tooltip id="reset" place="bottom" noArrow>
              {t('leaderboard.tooltips.reset')}
            </Tooltip>

            <FilterIcon
              data-tooltip-id="filter"
              color="#ffffff"
              style={{
                backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
              }}
              onClick={handleFilterOpen}
            />

            <SortIcon
              data-tooltip-id="sort"
              color="#ffffff"
              style={{
                backgroundColor: sortOpen ? "rgba(255, 255, 255, 0.7)" : "",
              }}
              onClick={handleSortOpen}
            />
            
            <ResetIcon
              color="#ffffff"
              onClick={resetAll}
              data-tooltip-id="reset"
            />
          </div>
        </div>

        <div className="input-setting">
          <div className={`filter settings-class ${filterOpen ? 'visible' : 'hidden'}`}>
            <h2 className="setting-title">
              {t('leaderboard.settings.filter.header')}
            </h2>
            
            <div className="filter-section">
              <div className="filter-row">
                <div className="filter-container country-filter">
                  <p className="setting-description">{t('leaderboard.settings.filter.country')}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <CountrySelect
                      value={country}
                      onChange={(country) => {
                        setCountry(country);
                      }}
                    />
                    {country && (
                      <button 
                        className="country-clear-button"
                        onClick={() => setCountry('')}
                        title="Clear country filter"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Filter Builder */}
              <div className="filter-builder" >
                <p className="setting-description">{t('leaderboard.settings.filter.addStatFilters')}</p>
                <div className="filter-selector-row">
                  <div className="filter-selector-container">
                    <CustomSelect
                      value={selectedFilterField ? { value: selectedFilterField, label: selectedFilterField.label } : null}
                      onChange={(option) => setSelectedFilterField(option?.value || null)}
                      options={filterableFields
                        .filter(f => !activeFilters[f.key])
                        .map(f => ({ value: f, label: f.label }))}
                      placeholder={t('leaderboard.settings.filter.selectStatPlaceholder')}
                      width="100%"
                    />
                  </div>
                  <button 
                    onClick={addFilter} 
                    disabled={!selectedFilterField}
                    className="add-filter-button"
                  >
                    {t('leaderboard.settings.filter.addFilterButton')}
                  </button>
                </div>

                {/* Active Filter Chips */}
                {Object.keys(activeFilters).length > 0 && (
                  <div className="filter-chips" style={{ marginTop: '1rem' }}>
                    {Object.entries(activeFilters).map(([key, values]) => {
                      const field = filterableFields.find(f => f.key === key);
                      if (!field) return null;
                      
                      const decimals = field.step < 1 ? 2 : 0;
                      const suffix = field.isPercentage ? '%' : '';
                      
                      return (
                        <div 
                          key={key} 
                          className={`filter-chip ${selectedFilterKey === key ? 'selected' : ''}`}
                          onClick={() => setSelectedFilterKey(key)}
                        >
                          <span className="filter-chip-label">{field.label}</span>
                          <span className="filter-chip-range">
                            {values[0].toFixed(decimals)}{suffix} - {values[1].toFixed(decimals)}{suffix}
                          </span>
                          <button 
                            className="filter-chip-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFilter(key);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Single Range Selector for Selected Filter */}
                {selectedFilterKey && activeFilters[selectedFilterKey] && (
                  <div className="filter-range-editor" style={{ marginTop: '1rem' }}>
                    {(() => {
                      const field = filterableFields.find(f => f.key === selectedFilterKey);
                      if (!field) return null;
                      
                      let maxValue = maxFields[field.maxKey] || 1000;
                      
                      // Convert to percentage if needed
                      if (field.isPercentage) {
                        maxValue = maxValue * 100;
                      }

                      const decimals = field.step < 1 ? 2 : 0;
                      const suffix = field.isPercentage ? '%' : '';
                      
                      const currentValues = activeFilters[selectedFilterKey];
                      
                      return (
                        <>
                          <p className="setting-description" style={{ marginBottom: '0.5rem' }}>
                            {field.label}
                          </p>
                          <RangeSelector
                            values={currentValues}
                            onChange={(newValues) => {
                              // Update activeFilters for immediate visual feedback during drag
                              setActiveFilters(prev => ({ ...prev, [selectedFilterKey]: newValues }));
                            }}
                            onChangeComplete={(newValues) => {
                              // Update both activeFilters and filters to trigger API refresh
                              setActiveFilters(prev => ({ ...prev, [selectedFilterKey]: newValues }));
                              setFilters(prev => ({ ...prev, [selectedFilterKey]: newValues }));
                            }}
                            min={0}
                            max={Math.ceil(maxValue)}
                            decimals={decimals}
                            suffix={suffix}
                            step={field.step}
                            minLabel={t('leaderboard.settings.filter.min') + suffix}
                            maxLabel={t('leaderboard.settings.filter.max') + suffix}
                          />
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`sort settings-class ${sortOpen ? 'visible' : 'hidden'}`}>
            <h2 className="setting-title">
              {t('leaderboard.settings.sort.header')}
            </h2>

            <div className="sort-option">
              <div className="recent">
                <p>{t('leaderboard.settings.sort.sortOrder')}</p>
                <Tooltip id="ra" place="top" noArrow>
                  {t('leaderboard.tooltips.recentAsc')}
                </Tooltip>
                <Tooltip id="rd" place="top" noArrow>
                  {t('leaderboard.tooltips.recentDesc')}
                </Tooltip>

                <div className="wrapper">
                  <SortAscIcon 
                    data-tooltip-id="ra"
                    style={{
                      backgroundColor: sort === "ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("ASC")}
                  />

                  <SortDescIcon
                    data-tooltip-id="rd"
                    style={{
                      backgroundColor: sort === "DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("DESC")}
                  />
                </div>
              </div>
              <div className="recent">
                <p>{t('leaderboard.settings.sort.sortBy')}</p>
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
                    label={t('leaderboard.bannedPlayers.label')}
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
            <div className="loader loader-level-page"></div>
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
                    <b>{t('leaderboard.infiniteScroll.end')}</b>
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

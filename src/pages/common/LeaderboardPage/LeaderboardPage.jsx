import { routes } from '@/api/routes';
// tuf-search: #LeaderboardPage #leaderboardPage #leaderboard — Leaderboard
import "./leaderboardpage.css";
import "@/pages/common/search-section.css";
import { useContext, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import axios from "axios";
import { PlayerCard } from "@/components/cards";
import { StateDisplay, CustomSelect, CountrySelect, RangeSelector } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import { VirtualList } from "@/components/common/VirtualList";
import api from '@/utils/api';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { PlayerContext } from "@/contexts/PlayerContext";
import { useTranslation } from "react-i18next";
import { ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { buildLeaderboardMeta } from '@/utils/meta';
import { useAuth } from "@/contexts/AuthContext";
import { SortDescIcon, SortAscIcon, SortIcon, FilterIcon, ResetIcon, RewindIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { CreatorAssignmentPopup } from "@/components/popups/Creators";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { normalizePlayerSearchQuery } from '@/utils/normalizeEntitySearchQuery';
import HistoryTimeline from './HistoryTimeline';

const limit = 30;

const DEFAULT_PLAYER_FLAG_FILTER = { field: 'isBanned', mode: 'hide' };
const PLAYER_FLAG_FIELDS = ['isBanned', 'isSubmissionsPaused', 'isRatingBanned'];

const LeaderboardPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const { user } = useAuth();
  const [hasMore, setHasMore] = useState(true);
  const [showCreatorAssignment, setShowCreatorAssignment] = useState(false);
  const [selectedPlayerUser, setSelectedPlayerUser] = useState(null);
  const [selectedFilterField, setSelectedFilterField] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [selectedFilterKey, setSelectedFilterKey] = useState(null);
  const runRequest = useDebouncedRequest(500);
  const historyRequest = useDebouncedRequest(500);
  const isFirstListEffectRef = useRef(true);

  const [pastMode, setPastMode] = useState(false);
  const [historyDate, setHistoryDate] = useState(null);
  const [historyMetric, setHistoryMetric] = useState('rankedScore');
  const [historySort, setHistorySort] = useState('ASC');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyPlayers, setHistoryPlayers] = useState(null);
  const [historyTotal, setHistoryTotal] = useState(null);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyMinDate, setHistoryMinDate] = useState(null);
  const [historyMaxDate, setHistoryMaxDate] = useState(null);
  const [historySortOpen, setHistorySortOpen] = useState(false);

  const {
    playerData,
    setPlayerData,
    displayedPlayers,
    setDisplayedPlayers,
    leaderboardListTotal,
    setLeaderboardListTotal,
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
    playerFlagFilter,
    setPlayerFlagFilter,
    forceUpdate,
    setForceUpdate
  } = useContext(PlayerContext);

  const pageMeta = useMemo(
    () =>
      buildLeaderboardMeta({
        title: pastMode
          ? t('leaderboard.past.metaTitle', { date: historyDate || '' })
          : t('leaderboard.meta.title'),
        description: pastMode
          ? t('leaderboard.past.metaDescription', { date: historyDate || '' })
          : t('leaderboard.meta.description'),
        pathname: location.pathname,
        players: pastMode ? historyPlayers : displayedPlayers,
      }),
    [t, location.pathname, displayedPlayers, pastMode, historyDate, historyPlayers],
  );

  const sortOptions = [
    { value: 'rankedScore', label: t('leaderboard.sortOptions.rankedScore') },
    { value: 'totalScoreV2', label: t('leaderboard.sortOptions.totalScoreV2') },
    { value: 'ppScore', label: t('leaderboard.sortOptions.ppScore') },
    { value: 'wfScore', label: t('leaderboard.sortOptions.wfScore') },
    { value: 'wfPPScore', label: t('leaderboard.sortOptions.wfPPScore') },
    { value: 'averageXacc', label: t('leaderboard.sortOptions.averageXacc') },
    { value: 'totalPasses', label: t('leaderboard.sortOptions.totalPasses') },
    { value: 'universalPassCount', label: t('leaderboard.sortOptions.universalPassCount') },
    { value: 'score12K', label: t('leaderboard.sortOptions.score12K') },
    { value: 'generalScore', label: t('leaderboard.sortOptions.generalScore') },
    { value: 'worldsFirstCount', label: t('leaderboard.sortOptions.worldsFirstCount') },
    { value: 'worldsFirstPPCount', label: t('leaderboard.sortOptions.worldsFirstPPCount') },
    { value: 'topDiff', label: t('leaderboard.sortOptions.topDiff') },
    { value: 'top12kDiff', label: t('leaderboard.sortOptions.top12kDiff') }
  ];

  const historyMetricOptions = useMemo(
    () => [
      { value: 'rankedScore', label: t('leaderboard.past.metricRanked') },
      { value: 'generalScore', label: t('leaderboard.past.metricGeneral') },
    ],
    [t],
  );

  const flagFieldOptions = useMemo(
    () =>
      PLAYER_FLAG_FIELDS.map((field) => ({
        value: field,
        label: t(`leaderboard.playerFlagFilter.fields.${field}`),
      })),
    [t],
  );

  const handlePlayerFlagFilterChange = (nextFilter) => {
    setPlayerFlagFilter(nextFilter);
    setDisplayedPlayers(null);
    setPlayerData(null);
    setLeaderboardListTotal(null);
    setForceUpdate((prev) => !prev);
  };

  const filterableFields = [
    { key: 'rankedScore', label: t('leaderboard.sortOptions.rankedScore'), maxKey: 'maxRankedScore', step: 1 },
    { key: 'totalScoreV2', label: t('leaderboard.sortOptions.totalScoreV2'), maxKey: 'maxTotalScoreV2', step: 1 },
    { key: 'ppScore', label: t('leaderboard.sortOptions.ppScore'), maxKey: 'maxPpScore', step: 1 },
    { key: 'wfScore', label: t('leaderboard.sortOptions.wfScore'), maxKey: 'maxWfScore', step: 1 },
    { key: 'wfPPScore', label: t('leaderboard.sortOptions.wfPPScore'), maxKey: 'maxWfPPScore', step: 1 },
    { key: 'score12K', label: t('leaderboard.sortOptions.score12K'), maxKey: 'maxScore12K', step: 1 },
    { key: 'generalScore', label: t('leaderboard.sortOptions.generalScore'), maxKey: 'maxGeneralScore', step: 1 },
    { key: 'averageXacc', label: t('leaderboard.sortOptions.averageXacc'), maxKey: 'maxAverageXacc', step: 0.01, isPercentage: true },
    { key: 'totalPasses', label: t('leaderboard.sortOptions.totalPasses'), maxKey: 'maxTotalPasses', step: 1 },
    { key: 'universalPassCount', label: t('leaderboard.sortOptions.universalPassCount'), maxKey: 'maxUniversalPassCount', step: 1 },
    { key: 'worldsFirstCount', label: t('leaderboard.sortOptions.worldsFirstCount'), maxKey: 'maxWorldsFirstCount', step: 1 },
    { key: 'worldsFirstPPCount', label: t('leaderboard.sortOptions.worldsFirstPPCount'), maxKey: 'maxWorldsFirstPPCount', step: 1 },
  ];

  const fetchPlayers = async (offset = 0, { immediate = false } = {}) => {
    const runner = immediate ? runRequest.flush : runRequest;

    const effectiveFlagFilter = hasFlag(user, permissionFlags.SUPER_ADMIN)
      ? playerFlagFilter
      : DEFAULT_PLAYER_FLAG_FILTER;

    const params = new URLSearchParams({
      query: query,
      sortBy: sortBy,
      order: sort.toLowerCase(),
      offset: offset,
      limit: limit,
      flagField: effectiveFlagFilter.field,
      flagMode: effectiveFlagFilter.mode,
    });

    if (filters && Object.keys(filters).length > 0 || country) {
      const apiFilters = { ...filters };
      if (apiFilters.averageXacc) {
        apiFilters.averageXacc = [
          apiFilters.averageXacc[0] / 100,
          apiFilters.averageXacc[1] / 100
        ];
      }
      params.append('filters', JSON.stringify({...apiFilters, country: country}));
    }

    const endpoint = `${routes.playersV3.leaderboard()}?${params.toString()}`;
    try {
      const response = await runner(({ signal }) => api.get(endpoint, { signal }));

      const results = Array.isArray(response.data.results) ? response.data.results : [];

      const priorLen = offset === 0 ? 0 : (displayedPlayers?.length ?? 0);
      const nextLength = offset === 0 ? results.length : priorLen + results.length;
      const total = response.data.count ?? nextLength;

      if (offset === 0) {
        setPlayerData(results);
        setDisplayedPlayers(results);
        setLeaderboardListTotal(total);

        if (response.data.maxFields) {
          setMaxFields(response.data.maxFields);
        }
      } else {
        setPlayerData(prev => [...(prev ?? []), ...results]);
        setDisplayedPlayers(prev => [...(prev ?? []), ...results]);
      }

      setHasMore(nextLength < total);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error fetching leaderboard data:', error);
    }
  };

  const fetchHistoryPlayers = useCallback(async (offset = 0, { immediate = false, dateOverride } = {}) => {
    const date = dateOverride ?? historyDate;
    if (!date) return;

    const runner = immediate ? historyRequest.flush : historyRequest;

    const params = new URLSearchParams({
      date,
      metric: historyMetric,
      order: historySort.toLowerCase(),
      offset: String(offset),
      limit: String(limit),
    });
    if (historyQuery) {
      params.set('query', historyQuery);
    }

    const endpoint = `${routes.playersV3.leaderboardHistory()}?${params.toString()}`;
    try {
      const response = await runner(({ signal }) => api.get(endpoint, { signal }));
      const results = Array.isArray(response.data.results) ? response.data.results : [];

      if (response.data.minDate) setHistoryMinDate(response.data.minDate);
      if (response.data.maxDate) setHistoryMaxDate(response.data.maxDate);

      const total = response.data.count ?? results.length;

      if (offset === 0) {
        setHistoryPlayers(results);
        setHistoryTotal(total);
        setHistoryHasMore(results.length < total);
      } else {
        setHistoryPlayers((prev) => {
          const next = [...(prev ?? []), ...results];
          setHistoryHasMore(next.length < total);
          return next;
        });
      }
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error fetching historical leaderboard:', error);
      if (offset === 0) {
        setHistoryPlayers([]);
        setHistoryTotal(0);
        setHistoryHasMore(false);
      }
    }
  }, [historyDate, historyMetric, historySort, historyQuery, historyRequest]);

  useEffect(() => {
    if (filters && Object.keys(filters).length > 0) {
      setActiveFilters(filters);
    }
  }, []);

  useEffect(() => {
    if (pastMode) return;
    if (isFirstListEffectRef.current) {
      isFirstListEffectRef.current = false;
      const hasCached =
        Array.isArray(displayedPlayers) &&
        displayedPlayers.length > 0 &&
        leaderboardListTotal != null;
      if (hasCached) {
        setHasMore(displayedPlayers.length < leaderboardListTotal);
        return;
      }
    }
    setLeaderboardListTotal(null);
    setPlayerData(null);
    setDisplayedPlayers(null);
    fetchPlayers(0);
  }, [forceUpdate, query, sort, sortBy, playerFlagFilter, country, filters, pastMode]);

  useEffect(() => {
    if (!pastMode || !historyDate) return;
    setHistoryPlayers(null);
    setHistoryTotal(null);
    // Debounced so name search doesn't hammer the API; timeline already debounces date.
    fetchHistoryPlayers(0);
  }, [pastMode, historyDate, historyMetric, historySort, historyQuery]);

  const enterPastMode = async () => {
    setPastMode(true);
    setHistoryPlayers(null);
    setHistoryTotal(null);
    setHistorySortOpen(false);
    setFilterOpen(false);
    setSortOpen(false);

    // Already have a valid date from a previous visit — useEffect will fetch.
    if (historyDate && historyMinDate && historyMaxDate) {
      return;
    }

    try {
      // Bootstrap bounds only; server clamps an out-of-range date.
      const params = new URLSearchParams({
        date: '2099-01-01',
        metric: historyMetric,
        order: historySort.toLowerCase(),
        offset: '0',
        limit: '1',
      });
      const response = await api.get(
        `${routes.playersV3.leaderboardHistory()}?${params.toString()}`,
      );
      const minDate = response.data.minDate ?? null;
      const maxDate = response.data.maxDate ?? null;
      setHistoryMinDate(minDate);
      setHistoryMaxDate(maxDate);

      if (!maxDate) {
        setHistoryPlayers([]);
        setHistoryTotal(0);
        setHistoryHasMore(false);
        return;
      }

      setHistoryDate(maxDate);
    } catch (error) {
      console.error('Error entering past mode:', error);
      setHistoryPlayers([]);
      setHistoryTotal(0);
      setHistoryHasMore(false);
    }
  };

  const exitPastMode = () => {
    historyRequest.cancel();
    setPastMode(false);
    setHistoryPlayers(null);
    setHistoryTotal(null);
  };

  function handleQueryChange(e) {
    if (pastMode) {
      setHistoryQuery(normalizePlayerSearchQuery(e.target.value));
      return;
    }
    setQuery(normalizePlayerSearchQuery(e.target.value));
    setForceUpdate(prev => !prev);
  }

  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSortOpen() {
    if (pastMode) {
      setHistorySortOpen(!historySortOpen);
      return;
    }
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
    if (pastMode) {
      historyRequest.cancel();
      setHistoryMetric('rankedScore');
      setHistorySort('ASC');
      setHistoryQuery('');
      if (historyMaxDate) {
        setHistoryDate(historyMaxDate);
      }
      return;
    }
    runRequest.cancel();
    setSortBy(sortOptions[0].value);
    setSort("DESC");
    setQuery("");
    setPlayerFlagFilter(DEFAULT_PLAYER_FLAG_FILTER);
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
    setForceUpdate(prev => !prev);
    setShowCreatorAssignment(false);
    setSelectedPlayerUser(null);
  };

  const listPlayers = pastMode ? historyPlayers : playerData;
  const listDisplayed = pastMode ? historyPlayers : displayedPlayers;
  const listTotal = pastMode ? historyTotal : leaderboardListTotal;
  const listHasMore = pastMode ? historyHasMore : hasMore;
  const activeQuery = pastMode ? historyQuery : query;
  const activeSortOpen = pastMode ? historySortOpen : sortOpen;

  return (
    <div className={`leaderboard-page${pastMode ? ' leaderboard-page--past' : ''}`}>
      <MetaTags {...pageMeta} />
      

      <div className="leaderboard-body page-content-70rem">
        <ScrollButton />

        <div className="leaderboard-past-toggle-row">
          {pastMode ? (
            <button
              type="button"
              className="leaderboard-past-toggle leaderboard-past-toggle--active"
              onClick={exitPastMode}
            >
              <RewindIcon color="#fff" size={18} />
              <span>{t('leaderboard.past.backToPresent')}</span>
            </button>
          ) : (
            <button
              type="button"
              className="leaderboard-past-toggle"
              onClick={enterPastMode}
            >
              <RewindIcon color="#fff" size={18} />
              <span>{t('leaderboard.past.button')}</span>
            </button>
          )}
        </div>

        {pastMode && (
          <div className="leaderboard-past-banner">
            <h2 className="leaderboard-past-banner__title">{t('leaderboard.past.title')}</h2>
            <HistoryTimeline
              value={historyDate}
              min={historyMinDate}
              max={historyMaxDate}
              onChangeComplete={(iso) => setHistoryDate(iso)}
            />
          </div>
        )}
        
        <div className="leaderboard-input-option">
          <div className="search-container">
            <input
              value={activeQuery}
              autoComplete='off'
              type="text"
              placeholder={t('leaderboard.input.placeholder')}
              onChange={handleQueryChange}
            />
          </div>

          <div className="button-container">
            {!pastMode && (
              <Tooltip id="filter" place="bottom" noArrow>
                {t('leaderboard.tooltips.filter')}
              </Tooltip>
            )}
            <Tooltip id="sort" place="bottom" noArrow>
              {t('leaderboard.tooltips.sort')}
            </Tooltip>
            <Tooltip id="reset" place="bottom" noArrow>
              {t('leaderboard.tooltips.reset')}
            </Tooltip>

            {!pastMode && (
              <FilterIcon
                data-tooltip-id="filter"
                color="#ffffff"
                style={{
                  backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
                }}
                onClick={handleFilterOpen}
              />
            )}

            <SortIcon
              data-tooltip-id="sort"
              color="#ffffff"
              style={{
                backgroundColor: activeSortOpen ? "rgba(255, 255, 255, 0.7)" : "",
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
          {!pastMode && (
          <Collapsible
            open={filterOpen}
            onOpenChange={setFilterOpen}
            revealOverflow
            duration="0.6s"
          >
            <CollapsibleContent>
          <div className="filter settings-class">
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

                {selectedFilterKey && activeFilters[selectedFilterKey] && (
                  <div className="filter-range-editor" style={{ marginTop: '1rem' }}>
                    {(() => {
                      const field = filterableFields.find(f => f.key === selectedFilterKey);
                      if (!field) return null;
                      
                      let maxValue = maxFields[field.maxKey] || 1000;
                      
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
                              setActiveFilters(prev => ({ ...prev, [selectedFilterKey]: newValues }));
                            }}
                            onChangeComplete={(newValues) => {
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

              {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                <div className="player-flag-filter">
                  <div className="player-flag-filter__controls">
                    <CustomSelect
                      value={flagFieldOptions.find((option) => option.value === playerFlagFilter.field)}
                      onChange={(option) => {
                        if (!option?.value) return;
                        handlePlayerFlagFilterChange({
                          ...playerFlagFilter,
                          field: option.value,
                        });
                      }}
                      options={flagFieldOptions}
                      width="100%"
                    />
                    <StateDisplay
                      showLabel={false}
                      currentState={playerFlagFilter.mode}
                      onChange={(mode) => {
                        handlePlayerFlagFilterChange({
                          ...playerFlagFilter,
                          mode,
                        });
                      }}
                      states={['show', 'hide', 'only']}
                      width={60}
                      height={24}
                      padding={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
            </CollapsibleContent>
          </Collapsible>
          )}

          <Collapsible
            open={activeSortOpen}
            onOpenChange={pastMode ? setHistorySortOpen : setSortOpen}
            revealOverflow
            duration="0.6s"
          >
            <CollapsibleContent>
          <div className="sort settings-class">
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
                      backgroundColor: (pastMode ? historySort : sort) === "ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => pastMode ? setHistorySort("ASC") : handleSort("ASC")}
                  />

                  <SortDescIcon
                    data-tooltip-id="rd"
                    style={{
                      backgroundColor: (pastMode ? historySort : sort) === "DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => pastMode ? setHistorySort("DESC") : handleSort("DESC")}
                  />
                </div>
              </div>
              <div className="recent">
                <p>{t('leaderboard.settings.sort.sortBy')}</p>
                {pastMode ? (
                  <CustomSelect
                    value={historyMetricOptions.find((option) => option.value === historyMetric)}
                    onChange={(option) => {
                      if (option?.value) setHistoryMetric(option.value);
                    }}
                    options={historyMetricOptions}
                    width="11rem"
                  />
                ) : (
                  <CustomSelect
                    value={sortOptions.find(option => option.value === sortBy)}
                    onChange={handleSortBy}
                    options={sortOptions}
                    width="11rem"
                  />
                )}
              </div>
            </div>
          </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {listTotal != null && (
          <span className="total-search-results">
            {t('totalResults', { ns: 'common', count: listTotal })}
          </span>
        )}

        <div className="leaderboard-page__list" style={{ minHeight: "500px" }}>
          {listPlayers === null ? (
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          ) : listDisplayed?.length === 0 ? (
            <p className="leaderboard-empty-msg">
              {pastMode ? t('leaderboard.past.noData') : t('leaderboard.infiniteScroll.end')}
            </p>
          ) : (
            <VirtualList
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              items={listDisplayed}
              loadMore={() => {
                if (pastMode) {
                  fetchHistoryPlayers(listDisplayed?.length ?? 0, { immediate: true });
                } else {
                  fetchPlayers(listDisplayed?.length ?? 0, { immediate: true });
                }
              }}
              hasMore={listHasMore}
              loader={<div className="loader loader-relative" />}
              endMessage={
                listDisplayed.length > 0 && (
                  <p style={{ textAlign: "center" }}>
                    <b>{t('leaderboard.infiniteScroll.end')}</b>
                  </p>
                )
              }
              renderItem={(playerStat) => (
                <PlayerCard
                  currSort={pastMode ? historyMetric : sortBy}
                  player={playerStat}
                  historical={pastMode}
                  onCreatorAssignmentClick={pastMode ? undefined : handleCreatorAssignmentClick}
                />
              )}
              computeItemKey={(index, playerStat) => playerStat?.id ?? index}
            />
          )}
        </div>
      </div>

      {!pastMode && showCreatorAssignment && selectedPlayerUser && (
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

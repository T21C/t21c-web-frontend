import { routes } from '@/api/routes';
// tuf-search: #PassPage #passPage #pass — Pass List
import "./passpage.css";
import "@/pages/common/sort.css";
import "@/pages/common/search-section.css";
import { useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation } from 'react-router-dom';

import { MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from '@/utils/meta';
import { ScoreCard } from "@/components/cards";
import { StateDisplay, CustomSelect, FacetQueryBuilder } from "@/components/common/selectors";
import { Tooltip } from '@/components/common/display/Tooltip';
import { VirtualList } from "@/components/common/VirtualList";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { PassContext } from "@/contexts/PassContext";
import api from '@/utils/api';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { ScrollButton } from "@/components/common/buttons";
import { useAuth } from "@/contexts/AuthContext";
import { DifficultyContext } from "@/contexts/DifficultyContext";
import { DifficultySlider, TagSelector } from "@/components/common/selectors";
import { buildFacetQueryParam } from "@/utils/facetQueryCodec";
import { AdvancedSearchBar } from "@/components/common/AdvancedSearch";
import { ResetIcon, SortIcon, FilterIcon, SortAscIcon, SortDescIcon, SwitchIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { normalizePassSearchQuery } from '@/utils/normalizeEntitySearchQuery';
const limit = 30;

const PassPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('pass.meta.title'),
        description: t('pass.meta.description'),
        pathname: location.pathname,
        image: '/passes-preview.jpg',
        type: 'article',
      }),
    [t, location.pathname],
  );

  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { difficulties, tags } = useContext(DifficultyContext);
  const [selectedSpecialDiffs, setSelectedSpecialDiffs] = useState([]);
  const [stateDisplayOpen, setStateDisplayOpen] = useState(false);
  const runRequest = useDebouncedRequest(500);
  // Stable ES random_score seed for RANDOM sort across pagination/filter changes.
  const randomSeedRef = useRef(null);

  function createClientSeed() {
    return Math.floor(Math.random() * 0x100000000) >>> 0;
  }

  function getOrCreateRandomSeed(forceNew = false) {
    if (forceNew || randomSeedRef.current == null) {
      randomSeedRef.current = createClientSeed();
    }
    return randomSeedRef.current;
  }

  // Filter difficulties by type
  const pguDifficulties = difficulties.filter(d => d.type === 'PGU');
  const specialDifficulties = difficulties.filter(d => d.type === 'SPECIAL');

  const {
    passesData,
    setPassesData,
    filterOpen,
    setFilterOpen,
    sortOpen,
    setSortOpen,
    query,
    setQuery,
    sort,
    setSort,
    hasMore,
    setHasMore,
    totalPasses,
    setTotalPasses,
    pageNumber,
    setPageNumber,
    hide12k,
    setHide12k,
    deletedFilter,
    setDeletedFilter,
    selectedLowFilterDiff,
    setSelectedLowFilterDiff,
    selectedHighFilterDiff,
    setSelectedHighFilterDiff,
    forceUpdate,
    setForceUpdate,
    sliderRange,
    setSliderRange,
    keyFlag,
    setKeyFlag,
    wfFilter,
    setWfFilter,
    adofaiVersionFilter,
    setAdofaiVersionFilter,
    wrongJudgementFilter,
    setWrongJudgementFilter,
    passFacetFilters,
    setPassFacetFilters,
  } = useContext(PassContext);

  const sortOptions = [
    { value: 'RECENT', label: t('pass.settings.sort.options.date') },
    { value: 'SCORE', label: t('pass.settings.sort.options.score') },
    { value: 'XACC', label: t('pass.settings.sort.options.accuracy') },
    { value: 'DIFF', label: t('pass.settings.sort.options.difficulty') },
    { value: 'SPEED', label: t('pass.settings.sort.options.speed') },
    { value: 'KEYCOUNT', label: t('pass.settings.sort.options.keyCount') },
    { value: 'LIKES', label: t('pass.settings.sort.options.likes') },
    { value: 'RANDOM', label: t('pass.settings.sort.options.random') }
  ];

  // Centralized refresh function
  const triggerRefresh = () => {
    setPageNumber(0);
    setPassesData([]);
    setForceUpdate(f => !f);
  };

  useEffect(() => {
    // Pagination (pageNumber > 0) bypasses the debounce so infinite scroll
    // feels instant; filter / query / sort changes flow through the debounced
    // runner, which collapses rapid edits into a single request and aborts any
    // in-flight call when superseded.
    const runner = pageNumber > 0 ? runRequest.flush : runRequest;
    setLoading(true);

    const fetchPasses = async () => {
      try {
        // Handle ID-based search
        if (query.startsWith("#") && query.length > 1) {
          const passId = query.slice(1);
          if (!isNaN(passId) && passId.trim() !== '') {
            const response = await runner(({ signal }) =>
              api.get(`${routes.database.passes.root()}/byId/${passId}`, { signal })
            );
            setPassesData(response.data.results);
            setTotalPasses(response.data.count);
            setHasMore(false);
            setLoading(false);
            return;
          }
        }

        const facetQuery = buildFacetQueryParam(passFacetFilters);
        const requestBody = {
          limit,
          offset: pageNumber * limit,
          query,
          sort,
          deletedFilter,
          keyFlag,
          wfFilter,
          adofaiVersionFilter,
          wrongJudgementFilter,
          minDiff: selectedLowFilterDiff !== 0 ? selectedLowFilterDiff : undefined,
          maxDiff: selectedHighFilterDiff !== 0 ? selectedHighFilterDiff : undefined,
          specialDifficulties: selectedSpecialDiffs,
          ...(facetQuery ? { facetQuery } : {}),
          ...(sort.startsWith('RANDOM') ? { seed: getOrCreateRandomSeed() } : {}),
          withLikeState: true,
        };

        const response = await runner(({ signal }) =>
          api.get(`${routes.database.passes.root()}`, { params: requestBody, signal })
        );

        const newPasses = response.data.results;
        if (response.data.seed != null) {
          randomSeedRef.current = response.data.seed;
        }

        setPassesData((prev) => {
          if (pageNumber === 0) {
            return newPasses;
          }
          return [...prev, ...newPasses];
        });

        setHasMore(response.data.count > (pageNumber * limit) + newPasses.length);
        setTotalPasses(response.data.count);
        setLoading(false);
      } catch (error) {
        if (axios.isCancel(error)) return; // superseded by a newer request
        console.error('Fetch error:', error);
        setLoading(false);
      }
    };

    fetchPasses();
  }, [query, pageNumber, forceUpdate, deletedFilter, hide12k, selectedSpecialDiffs, keyFlag, wfFilter, adofaiVersionFilter, wrongJudgementFilter, sort, passFacetFilters]);

  function resetAll() {
    setSort("SCORE_DESC");
    randomSeedRef.current = null;
    setQuery("");
    // Reset to initial PGU range
    setSelectedLowFilterDiff("P1");
    setSelectedHighFilterDiff("U20");
    setSliderRange([1, difficulties.find(d => d.name === "U20")?.sortOrder || 61]);
    setKeyFlag("all");
    setWfFilter("none");
    setAdofaiVersionFilter("all");
    setDeletedFilter("hide");
    setWrongJudgementFilter("all");
    setPassFacetFilters({ tags: null, combine: 'and' });

    // Clear and reload data
    setLoading(true);
    triggerRefresh();
  }

  function handleQueryChange(e) {
    setQuery(normalizePassSearchQuery(e.target.value));
    triggerRefresh();
  }

  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSortType(value) {
    if (value === 'RANDOM') {
      getOrCreateRandomSeed(true);
    } else {
      randomSeedRef.current = null;
    }
    setSort(value + "_" +(sort.endsWith('ASC') ? 'ASC' : 'DESC'));
    setLoading(true);
    triggerRefresh();
  }

  function handleSortOrder(value) {
    setSort(prev => prev.replace(/ASC|DESC/g, value));
    setLoading(true);
    triggerRefresh();
  }


  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  function handleStateDisplayOpen() {
    setStateDisplayOpen(!stateDisplayOpen);
  }

  // Handle slider value updates without triggering immediate fetches
  function handleSliderChange(newRange) {
    setSliderRange(newRange);
    
    // Find difficulties corresponding to slider values
    const lowDiff = pguDifficulties.find(d => d.sortOrder === newRange[0]);
    const highDiff = pguDifficulties.find(d => d.sortOrder === newRange[1]);
    
    // Only update the local state, don't trigger fetch
    setSelectedLowFilterDiff(lowDiff.name || "P1");
    setSelectedHighFilterDiff(highDiff.name || "U20");
  }

  // Handle slider changes complete (after drag or click)
  const handleSliderChangeComplete = useCallback((newRange) => {
    // Find difficulties corresponding to slider values
    const lowDiff = pguDifficulties.find(d => d.sortOrder === newRange[0]);
    const highDiff = pguDifficulties.find(d => d.sortOrder === newRange[1]);
    
    // Update state and trigger fetch only on complete
    setSelectedLowFilterDiff(lowDiff.name || "P1");
    setSelectedHighFilterDiff(highDiff.name || "U20");
    setSliderRange(newRange);
    triggerRefresh();
  }, [pguDifficulties]);

  function toggleSpecialDifficulty(diffName) {
    setSelectedSpecialDiffs(prev => {
      const newSelection = prev.includes(diffName)
        ? prev.filter(d => d !== diffName)
        : [...prev, diffName];
      
      triggerRefresh();
      return newSelection;
    });
  }

  const renderContent = () => {
    // Initial difficulties loading
    if (difficulties.length === 0) {
      return (
        <div className="loader-shell loader-shell--fill">
          <div className="loader loader-relative" />
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", justifyContent: "center", textAlign: "center", margin: 0 }}>
            {t('pass.loading.difficulties')}
          </p>
        </div>
      );
    }

    // Loading state (passesData is null)
    if (passesData === null) {
      return (
        <div className="loader-shell loader-shell--fill">
          <div className="loader loader-relative" />
        </div>
      );
    }

    // Data loaded (passesData is an array)
    return (
      <VirtualList
        style={{paddingBottom: "6rem", minHeight: "90vh", overflow: "visible" }}
        listClassName="passes-list"
        items={passesData}
        loadMore={() => setPageNumber(pageNumber + 1)}
        hasMore={hasMore && !loading}
        loader={<div className="loader loader-relative" />}
        endMessage={
          !loading && (
            <p className="end-message">
              <b>{t('pass.infScroll.end')}</b>
            </p>
          )
        }
        renderItem={(pass) => (
          <ScoreCard
            scoreData={pass}
            mode="passcard"
            topScores={[]}
            potentialTopScores={[]}
          />
        )}
        computeItemKey={(index, pass) => pass?.id ?? index}
      />
    );
  };

  if (difficulties.length === 0) {
    return (
      <div className="pass-page">
        <MetaTags {...pageMeta} />

        <div className="pass-body page-content-70rem">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="pass-page">
      <MetaTags {...pageMeta} />

      <div className="pass-body page-content-70rem">
        <ScrollButton />
        <div className="search-section">
          {/* Search Row */}
          <AdvancedSearchBar
            profile="pass"
            value={query}
            onChange={handleQueryChange}
            placeholder={t('pass.input.placeholder')}
            helpLabel={t('pass.buttons.searchHelp')}
            pending={loading}
            tooltipId="search"
          />

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
              strokeWidth="1.5"
              stroke="currentColor"
              onClick={() => resetAll()}
              data-tooltip-id="reset"
              className="action-button"
            />
          </div>

          <Tooltip id="search" place="bottom" noArrow>
            {t('pass.toolTip.search')}
          </Tooltip>
          <Tooltip id="filter" place="bottom" noArrow>
            {t('pass.toolTip.filter')}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {t('pass.toolTip.sort')}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {t('pass.toolTip.reset')}
          </Tooltip>
          <Tooltip id="state-display" place="bottom" noArrow>
            {t('pass.toolTip.stateDisplay')}
          </Tooltip>
        </div>

        <div className="input-setting">
          <Collapsible
            open={filterOpen}
            onOpenChange={setFilterOpen}
            revealOverflow
            duration="0.6s"
          >
            <CollapsibleContent>
          <div className="filter settings-class">
            <h2 className="setting-title">{t('pass.settings.filter.title')}</h2>
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
                <TagSelector
                  items={specialDifficulties}
                  selectedItems={selectedSpecialDiffs}
                  onToggle={toggleSpecialDifficulty}
                />
                <div className="tags-wrapper">
                  <FacetQueryBuilder
                    items={tags}
                    value={passFacetFilters.tags}
                    onChange={(v) => {
                      setPassFacetFilters((prev) => ({ ...prev, tags: v }));
                      triggerRefresh();
                    }}
                    title={t('level.settingExp.tags')}
                  />
                </div>
                                  <StateDisplay
                    label={t('pass.settings.filter.options.wfFilter')}
                    currentState={wfFilter}
                    states={['none', 'wf', 'wfpp', 'either', 'both']}
                    onChange={(s) => {
                      setWfFilter(s);
                      triggerRefresh();
                    }}
                    width={60}
                  />
              </div>
            </div>
          </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={sortOpen}
            onOpenChange={setSortOpen}
            revealOverflow
            duration="0.6s"
          >
            <CollapsibleContent>
          <div className="sort sort-class">
            <h2 className="setting-title">
              {t('pass.settings.sort.title')}
            </h2>
            <div className="sort-option">
            <CustomSelect
                  value={sortOptions.find(option => sort.startsWith(option.value))}
                  onChange={(option) => handleSortType(option.value)}
                  options={sortOptions}
                  label={t('pass.settings.sort.header')}
                />
                
                <div className="order" style={{
                  opacity: sort.startsWith('RANDOM') ? "0.4" : "",
                  pointerEvents: sort.startsWith('RANDOM') ? "none" : "auto"
                  }}>
                <p>{t('pass.settings.sort.order')}</p>
                <Tooltip id="ascending" place="bottom" noArrow>
                  {t('pass.toolTip.orderAsc')}
                </Tooltip>
                <Tooltip id="descending" place="bottom" noArrow>
                  {t('pass.toolTip.orderDesc')}
                </Tooltip>

                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort.endsWith('ASC') ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="RECENT_ASC"
                    onClick={() => handleSortOrder("ASC")}
                    data-tooltip-id="ascending"
                  />

                  <SortDescIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        sort.endsWith('DESC') ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSortOrder("DESC")}
                    value="RECENT_DESC"
                    data-tooltip-id="descending"
                  />
                </div>
              </div>
            </div>
          </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible
            open={stateDisplayOpen}
            onOpenChange={setStateDisplayOpen}
            revealOverflow
            duration="0.6s"
          >
            <CollapsibleContent>
          <div className="state-switches state-switches-class">
            <div className="state-switches-option">
              {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                <div className="state-switches-item">
                  <span className="state-switches-label">{t('pass.settings.filter.options.deletedPasses')}</span>
                  <StateDisplay
                    currentState={deletedFilter}
                    onChange={(newState) => {
                      setDeletedFilter(newState);
                      triggerRefresh();
                    }}
                    states={['show', 'hide', 'only']}
                  />
                </div>
              )}
              {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
                <div className="state-switches-item">
                  <span className="state-switches-label">{t('pass.settings.filter.options.wrongJudgement')}</span>
                  <StateDisplay
                    currentState={wrongJudgementFilter}
                    onChange={(newState) => {
                      setWrongJudgementFilter(newState);
                      triggerRefresh();
                    }}
                    states={['all', 'only']}
                  />
                </div>
              )}
              <div className="state-switches-item">
                <span className="state-switches-label">{t('pass.settings.filter.options.keyFlags')}</span>
                <StateDisplay
                  currentState={keyFlag}
                  states={['all', '12k', '16k']}
                  onChange={(newState) => {
                    setKeyFlag(newState);
                    triggerRefresh();
                  }}
                />
              </div>
              <div className="state-switches-item">
                <span className="state-switches-label">{t('pass.settings.filter.options.adofaiVersion')}</span>
                <StateDisplay
                  currentState={adofaiVersionFilter}
                  states={['all', 'latest', 'v2']}
                  onChange={(newState) => {
                    setAdofaiVersionFilter(newState);
                    triggerRefresh();
                  }}
                />
              </div>
            </div>
          </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <span className="total-search-results">{t('pass.totalResults', { count: totalPasses })}</span>
        {renderContent()}

      </div>
    </div>
  );
};

export default PassPage; 
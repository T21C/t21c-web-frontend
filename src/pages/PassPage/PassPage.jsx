import "./passpage.css";
import { useContext, useEffect, useState, useCallback } from "react";
import { CompleteNav } from "@/components/layout";
import { MetaTags } from "@/components/common/display";
import { PassCard } from "@/components/cards";
import { StateDisplay, CustomSelect } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import Select from "react-select";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PassContext } from "@/contexts/PassContext";
import api from '@/utils/api';
import { ScrollButton } from "@/components/common/buttons";
import { useAuth } from "@/contexts/AuthContext";
import { DifficultyContext } from "@/contexts/DifficultyContext";
import { DifficultySlider } from "@/components/common/selectors";
import { PassHelpPopup } from "@/components/popups";
import { ResetIcon, SortIcon, FilterIcon } from "@/components/common/icons";
const currentUrl = window.location.origin + location.pathname;

const limit = 30;

const PassPage = () => {
  const { t } = useTranslation('pages');
  const tPass = (key, params = {}) => t(`pass.${key}`, params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { difficulties } = useContext(DifficultyContext);
  const [showHelpPopup, setShowHelpPopup] = useState(false);

  // Filter difficulties by type
  const pguDifficulties = difficulties.filter(d => d.type === 'PGU');

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
    setKeyFlag
  } = useContext(PassContext);

  const sortOptions = [
    { value: 'RECENT_DESC', label: tPass('settings.sort.options.newest') },
    { value: 'RECENT_ASC', label: tPass('settings.sort.options.oldest') },
    { value: 'SCORE_DESC', label: tPass('settings.sort.options.highestScore') },
    { value: 'SCORE_ASC', label: tPass('settings.sort.options.lowestScore') },
    { value: 'XACC_DESC', label: tPass('settings.sort.options.highestAccuracy') },
    { value: 'XACC_ASC', label: tPass('settings.sort.options.lowestAccuracy') },
    { value: 'DIFF_DESC', label: tPass('settings.sort.options.highestDifficulty') },
    { value: 'DIFF_ASC', label: tPass('settings.sort.options.lowestDifficulty') },
    { value: 'RANDOM', label: tPass('settings.sort.options.random') }
  ];

  useEffect(() => {
    let cancel;
    
    const fetchPasses = async () => {
      setLoading(true);
      try {
        
        // Handle ID-based search
        if (query.startsWith("#") && query.length > 1) {
          const passId = query.slice(1);
          if (!isNaN(passId) && passId.trim() !== '') {
            const response = await api.get(
              `${import.meta.env.VITE_PASSES}/byId/${passId}`,
              {
                cancelToken: new axios.CancelToken((c) => (cancel = c)),
              }
            );
            setPassesData(response.data.results);
            setHasMore(false);
            setLoading(false);
            return;
          }
        }

        const requestBody = {
          limit,
          offset: pageNumber * limit,
          query,
          sort,
          deletedFilter,
          keyFlag,
          minDiff: selectedLowFilterDiff !== 0 ? selectedLowFilterDiff : undefined,
          maxDiff: selectedHighFilterDiff !== 0 ? selectedHighFilterDiff : undefined
        };

        const response = await api.post(
          `${import.meta.env.VITE_PASSES}`,
          requestBody,
          {
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );

        const newPasses = response.data.results;
        
        setPassesData((prev) => {
          if (pageNumber === 0) {
            return newPasses;
          }
          return [...prev, ...newPasses];
        });
        
        setHasMore(response.data.count > (pageNumber * limit) + newPasses.length);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Fetch error:', error);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPasses();

    return () => cancel && cancel();
  }, [query, pageNumber, forceUpdate, deletedFilter, hide12k]);




  
  function resetAll() {
    setPageNumber(0);
    setSort("SCORE_DESC");
    setQuery("");
    // Reset to initial PGU range
    setSelectedLowFilterDiff("P1");
    setSelectedHighFilterDiff("U20");
    setSliderRange([1, 60]);
    // Reset 12k filter
    setHide12k(false);
    // Reset deleted filter if admin
    if (user?.isSuperAdmin) {
      setDeletedFilter("hide");
    }
    // Clear and reload data
    setPassesData([]);
    setLoading(true);
    setForceUpdate((f) => !f);
  }

  function handleQueryChange(e) {
    setPageNumber(0);
    setPassesData(null);
    setQuery(e.target.value);
    setLoading(true);
  }

  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSort(value) {
    setPassesData([]);
    setSort(value);
    setPageNumber(0);
    setLoading(true); 
    setForceUpdate(f => !f);
  }


  function handleSortOpen() {
    setSortOpen(!sortOpen);
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
    setPageNumber(0);
    setPassesData([]);
    setForceUpdate(f => !f);
  }, [pguDifficulties]);


  const renderContent = () => {
    // Initial difficulties loading
    if (difficulties.length === 0) {
      return (
        <div className="pass-body-content" style={{marginTop: "45vh"}} >
          <div className="loader loader-level-page" style={{top: "-6rem"}}></div>
          <p style={{ fontSize: "1.5rem", fontWeight: "bold", justifyContent: "center", textAlign: "center"}}>
            {tPass('loading.difficulties')}
          </p>
        </div>
      );
    }

    // Loading state (passesData is null)
    if (passesData === null) {
      return (
        <div className="pass-body-content" style={{marginTop: "45vh"}} >
          <div className="loader loader-level-page" style={{top: "-6rem"}}></div>
        </div>
      );
    }

    // Data loaded (passesData is an array)
    return (
      <InfiniteScroll
        style={{ paddingBottom: "4rem", overflow: "visible" }}
        dataLength={passesData.length}
        next={() => {
          const newPage = pageNumber + 1;
          setPageNumber(newPage);
        }}
        hasMore={hasMore && !loading}
        loader={
          <div style={{ paddingTop: "2rem" }}>
            <div className="loader loader-level-page"></div>
          </div>
        }
        endMessage={
          !loading && (
            <p style={{ textAlign: "center" , paddingTop: "2rem"}}>
              <b>{tPass('infScroll.end')}</b>
            </p>
          )
        }
      >
        {passesData.map((pass, index) => (
          <PassCard
            key={pass.passId || index}
            pass={pass}
          />
        ))}
        {loading && passesData.length > 0 && (
          <div style={{ paddingTop: "2rem" }}>
            <div className="loader loader-level-page"></div>
          </div>
        )}
      </InfiniteScroll>
    );
  };

  if (difficulties.length === 0) {
    return (
      <div className="pass-page">
        <MetaTags
          title={tPass('meta.title')}
          description={tPass('meta.description')}
          url={currentUrl}
          image="/passes-preview.jpg"
          type="article"
        />
        <CompleteNav />
  
        <div className="background-level"></div>
        <div className="pass-body">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="pass-page">
      <MetaTags
        title={tPass('meta.title')}
        description={tPass('meta.description')}
        url={currentUrl}
        image="/passes-preview.jpg"
        type="article"
      />
      <CompleteNav />
      
      <div className="background-level"></div>

      <div className="pass-body">
        <ScrollButton />
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
            {tPass('buttons.searchHelp')}
          </button>

          <input
            value={query}
            type="text"
            placeholder={tPass('input.placeholder')}
            onChange={handleQueryChange}
          />

          <Tooltip id="search" place="bottom" noArrow>
            {tPass('toolTip.search')}
          </Tooltip>
          <Tooltip id="filter" place="bottom" noArrow>
            {tPass('toolTip.filter')}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {tPass('toolTip.sort')}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {tPass('toolTip.reset')}
          </Tooltip>

          <FilterIcon
            color="#ffffff"
            onClick={() => handleFilterOpen()}
            data-tooltip-id="filter"
            style={{
              backgroundColor: filterOpen ? "rgba(255, 255, 255, 0.7)" : "",
              padding: ".2rem",
            }}
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
            strokeWidth="1.5"
            stroke="currentColor"
            onClick={() => resetAll()}
            data-tooltip-id="reset"
          />
        </div>

        <div className="input-setting">
          <div
            className={`filter settings-class ${filterOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">{tPass('settings.filter.title')}</h2>
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

              <div className="checkbox-filters">
                {user?.isSuperAdmin && (
                  <StateDisplay
                    currentState={deletedFilter}
                    onChange={(newState) => {
                      setDeletedFilter(newState);
                      setPageNumber(0);
                      setPassesData([]);
                      setForceUpdate(prev => !prev);
                    }}
                    label={tPass('settings.filter.options.deletedPasses')}
                    width={60}
                    height={24}
                    padding={3}
                    showLabel={true}
                  />
                )}
                <StateDisplay
                  currentState={keyFlag}
                  states={['all', '12k', '16k']}
                  onChange={(newState) => {
                    setKeyFlag(newState);
                    setPageNumber(0);
                    setPassesData([]);
                    setForceUpdate(prev => !prev);
                  }}
                  label={tPass('settings.filter.options.keyFlags')}
                  width={60}
                  height={24}
                  padding={3}
                  showLabel={true}
                />
              </div>
            </div>
          </div>

          <div
            className={`sort settings-class ${sortOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">{tPass('settings.sort.title')}</h2>

            <div className="sort-option">
              <div className="recent">
                <CustomSelect
                  value={sortOptions.find(option => option.value === sort)}
                  onChange={(option) => handleSort(option.value)}
                  options={sortOptions}
                  label={tPass('settings.sort.label')}
                />
              </div>
            </div>
          </div>
        </div>

        {renderContent()}

        {showHelpPopup && (
          <PassHelpPopup onClose={() => setShowHelpPopup(false)} />
        )}
      </div>
    </div>
  );
};

export default PassPage; 
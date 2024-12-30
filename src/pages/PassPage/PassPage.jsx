import "./passpage.css";
import { useContext, useEffect, useState, useCallback } from "react";
import { CompleteNav, MetaTags, PassCard, StateDisplay, CustomSelect } from "../../components";
import { Tooltip } from "react-tooltip";
import Select from "react-select";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PassContext } from "../../contexts/PassContext";
import api from '@/utils/api';
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import { useAuth } from "../../contexts/AuthContext";
import { RatingInput } from '@/components/RatingComponents/RatingInput';
import { DifficultyContext } from "../../contexts/DifficultyContext";
import DifficultySlider from '@/components/DifficultySlider/DifficultySlider';
const currentUrl = window.location.origin + location.pathname;

const limit = 30;

const PassPage = () => {
  const { t } = useTranslation('pages');
  const tPass = (key, params = {}) => t(`pass.${key}`, params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
  const { difficulties } = useContext(DifficultyContext);

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
    setSliderRange
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
          hide12k,
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
    if (isSuperAdmin) {
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
          <input
            value={query}
            type="text"
            placeholder={tPass('input.placeholder')}
            onChange={handleQueryChange}
          />

          <Tooltip id="filter" place="bottom" noArrow>
            {tPass('toolTip.filter')}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {tPass('toolTip.sort')}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {tPass('toolTip.reset')}
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
                <label>
                  <input
                    type="checkbox"
                    checked={hide12k}
                    onChange={() => {
                      setHide12k(!hide12k);
                      setPageNumber(0);
                      setPassesData([]);
                    }}
                  />
                  {tPass('settings.filter.options.only12k')}
                </label>
                {isSuperAdmin && (
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
      </div>
    </div>
  );
};

export default PassPage; 
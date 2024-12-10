import "./passpage.css";
import { useContext, useEffect, useState } from "react";
import { CompleteNav, PassCard } from "../../components";
import { Tooltip } from "react-tooltip";
import Select from "react-select";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PassContext } from "../../context/PassContext";
import api from '../../utils/api';
import ScrollButton from "../../components/ScrollButton/ScrollButton";
import { useAuth } from "../../context/AuthContext";
import { RatingInput } from '@/components/RatingComponents/RatingInput';

const limit = 30;

const PassPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const location = useLocation();
  const { isSuperAdmin } = useAuth();

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
    setHide12k
  } = useContext(PassContext);

  const [deletedFilter, setDeletedFilter] = useState('hide');
  const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState('');
  const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState('');

  const sortOptions = [
    { value: 'SCORE_DESC', label: "Highest Score" },
    { value: 'SCORE_ASC', label: "Lowest Score" },
    { value: 'XACC_DESC', label: "Best Accuracy" },
    { value: 'XACC_ASC', label: "Worst Accuracy" },
    { value: 'RECENT_DESC', label: "Newest" },
    { value: 'RECENT_ASC', label: "Oldest" },
    { value: 'RANDOM', label: "Random" }
  ];

  useEffect(() => {
    let cancel;

    const fetchPasses = async () => {
      setLoading(true);
      try {
        const params = {
          limit: limit,
          query,
          sort,
          offset: pageNumber * limit,
          deletedFilter,
          lowDiff: selectedLowFilterDiff,
          highDiff: selectedHighFilterDiff,
          only12k: hide12k
        };

        if (query.startsWith("#") && query.length > 1) {
          const passId = query.slice(1);
          if (!isNaN(passId) && passId.trim() !== '') {
            const response = await api.get(
              `${import.meta.env.VITE_PASS_BY_ID_URL}/${passId}`,
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

        const response = await api.get(
          `${import.meta.env.VITE_ALL_PASSES_URL}`,
          {
            params: params,
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );

        const newPasses = response.data.results;
        
        setPassesData(prev => {
          if (pageNumber === 0) {
            return newPasses;
          }
          return [...prev, ...newPasses];
        });
        
        setHasMore(newPasses.length === limit);

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
  }, [query, sort, pageNumber, forceUpdate, deletedFilter, selectedLowFilterDiff, selectedHighFilterDiff, hide12k]);

  function resetAll() {
    setPageNumber(0);
    setSort("SCORE_DESC");
    setQuery("");
    setPassesData([]);
    setHide12k(false);
    setLoading(true);
    setForceUpdate((f) => !f);
  }

  function handleQueryChange(e) {
    // Reset pagination state
    setPageNumber(0);
    setPassesData([]);
    setHasMore(true);
    
    // Update query
    setQuery(e.target.value);
    
    // Optional: Reset loading state
    setLoading(true);
    
    // Optional
  }

  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSort(value) {
    // Reset pagination state
    setPageNumber(0);
    setPassesData([]);
    setHasMore(true);
    
    // Update sort
    setSort(value);
  }

  const handleLowFilter = (value) => {
    setSelectedLowFilterDiff(value);
    setPageNumber(0);
    setPassesData([]);
    setForceUpdate(prev => !prev);
  };

  const handleHighFilter = (value) => {
    setSelectedHighFilterDiff(value);
    setPageNumber(0);
    setPassesData([]);
    setForceUpdate(prev => !prev);
  };

  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  return (
    <div className="pass-page">
      <CompleteNav />

      <div className="background-pass"></div>

      <div className="pass-body">
        <ScrollButton />
        <div className="input-option">
          <input
            value={query}
            type="text"
            placeholder={t("passPage.inputPlaceholder")}
            onChange={handleQueryChange}
          />

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
        </div>

        <div className="input-setting">
          <div
            className="filter settings-class"
            style={{
              height: filterOpen ? "10rem" : "0",
              opacity: filterOpen ? "1" : "0",
              overflow: filterOpen ? "visible" : "hidden",
            }}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">Filter</h2>
            <div className="diff-filters">
              <div className="filter-container">
                <p className="setting-description">Lower diff</p>
                <RatingInput
                  value={selectedLowFilterDiff || ''}
                  onChange={handleLowFilter}
                  showDiff={true}
                />
              </div>

              <div className="filter-container">
                <p className="setting-description">Upper diff</p>
                <RatingInput
                  value={selectedHighFilterDiff || ''}
                  onChange={handleHighFilter}
                  showDiff={true}
                />
              </div>
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
                Only 12K
              </label>
              {isSuperAdmin && (
                <div className="deletion-filter-inline">
                  <label>
                    Deleted passes:
                    <select 
                      value={deletedFilter}
                      onChange={(e) => {
                        setDeletedFilter(e.target.value);
                        setPageNumber(0);
                        setPassesData([]);
                      }}
                    >
                      <option value="hide">Hide</option>
                      <option value="show">Show</option>
                      <option value="only">Only</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div
            className="sort settings-class"
            style={{
              height: sortOpen ? "10rem" : "0",
              opacity: sortOpen ? "1" : "0",
              overflow: sortOpen ? "visible" : "hidden",
            }}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">Sort</h2>

            <div className="sort-option">
              <div className="recent">
                <p>Sort by</p>
                <Select
                  value={sortOptions.find(option => option.value === sort)}
                  onChange={(option) => handleSort(option.value)}
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
                      width: "12rem",
                      backgroundColor: "rgba(255, 255, 255, 0.3)",
                      border: "none",
                      outline: "none",
                      color: "#fff",
                      boxShadow: state.isFocused && "0 0 0 2px #757575"
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
                      backgroundColor: "#000000fa",
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

        <InfiniteScroll
          style={{ paddingBottom: "15rem" }}
          dataLength={passesData.length}
          next={() => {
            setPageNumber(prev => prev + 1);
          }}
          hasMore={hasMore}
          loader={<div className="loader loader-level-page"></div>}
          endMessage={
            <p style={{ textAlign: "center" , paddingTop: "2rem"}}>
              <b>End of list</b>
            </p>
          }
        >
          {passesData.map((pass, index) => (
            <PassCard
              key={pass.passId || index}
              pass={pass}
            />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default PassPage; 
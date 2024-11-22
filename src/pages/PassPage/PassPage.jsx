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

const limit = 30;

const PassPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const location = useLocation();
  
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
    hideNHT,
    setHideNHT,
    hide12k,
    setHide12k
  } = useContext(PassContext);

  const [displayedPasses, setDisplayedPasses] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    let cancel;

    const fetchPasses = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_ALL_PASSES_URL}`
        );

        const newPasses = response.data.results;
        
        const existingIds = new Set(passesData.map((pass) => pass.id));
        const uniquePasses = newPasses.filter(
          (pass) => !existingIds.has(pass.id)
        );

        setPassesData((prev) => [...prev, ...uniquePasses]);
        setHasMore(response.data.count > passesData.length + uniquePasses.length);
      } catch (error) {
        if (!axios.isCancel(error)) setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPasses();
    return () => cancel && cancel();
  }, [pageNumber]);

  useEffect(() => {
    const filtered = getFilteredPasses();
    const sorted = getSortedPasses(filtered);
    setDisplayedPasses(sorted.slice(0, currentPage * itemsPerPage));
    setHasMore(sorted.length > currentPage * itemsPerPage);
  }, [passesData, query, hideNHT, hide12k, sort, currentPage]);

  const loadMore = () => {
    const filtered = getFilteredPasses();
    const sorted = getSortedPasses(filtered);
    const nextPageItems = sorted.slice(0, (currentPage + 1) * itemsPerPage);
    
    setDisplayedPasses(nextPageItems);
    setCurrentPage(prev => prev + 1);
    setHasMore(sorted.length > (currentPage + 1) * itemsPerPage);
  };

  function resetAll() {
    setPageNumber(0);
    setCurrentPage(1);
    setSort("RECENT_DESC");
    setQuery("");
    setPassesData([]);
    setHideNHT(false);
    setHide12k(false);
    setLoading(true);
    setForceUpdate((f) => !f);
  }

  const getFilteredPasses = () => {
    return passesData.filter(pass => {
      const searchMatch = !query || 
        pass.player.toLowerCase().includes(query.toLowerCase()) ||
        pass.song.toLowerCase().includes(query.toLowerCase()) ||
        pass.artist.toLowerCase().includes(query.toLowerCase());

      const nhtMatch = !hideNHT || !pass.isNoHold;

      const twelveKMatch = !hide12k || !pass.is12K;

      return searchMatch && nhtMatch && twelveKMatch;
    });
  };

  const getSortedPasses = (filteredPasses) => {
    const passes = [...filteredPasses];
    
    switch (sort) {
      case 'RECENT_DESC':
        return passes.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'RECENT_ASC':
        return passes.sort((a, b) => new Date(a.date) - new Date(b.date));
      case 'SCORE_DESC':
        return passes.sort((a, b) => b.score - a.score);
      case 'SCORE_ASC':
        return passes.sort((a, b) => a.score - b.score);
      case 'ACC_DESC':
        return passes.sort((a, b) => b.Xacc - a.Xacc);
      case 'ACC_ASC':
        return passes.sort((a, b) => a.Xacc - b.Xacc);
      default:
        return passes;
    }
  };

  function handleQueryChange(e) {
    setQuery(e.target.value);
  }

  function handleFilterOpen() {
    setFilterOpen(!filterOpen);
  }

  function handleSortOpen() {
    setSortOpen(!sortOpen);
  }

  function handleSort(value) {
    setSort(value);
  }

  return (
    <div className="pass-page">
      <CompleteNav />

      <div className="background-pass"></div>

      <div className="pass-body">
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
        </div>

        <div className="input-setting">
          <div
            className="filter settings-class"
            style={{
              height: filterOpen ? "10rem" : "0",
              opacity: filterOpen ? "1" : "0",
            }}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">
              {t("passPage.settingExp.headerFilter")}
            </h2>
            <div className="checkbox-filters">
              <label>
                <input
                  type="checkbox"
                  checked={hideNHT}
                  onChange={() => setHideNHT(!hideNHT)}
                />
                Hide NHT
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={hide12k}
                  onChange={() => setHide12k(!hide12k)}
                />
                Hide 12K
              </label>
            </div>
          </div>
        </div>

        <InfiniteScroll
          style={{ paddingBottom: "15rem" }}
          dataLength={displayedPasses.length}
          next={loadMore}
          hasMore={hasMore}
          loader={<div className="loader loader-pass-page"></div>}
          endMessage={
            <p style={{ textAlign: "center" }}>
              <b>{t("passPage.infScroll.end")}</b>
            </p>
          }
        >
          {displayedPasses.map((pass, index) => (
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
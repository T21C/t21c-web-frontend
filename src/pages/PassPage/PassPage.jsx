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
          hideNHT,
          hide12k
        };

        const response = await axios.get(
          `${import.meta.env.VITE_ALL_PASSES_URL}`,
          {
            params: params,
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );

        const newPasses = response.data.results;
        
        const existingIds = new Set(passesData.map((pass) => pass.id));
        const uniquePasses = newPasses.filter(
          (pass) => !existingIds.has(pass.id)
        );

        setPassesData((prev) => [...prev, ...uniquePasses]);
        setHasMore(response.data.count > passesData.length + newPasses.length);
      } catch (error) {
        if (!axios.isCancel(error)) setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPasses();
    return () => cancel && cancel();
  }, [query, sort, pageNumber, forceUpdate, hideNHT, hide12k]);

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setPageNumber(0);
    setPassesData([]);
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
    setPassesData([]);
    setLoading(true);
    setForceUpdate((f) => !f);
  }

  function resetAll() {
    setPageNumber(0);
    setSort("RECENT_DESC");
    setQuery("");
    setPassesData([]);
    setHideNHT(false);
    setHide12k(false);
    setLoading(true);
    setForceUpdate((f) => !f);
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
          dataLength={passesData.length}
          next={() => setPageNumber((prevPageNumber) => prevPageNumber + 1)}
          hasMore={hasMore}
          loader={<div className="loader loader-pass-page"></div>}
          endMessage={
            <p style={{ textAlign: "center" }}>
              <b>{t("passPage.infScroll.end")}</b>
            </p>
          }
        >
          {passesData.map((pass, index) => (
            <PassCard
              key={index}
              pass={pass}
            />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default PassPage; 
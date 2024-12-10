/* eslint-disable no-unused-vars */
import "./levelpage.css";
import { useContext, useEffect, useState } from "react";
import { CompleteNav, LevelCard } from "@/components";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import api from '@/utils/api';
import { LevelContext } from "@/context/LevelContext";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ScrollButton from "@/components/ScrollButton/ScrollButton";
import { useAuth } from "@/context/AuthContext";
import { RatingInput } from '@/components/RatingComponents/RatingInput';
import { pguDataRaw, calculatePguDiffNum } from "@/Repository/RemoteRepository";


const options = [
  { value: "1", label: "P1" },
  { value: "3", label: "P2" },
  { value: "4", label: "P3" },
  { value: "5", label: "P4" },
  { value: "6", label: "P5" },
  { value: "7", label: "P6" },
  { value: "8", label: "P7" },
  { value: "9", label: "P8" },
  { value: "10", label: "P9" },
  { value: "11", label: "P10" },
  { value: "12", label: "P11" },
  { value: "13", label: "P12" },
  { value: "14", label: "P13" },
  { value: "15", label: "P14" },
  { value: "16", label: "P15" },
  { value: "17", label: "P16" },
  { value: "18", label: "P17" },
  { value: "18.5", label: "P18" },
  { value: "19", label: "P19" },
  { value: "19.5", label: "P20" },
  { value: "20", label: "G1" },
  { value: "20.05", label: "G2" },
  { value: "20.1", label: "G3" },
  { value: "20.15", label: "G4" },
  { value: "20.2", label: "G5" },
  { value: "20.25", label: "G6" },
  { value: "20.3", label: "G7" },
  { value: "20.35", label: "G8" },
  { value: "20.4", label: "G9" },
  { value: "20.45", label: "G10" },
  { value: "20.5", label: "G11" },
  { value: "20.55", label: "G12" },
  { value: "20.6", label: "G13" },
  { value: "20.65", label: "G14" },
  { value: "20.7", label: "G15" },
  { value: "20.75", label: "G16" },
  { value: "20.8", label: "G17" },
  { value: "20.85", label: "G18" },
  { value: "20.9", label: "G19" },
  { value: "20.95", label: "G20" },
  { value: "21", label: "U1" },
  { value: "21.04", label: "U2" },
  { value: "21.05", label: "U3" },
  { value: "21.09", label: "U4" },
  { value: "21.1", label: "U5" },
  { value: "21.14", label: "U6" },
  { value: "21.15", label: "U7" },
  { value: "21.19", label: "U8" },
  { value: "21.2", label: "U9" },
  { value: "21.24", label: "U10" },
  { value: "21.25", label: "U11" },
  { value: "21.29", label: "U12" },
  { value: "21.3", label: "U13" },
  { value: "21.34", label: "U14" },
  { value: "21.35", label: "U15" },
  { value: "21.39", label: "U16" },
  { value: "21.4", label: "U17" },
  { value: "21.44", label: "U18" },
  { value: "21.45", label: "U19" },
  { value: "21.49", label: "U20" },
];

const limit = 30;

const LevelPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const location = useLocation();
  const { isSuperAdmin } = useAuth();
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
    hideUnranked,          // Add this
    setHideUnranked,       // Add this
    hideCensored,          // Add this
    setHideCensored,       // Add this
    hideEpic,              // Add this
    setHideEpic            // Add this
  } = useContext(LevelContext);

  useEffect(() => {
    let cancel;
    
    const fetchLevels = async () => {
      setLoading(true);
      try {
        // Construct the params object conditionally
        const params = {
          limit: limit,
          query, 
          sort, 
          offset: pageNumber * limit,
          deletedFilter,
          hideUnranked,
          hideCensored,
          hideEpic
        };
        // Pass difficulty filters as raw strings if they exist
        
        const lowDiff = calculatePguDiffNum(selectedLowFilterDiff?.toUpperCase());
        const highDiff = calculatePguDiffNum(selectedHighFilterDiff?.toUpperCase());

        if (lowDiff !== 0 && highDiff !== 0 && lowDiff > highDiff) {
          // Swap if min > max
          params.minDiff = highDiff;
          params.maxDiff = lowDiff;
        } else {
          // Normal case
          if (lowDiff !== 0) {
            params.minDiff = lowDiff;
          }
          if (highDiff !== 0) {
            params.maxDiff = highDiff;
          }
        }
        
        const response = await api.get(
          `${import.meta.env.VITE_ALL_LEVEL_URL}`,
          {
            params: params,
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );

        // Remove the Promise.all and additional requests
        const newLevels = response.data.results;
        
        const existingIds = new Set(levelsData.map((level) => level.id));
        const uniqueLevels = newLevels.filter(
          (level) => !existingIds.has(level.id)
        );

        setLevelsData((prev) => [...prev, ...uniqueLevels]);
        setHasMore(response.data.count > levelsData.length + newLevels.length);
      } catch (error) {
        if (!axios.isCancel(error)) setError(true);
      } finally {
        setLoading(false);
      }
    };

    const fetchLevelById = async () => {
      setLoading(true);
      try {
        const response = await api.get(
          `${import.meta.env.VITE_INDIVIDUAL_LEVEL}${query.slice(1)}`,
          {
            cancelToken: new axios.CancelToken((c) => (cancel = c)),
          }
        );

        // Remove the additional clears request
        const fullData = {
          id: response.data.id,
          team: response.data.team,
          diff: response.data.diff,
          newDiff: response.data.newDiff,
          pdnDiff: response.data.pdnDiff,
          pguDiff: response.data.pguDiff,
          creator: response.data.creator,
          song: response.data.song,
          artist: response.data.artist,
          dlLink: response.data.dlLink,
          wsLink: response.data.workshopLink,
          // The clears count should now come from the server response
          clears: response.data.clears || 0,
        };

        setLevelsData([fullData]);
        setHasMore(false);
      } catch (error) {
        if (!axios.isCancel(error)) setError(true);
      } finally {
        setLoading(false);
      }
    };

    if (query[0] == "#") {
      fetchLevelById();
    } else {
      fetchLevels();
    }
    return () => cancel && cancel();
  }, [query, sort, pageNumber, forceUpdate, selectedLowFilterDiff, selectedHighFilterDiff, deletedFilter]);

  function toggleLegacyDiff() {
    setLegacyDiff(!legacyDiff);
  }

  function handleQueryChange(e) {
    setQuery(e.target.value);
    setPageNumber(0);
    setLevelsData([]);
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
    setSelectedLowFilterDiff(null);
    setSelectedHighFilterDiff(null);
    setLevelsData([]);
    setLoading(true);
    setForceUpdate((f) => !f);
  }

  function handleLowFilter(value){
    setPageNumber(0);
    setLevelsData([]);
    setSelectedLowFilterDiff(value)
    setForceUpdate((f) => !f);
  }

  function handleHighFilter(value){
    setPageNumber(0);
    setLevelsData([]);
    setSelectedHighFilterDiff(value)
    setForceUpdate((f) => !f);
  }

  return (
    <div className="level-page">
      <CompleteNav />

      <div className="background-level"></div>

      <div className="level-body">
        <ScrollButton />
        <div className="input-option">
          <svg
            className="svg-fill"
            data-tooltip-id="legacy"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              backgroundColor: legacyDiff ? "rgba(255, 255, 255, 0.7)" : "",
              width: "3rem",
              paddingLeft: ".1rem",
              paddingRight: ".3rem",
            }}
            onClick={() => toggleLegacyDiff()}
          >
            <polygon points="11 19 2 12 11 5 11 19"></polygon>
            <polygon points="22 19 13 12 22 5 22 19"></polygon>
          </svg>

          <input
            value={query}
            type="text"
            placeholder={t("levelPage.inputPlaceholder")}
            onChange={handleQueryChange}
          />

          <Tooltip id="legacy" place="bottom" noArrow>
            {t("levelPage.toolTip.legacy")}
          </Tooltip>
          <Tooltip id="filter" place="bottom" noArrow>
            {t("levelPage.toolTip.filter")}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {t("levelPage.toolTip.sort")}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {t("levelPage.toolTip.reset")}
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
              stroke="currentCcolor"
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
              overflow: filterOpen ? "visible" : "hidden",
            }}
          >
            <div className="spacer-setting"></div>
            <h2 className="setting-title">
              {t("levelPage.settingExp.headerFilter")}
            </h2>
            {/* <p className="setting-description">{t('levelPage.settingExp.filterDiffs')}</p> */}
            <div className="diff-filters">
              <div className="filter-container">
                <p className="setting-description">Lower diff</p>
                <RatingInput
                  value={selectedLowFilterDiff || ''}
                  onChange={handleLowFilter}
                  showDiff={true}
                  /*pguOnly={true}*/
                />
              </div>

              <div className="filter-container">
                <p className="setting-description">Upper diff</p>
                <RatingInput
                  value={selectedHighFilterDiff || ''}
                  onChange={handleHighFilter}
                  showDiff={true}
                  /*pguOnly={true}*/
                />
              </div>
              <div className="checkbox-filters">
                {isSuperAdmin && (
                  <div className="deletion-filter-inline">
                    <label>
                      Show deleted levels
                      <select 
                        value={deletedFilter}
                        onChange={(e) => {
                          setDeletedFilter(e.target.value);
                          setPageNumber(0);
                          setLevelsData([]);
                          setForceUpdate(prev => !prev);
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
            <h2 className="setting-title">
              {t("levelPage.settingExp.headerSort")}
            </h2>

            <div className="sort-option">
              <div className="recent">
                <p>{t("levelPage.settingExp.sortRecent")}</p>
                <Tooltip id="ra" place="top" noArrow>
                  {t("levelPage.toolTip.recentAsc")}
                </Tooltip>
                <Tooltip id="rd" place="top" noArrow>
                  {t("levelPage.toolTip.recentDesc")}
                </Tooltip>

                <div className="wrapper">
                  <svg
                    className="svg-fill"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      backgroundColor:
                        sort == "RECENT_ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="RECENT_ASC"
                    onClick={() => handleSort("RECENT_ASC")}
                    data-tooltip-id="ra"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      {/* arrow */}
                      <path
                        d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
                        fill="#ffffff"
                      ></path>
                      {/* AZ */}
                      <path
                        d="M14 11.21C14.39 11.35 14.82 11.15 14.96 10.76L15.24 9.98001H17.27L17.55 10.76C17.66 11.07 17.95 11.26 18.26 11.26C18.34 11.26 18.43 11.25 18.51 11.22C18.9 11.08 19.1 10.65 18.96 10.26L17.25 5.47001C17.08 5.04001 16.69 4.76001 16.25 4.76001C15.81 4.76001 15.42 5.04001 15.25 5.49001L13.55 10.26C13.41 10.65 13.61 11.08 14 11.22V11.21ZM16.73 8.48001H15.77L16.25 7.14001L16.73 8.48001Z"
                        fill="#ffffff"
                      ></path>
                      <path
                        d="M18.67 13.46C18.48 13.02 18.08 12.75 17.62 12.75H14.51C14.1 12.75 13.76 13.09 13.76 13.5C13.76 13.91 14.1 14.25 14.51 14.25H16.9L14.07 17.2C13.73 17.56 13.64 18.08 13.83 18.54C14.02 18.98 14.42 19.25 14.88 19.25H18.01C18.42 19.25 18.76 18.91 18.76 18.5C18.76 18.09 18.42 17.75 18.01 17.75H15.62L18.44 14.82C18.78 14.46 18.88 13.93 18.68 13.47L18.67 13.46Z"
                        fill="#ffffff"
                      ></path>
                    </g>
                  </svg>

                  <svg
                    className="svg-fill"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      backgroundColor:
                        sort == "RECENT_DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("RECENT_DESC")}
                    value="RECENT_DESC"
                    data-tooltip-id="rd"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      {/* arrow */}
                      <path
                        d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
                        fill="#ffffff"
                      ></path>
                      {/* ZA */}
                      <path
                        d="M13.83 10.54C14.02 10.98 14.42 11.25 14.88 11.25H18.01C18.42 11.25 18.76 10.91 18.76 10.5C18.76 10.09 18.42 9.75001 18.01 9.75001H15.62L18.44 6.82001C18.78 6.46001 18.88 5.93001 18.68 5.47001C18.49 5.03001 18.09 4.76001 17.63 4.76001H14.52C14.11 4.76001 13.77 5.10001 13.77 5.51001C13.77 5.92001 14.11 6.26001 14.52 6.26001H16.91L14.08 9.21001C13.74 9.57001 13.65 10.09 13.84 10.55L13.83 10.54Z"
                        fill="#ffffff"
                      ></path>
                      <path
                        d="M18.96 18.25L17.25 13.46C17.08 13.03 16.69 12.75 16.25 12.75C15.81 12.75 15.42 13.03 15.25 13.48L13.55 18.25C13.41 18.64 13.61 19.07 14 19.21C14.39 19.35 14.82 19.15 14.96 18.76L15.24 17.98H17.27L17.55 18.76C17.66 19.07 17.95 19.26 18.26 19.26C18.34 19.26 18.43 19.25 18.51 19.22C18.9 19.08 19.1 18.65 18.96 18.26V18.25ZM15.77 16.48L16.25 15.14L16.73 16.48H15.77Z"
                        fill="#ffffff"
                      ></path>
                    </g>
                  </svg>
                </div>
              </div>

              <div className="diff">
                <p>{t("levelPage.settingExp.filterDiffs")}</p>

                <div className="wrapper">
                  <Tooltip id="da" place="top" noArrow>
                    {t("levelPage.toolTip.difficultyAsc")}
                  </Tooltip>
                  <Tooltip id="dd" place="top" noArrow>
                    {t("levelPage.toolTip.difficultyDesc")}
                  </Tooltip>

                  <svg
                    className="svg-fill"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      backgroundColor:
                        sort == "DIFF_ASC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    value="DIFF_ASC"
                    onClick={() => handleSort("DIFF_ASC")}
                    data-tooltip-id="da"
                    x
                  >
                    {/* arrow */}
                    <path
                      d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
                      fill="#ffffff"
                    ></path>{" "}
                    {/* 0 -> U */}
                    <path
                      d="M17 11.25C16.59 11.25 16.25 10.91 16.25 10.5V6.43997L15.86 6.64997C15.49 6.84997 15.04 6.71997 14.84 6.35997C14.64 5.99997 14.77 5.53997 15.13 5.33997L15.78 4.97997C16.14 4.71997 16.6 4.67997 17 4.85997C17.45 5.06997 17.74 5.52997 17.74 6.04997V10.5C17.74 10.91 17.4 11.25 16.99 11.25H17Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M16.5 17.25C15.26 17.25 14.25 16.24 14.25 15C14.25 13.76 15.26 12.75 16.5 12.75C17.74 12.75 18.75 13.76 18.75 15C18.75 16.24 17.74 17.25 16.5 17.25ZM16.5 14.25C16.09 14.25 15.75 14.59 15.75 15C15.75 15.41 16.09 15.75 16.5 15.75C16.91 15.75 17.25 15.41 17.25 15C17.25 14.59 16.91 14.25 16.5 14.25Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M15.98 19.25H15.5C15.09 19.25 14.75 18.91 14.75 18.5C14.75 18.09 15.09 17.75 15.5 17.75H15.98C16.63 17.75 17.2 17.21 17.23 16.56C17.24 16.27 17.24 15.92 17.24 15.5V15C17.24 14.59 17.58 14.25 17.99 14.25C18.4 14.25 18.74 14.59 18.74 15V15.5C18.74 15.95 18.74 16.32 18.72 16.64C18.65 18.08 17.41 19.25 15.97 19.25H15.98Z"
                      fill="#ffffff"
                    />
                  </svg>

                  <svg
                    className="svg-fill"
                    width="800px"
                    height="800px"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                      backgroundColor:
                        sort == "DIFF_DESC" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("DIFF_DESC")}
                    value="DIFF_DESC"
                    data-tooltip-id="dd"
                  >
                    {/* arrow */}
                    <path
                      d="M10.22 15.97L9 17.19V5C9 4.59 8.66 4.25 8.25 4.25C7.84 4.25 7.5 4.59 7.5 5V17.19L6.28 15.97C5.99 15.68 5.51 15.68 5.22 15.97C4.93 16.26 4.93 16.74 5.22 17.03L7.72 19.53C7.79 19.6 7.87 19.65 7.96 19.69C8.05 19.73 8.15 19.75 8.25 19.75C8.35 19.75 8.45 19.73 8.54 19.69C8.63 19.65 8.71 19.6 8.78 19.53L11.28 17.03C11.57 16.74 11.57 16.26 11.28 15.97C10.99 15.68 10.51 15.68 10.22 15.97Z"
                      fill="#ffffff"
                    ></path>{" "}
                    {/* U -> 0 */}
                    <path
                      d="M17.12 19.2499C16.9228 19.2473 16.7346 19.1671 16.5961 19.0268C16.4576 18.8864 16.38 18.6971 16.38 18.4999V14.4399L15.99 14.6599C15.815 14.7567 15.6086 14.78 15.4164 14.7247C15.2242 14.6694 15.0618 14.54 14.965 14.3649C14.8682 14.1899 14.8449 13.9836 14.9002 13.7913C14.9555 13.5991 15.085 13.4367 15.26 13.3399L15.92 12.9799C16.0943 12.8527 16.2999 12.7753 16.5148 12.7559C16.7297 12.7365 16.9458 12.7759 17.14 12.8699C17.3633 12.9752 17.5518 13.1423 17.683 13.3515C17.8141 13.5606 17.8825 13.8031 17.88 14.0499V18.4999C17.8774 18.6998 17.7962 18.8905 17.6539 19.0309C17.5117 19.1713 17.3199 19.25 17.12 19.2499Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M16.62 9.24998C16.1754 9.248 15.7414 9.11437 15.3727 8.86593C15.004 8.6175 14.7172 8.26541 14.5484 7.85411C14.3797 7.44281 14.3365 6.99072 14.4245 6.55493C14.5124 6.11913 14.7275 5.71916 15.0425 5.40549C15.3576 5.09182 15.7585 4.87852 16.1947 4.79251C16.6309 4.7065 17.0828 4.75164 17.4933 4.92222C17.9039 5.09281 18.2547 5.3812 18.5015 5.75099C18.7483 6.12078 18.88 6.5554 18.88 6.99998C18.8813 7.29667 18.8237 7.59067 18.7105 7.86491C18.5973 8.13915 18.4307 8.38817 18.2204 8.5975C18.0102 8.80683 17.7604 8.9723 17.4857 9.08431C17.2109 9.19632 16.9167 9.25263 16.62 9.24998ZM16.62 6.24998C16.4211 6.24998 16.2303 6.329 16.0897 6.46965C15.949 6.6103 15.87 6.80107 15.87 6.99998C15.87 7.19889 15.949 7.38966 16.0897 7.53031C16.2303 7.67096 16.4211 7.74998 16.62 7.74998C16.8189 7.74998 17.0097 7.67096 17.1503 7.53031C17.291 7.38966 17.37 7.19889 17.37 6.99998C17.37 6.80107 17.291 6.6103 17.1503 6.46965C17.0097 6.329 16.8189 6.24998 16.62 6.24998Z"
                      fill="#ffffff"
                    />
                    <path
                      d="M16.11 11.25H15.62C15.4211 11.25 15.2303 11.171 15.0897 11.0303C14.949 10.8897 14.87 10.6989 14.87 10.5C14.87 10.3011 14.949 10.1103 15.0897 9.96967C15.2303 9.82902 15.4211 9.75 15.62 9.75H16.11C16.4293 9.7433 16.7345 9.61752 16.9657 9.39735C17.197 9.17719 17.3376 8.87853 17.36 8.56C17.36 8.27 17.36 7.92 17.36 7.5V7C17.36 6.80281 17.4376 6.61354 17.5761 6.47317C17.7146 6.33281 17.9028 6.25263 18.1 6.25C18.2999 6.24998 18.4917 6.32868 18.6339 6.46905C18.7761 6.60942 18.8574 6.80017 18.86 7V7.5C18.86 7.95 18.86 8.32 18.86 8.64C18.817 9.34229 18.5093 10.0022 17.999 10.4865C17.4886 10.9709 16.8136 11.2437 16.11 11.25Z"
                      fill="#ffffff"
                    />
                  </svg>
                </div>
              </div>

              <div className="random">
                <p>{t("levelPage.settingExp.sortRandom")}</p>
                <Tooltip id="rnd" place="top" noArrow>
                  {t("levelPage.toolTip.random")}
                </Tooltip>

                <div className="wrapper">
                  <svg
                    className="svg-fill-stroke"
                    fill="#ffffff"
                    viewBox="-7.5 0 32 32"
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="#ffffff"
                    data-tooltip-id="rnd"
                    style={{
                      backgroundColor:
                        sort == "RANDOM" ? "rgba(255, 255, 255, 0.7)" : "",
                    }}
                    onClick={() => handleSort("RANDOM")}
                    value="RANDOM"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      <path d="M14.92 17.56c-0.32-0.32-0.88-0.32-1.2 0s-0.32 0.88 0 1.2l0.76 0.76h-3.76c-0.6 0-1.080-0.32-1.6-0.96-0.28-0.36-0.8-0.44-1.2-0.16-0.36 0.28-0.44 0.8-0.16 1.2 0.84 1.12 1.8 1.64 2.92 1.64h3.76l-0.76 0.76c-0.32 0.32-0.32 0.88 0 1.2 0.16 0.16 0.4 0.24 0.6 0.24s0.44-0.080 0.6-0.24l2.2-2.2c0.32-0.32 0.32-0.88 0-1.2l-2.16-2.24zM10.72 12.48h3.76l-0.76 0.76c-0.32 0.32-0.32 0.88 0 1.2 0.16 0.16 0.4 0.24 0.6 0.24s0.44-0.080 0.6-0.24l2.2-2.2c0.32-0.32 0.32-0.88 0-1.2l-2.2-2.2c-0.32-0.32-0.88-0.32-1.2 0s-0.32 0.88 0 1.2l0.76 0.76h-3.76c-2.48 0-3.64 2.56-4.68 4.84-0.88 2-1.76 3.84-3.12 3.84h-2.080c-0.48 0-0.84 0.36-0.84 0.84s0.36 0.88 0.84 0.88h2.080c2.48 0 3.64-2.56 4.68-4.84 0.88-2 1.72-3.88 3.12-3.88zM0.84 12.48h2.080c0.6 0 1.080 0.28 1.56 0.92 0.16 0.2 0.4 0.32 0.68 0.32 0.2 0 0.36-0.040 0.52-0.16 0.36-0.28 0.44-0.8 0.16-1.2-0.84-1.040-1.8-1.6-2.92-1.6h-2.080c-0.48 0.040-0.84 0.4-0.84 0.88s0.36 0.84 0.84 0.84z"></path>{" "}
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <InfiniteScroll
          style={{ paddingBottom: "15rem" }}
          dataLength={levelsData.length}
          next={() => setPageNumber((prevPageNumber) => prevPageNumber + 1)}
          hasMore={hasMore}
          loader={<div className="loader loader-level-page"></div>}
          endMessage={
            <p style={{ textAlign: "center" }}>
              <b>{t("levelPage.infScroll.end")}</b>
            </p>}
        >
          {levelsData.map((l, index) => (
            <LevelCard
              key={index}
              level={l}
              legacyMode={legacyDiff}
              isSuperAdmin={isSuperAdmin}
            />
          ))}
        </InfiniteScroll>
      </div>
    </div>
  );
};

export default LevelPage;

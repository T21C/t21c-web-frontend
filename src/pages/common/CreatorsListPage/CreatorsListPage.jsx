import "./creatorslistpage.css";
import "@/pages/common/search-section.css";
import "@/pages/common/sort.css";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { CreatorCard } from "@/components/cards";
import { CustomSelect } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import api from '@/utils/api';
import {
  CREATOR_LEADERBOARD_DEFAULT_SORT_BY,
  normalizeCreatorLeaderboardSortBy,
} from '@/utils/creatorLeaderboardSort';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { CreatorListContext } from "@/contexts/CreatorListContext";
import { useTranslation } from "react-i18next";
import { ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { SortDescIcon, SortAscIcon, ResetIcon, SortIcon, FilterIcon } from "@/components/common/icons";

const currentUrl = window.location.origin + location.pathname;
const limit = 30;

/** Matches server `validCreatorVerificationStatuses` for leaderboard `filters`. */
const CREATOR_VERIFICATION_STATUSES = ['declined', 'pending', 'conditional', 'allowed'];

const CreatorsListPage = () => {
  const { t } = useTranslation('pages');
  const { t: tc } = useTranslation('common');
  const [hasMore, setHasMore] = useState(true);
  const runRequest = useDebouncedRequest(500);
  const isFirstListEffectRef = useRef(true);

  const {
    creatorData,
    setCreatorData,
    displayedCreators,
    setDisplayedCreators,
    creatorListTotal,
    setCreatorListTotal,
    sortOpen,
    setSortOpen,
    filterOpen,
    setFilterOpen,
    setMaxFields,
    query,
    setQuery,
    sort,
    setSort,
    sortBy,
    setSortBy,
    verificationFilter,
    setVerificationFilter,
    forceUpdate,
    setForceUpdate,
  } = useContext(CreatorListContext);

  const sortOptions = [
    { value: 'chartsTotal', label: t('creators.sortOptions.chartsTotal') },
    { value: 'chartsCharted', label: t('creators.sortOptions.chartsCharted') },
    { value: 'chartsVfxed', label: t('creators.sortOptions.chartsVfxed') },
    { value: 'chartsTeamed', label: t('creators.sortOptions.chartsTeamed') },
    { value: 'totalChartClears', label: t('creators.sortOptions.totalChartClears') },
    { value: 'totalChartLikes', label: t('creators.sortOptions.totalChartLikes') },
    { value: 'name', label: t('creators.sortOptions.name') },
  ];

  const verificationFilterOptions = useMemo(
    () => [
      { value: '', label: t('creators.settings.verificationFilter.all') },
      ...CREATOR_VERIFICATION_STATUSES.map((s) => ({
        value: s,
        label: tc(`verification.${s}`),
      })),
    ],
    [t, tc],
  );

  const selectedVerificationOption = useMemo(
    () =>
      verificationFilterOptions.find((o) => o.value === verificationFilter) ??
      verificationFilterOptions[0],
    [verificationFilter, verificationFilterOptions],
  );

  const fetchCreators = async (offset = 0, { immediate = false } = {}) => {
    const sortByParam = normalizeCreatorLeaderboardSortBy(sortBy);
    const params = new URLSearchParams({
      query,
      sortBy: sortByParam,
      order: String(sort ?? 'DESC').toLowerCase(),
      offset: String(offset),
      limit: String(limit),
    });
    if (verificationFilter) {
      params.set(
        'filters',
        JSON.stringify({ verificationStatus: verificationFilter }),
      );
    }
    const endpoint = `${import.meta.env.VITE_CREATORS_LEADERBOARD_V3}?${params.toString()}`;
    const runner = immediate ? runRequest.flush : runRequest;
    try {
      const response = await runner(({ signal }) => api.get(endpoint, { signal }));
      const results = Array.isArray(response.data.results) ? response.data.results : [];

      if (offset === 0) {
        setCreatorData(results);
        setDisplayedCreators(results);
        if (response.data.maxFields) {
          setMaxFields(response.data.maxFields);
        }
      } else {
        setCreatorData(prev => [...(prev ?? []), ...results]);
        setDisplayedCreators(prev => [...(prev ?? []), ...results]);
      }

      const priorLen = offset === 0 ? 0 : (displayedCreators?.length ?? 0);
      const nextLength = offset === 0 ? results.length : priorLen + results.length;
      const total = response.data.count ?? response.data.total ?? nextLength;
      if (offset === 0) {
        setCreatorListTotal(total);
      }
      setHasMore(nextLength < total);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error fetching creators data:', error);
    }
  };

  // Initial / filter-driven loads are debounced; pagination uses flush so
  // infinite scroll fires immediately when the user reaches the bottom.
  // On remount with unchanged filters, keep context-backed rows (same idea as LevelPage).
  useEffect(() => {
    if (isFirstListEffectRef.current) {
      isFirstListEffectRef.current = false;
      const hasCached =
        Array.isArray(displayedCreators) &&
        displayedCreators.length > 0 &&
        creatorListTotal != null;
      if (hasCached) {
        setHasMore(displayedCreators.length < creatorListTotal);
        return;
      }
    }
    setCreatorListTotal(null);
    setCreatorData(null);
    fetchCreators(0);
  }, [forceUpdate, query, sort, sortBy, verificationFilter]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setForceUpdate(prev => !prev);
  };

  const resetAll = () => {
    runRequest.cancel();
    setSortBy(CREATOR_LEADERBOARD_DEFAULT_SORT_BY);
    setSort('DESC');
    setQuery('');
    setVerificationFilter('');
    setForceUpdate(prev => !prev);
  };

  return (
    <div className="creators-list-page">
      <MetaTags
        title={t('creators.meta.title')}
        description={t('creators.meta.description')}
        url={currentUrl}
        type="website"
      />

      <div className="creators-list-page__body page-content-70rem">
        <ScrollButton />

        <div className="search-section">
          <div className="search-row">
            <input
              value={query}
              autoComplete="off"
              type="text"
              placeholder={t('creators.input.placeholder')}
              onChange={handleQueryChange}
            />
          </div>

          <div className="buttons-row">
            <Tooltip id="creator-filter" place="bottom" noArrow>
              {t('creators.tooltips.filter')}
            </Tooltip>
            <Tooltip id="creator-sort" place="bottom" noArrow>
              {t('creators.tooltips.sort')}
            </Tooltip>
            <Tooltip id="creator-reset" place="bottom" noArrow>
              {t('creators.tooltips.reset')}
            </Tooltip>

            <FilterIcon
              color="#ffffff"
              onClick={() => setFilterOpen(!filterOpen)}
              data-tooltip-id="creator-filter"
              className={`action-button ${filterOpen || verificationFilter ? 'active' : ''}`}
            />
            <SortIcon
              data-tooltip-id="creator-sort"
              color="#ffffff"
              onClick={() => setSortOpen(!sortOpen)}
              className={`action-button ${sortOpen ? 'active' : ''}`}
            />
            <ResetIcon
              color="#ffffff"
              onClick={resetAll}
              data-tooltip-id="creator-reset"
              className="action-button"
            />
          </div>
        </div>

        <div className="input-setting">
          <div
            className={`filter settings-class ${filterOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">
              {t('creators.settings.filter.header')}
            </h2>
            <div className="filter-section">
              <div className="filter-row">
                <CustomSelect
                  value={selectedVerificationOption}
                  onChange={(option) => setVerificationFilter(option.value)}
                  options={verificationFilterOptions}
                  label={t('creators.settings.verificationFilter.label')}
                  width="12rem"
                />
              </div>
            </div>
          </div>

          <div
            className={`sort sort-class ${sortOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">
              {t('creators.settings.sort.header')}
            </h2>
            <div className="sort-option">
              <CustomSelect
                value={
                  sortOptions.find(
                    (option) => option.value === normalizeCreatorLeaderboardSortBy(sortBy),
                  ) ?? sortOptions[0]
                }
                onChange={(option) => setSortBy(option.value)}
                options={sortOptions}
                label={t('creators.settings.sort.sortBy')}
                width="11rem"
              />

              <div className="order">
                <p>{t('creators.settings.sort.sortOrder')}</p>
                <Tooltip id="creator-asc" place="top" noArrow>
                  {t('creators.tooltips.recentAsc')}
                </Tooltip>
                <Tooltip id="creator-desc" place="top" noArrow>
                  {t('creators.tooltips.recentDesc')}
                </Tooltip>
                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    data-tooltip-id="creator-asc"
                    style={{ backgroundColor: sort === "ASC" ? "rgba(255, 255, 255, 0.7)" : "" }}
                    onClick={() => setSort("ASC")}
                  />
                  <SortDescIcon
                    className="svg-fill"
                    data-tooltip-id="creator-desc"
                    style={{ backgroundColor: sort === "DESC" ? "rgba(255, 255, 255, 0.7)" : "" }}
                    onClick={() => setSort("DESC")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="creators-list-page__list" style={{ minHeight: "500px" }}>
          {creatorData === null ? (
            <div className="loader loader-level-page"></div>
          ) : (displayedCreators?.length ?? 0) > 0 ? (
            <InfiniteScroll
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              dataLength={displayedCreators.length}
              next={() => fetchCreators(displayedCreators.length, { immediate: true })}
              hasMore={hasMore}
              loader={<div className="loader loader-level-page"></div>}
              endMessage={
                <p className="end-message">
                  <b>{t('creators.infiniteScroll.end')}</b>
                </p>
              }
            >
              {displayedCreators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </InfiniteScroll>
          ) : (
            <div className="creators-list-page__empty">
              <p className="end-message">
                <b>{t('creators.list.empty')}</b>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorsListPage;

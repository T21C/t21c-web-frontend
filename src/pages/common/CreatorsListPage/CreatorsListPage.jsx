import { routes } from '@/api/routes';
// tuf-search: #CreatorsListPage #creatorsListPage #creatorsList
import "./creatorslistpage.css";
import "@/pages/common/search-section.css";
import "@/pages/common/sort.css";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { CreatorCard } from "@/components/cards";
import { CustomSelect, FacetQueryBuilder } from "@/components/common/selectors";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildFacetQueryParam, facetDomainHasFilter } from "@/utils/facetQueryCodec";
import { Tooltip } from "react-tooltip";
import { VirtualList } from "@/components/common/VirtualList";
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
import { buildStaticPageMeta } from '@/utils/meta';
import { useLocation } from 'react-router-dom';
import { SortDescIcon, SortAscIcon, ResetIcon, SortIcon, FilterIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { CreatorHelpPopup } from "@/components/popups/Creators/CreatorHelpPopup/CreatorHelpPopup";

const limit = 30;

/** Matches server `validCreatorVerificationStatuses` for leaderboard `filters`. */
const CREATOR_VERIFICATION_STATUSES = ['declined', 'pending', 'conditional', 'allowed'];

const CreatorsListPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('creators.meta.title'),
        description: t('creators.meta.description'),
        pathname: location.pathname,
        type: 'website',
      }),
    [t, location.pathname],
  );
  const { t: tc } = useTranslation('common');
  const { curationTypes } = useDifficultyContext();
  const [hasMore, setHasMore] = useState(true);
  const [showHelpPopup, setShowHelpPopup] = useState(false);
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
    creatorFacetFilters,
    setCreatorFacetFilters,
    forceUpdate,
    setForceUpdate,
  } = useContext(CreatorListContext);

  const hasCurationFacetFilter = facetDomainHasFilter(creatorFacetFilters?.curationTypes);

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
    const facetQuery = buildFacetQueryParam(creatorFacetFilters);
    if (facetQuery) {
      params.set('facetQuery', facetQuery);
    }
    const endpoint = `${routes.creatorsV3.leaderboard()}?${params.toString()}`;
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
  }, [forceUpdate, query, sort, sortBy, verificationFilter, creatorFacetFilters]);

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
    setCreatorFacetFilters({ curationTypes: null, combine: 'and' });
    setForceUpdate(prev => !prev);
  };

  return (
    <div className="creators-list-page">
      <MetaTags {...pageMeta} />

      <div className="creators-list-page__body page-content-70rem">
        <ScrollButton />

        <div className="search-section">
          <div className="search-row">
            <button
              type="button"
              className="help-button"
              onClick={() => setShowHelpPopup(true)}
              data-tooltip-id="creator-search-help"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0" />
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" />
                <g id="SVGRepo_iconCarrier">
                  <path
                    d="M12 3C7.04 3 3 7.04 3 12C3 16.96 7.04 21 12 21C16.96 21 21 16.96 21 12C21 7.04 16.96 3 12 3ZM12 19.5C7.86 19.5 4.5 16.14 4.5 12C4.5 7.86 7.86 4.5 12 4.5C16.14 4.5 19.5 7.86 19.5 12C19.5 16.14 16.14 19.5 12 19.5ZM14.3 7.7C14.91 8.31 15.25 9.13 15.25 10C15.25 10.87 14.91 11.68 14.3 12.3C13.87 12.73 13.33 13.03 12.75 13.16V13.5C12.75 13.91 12.41 14.25 12 14.25C11.59 14.25 11.25 13.91 11.25 13.5V12.5C11.25 12.09 11.59 11.75 12 11.75C12.47 11.75 12.91 11.57 13.24 11.24C13.57 10.91 13.75 10.47 13.75 10C13.75 9.53 13.57 9.09 13.24 8.76C12.58 8.1 11.43 8.1 10.77 8.76C10.44 9.09 10.26 9.53 10.26 10C10.26 10.41 9.92 10.75 9.51 10.75C9.1 10.75 8.76 10.41 8.76 10C8.76 9.13 9.1 8.32 9.71 7.7C10.94 6.47 13.08 6.47 14.31 7.7H14.3ZM13 16.25C13 16.8 12.55 17.25 12 17.25C11.45 17.25 11 16.8 11 16.25C11 15.7 11.45 15.25 12 15.25C12.55 15.25 13 15.7 13 16.25Z"
                    fill="#ffffff"
                  />
                </g>
              </svg>
              <span>{t('creators.buttons.searchHelp')}</span>
            </button>

            <input
              value={query}
              autoComplete="off"
              type="text"
              placeholder={t('creators.input.placeholder')}
              onChange={handleQueryChange}
            />
          </div>

          <div className="buttons-row">
            <Tooltip id="creator-search-help" place="bottom" noArrow>
              {t('creators.tooltips.searchHelp')}
            </Tooltip>
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
              className={`action-button ${filterOpen || verificationFilter || hasCurationFacetFilter ? 'active' : ''}`}
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
          <Collapsible
            open={filterOpen}
            onOpenChange={setFilterOpen}
            revealOverflow
            duration="0.5s"
            easing="cubic-bezier(0.4, 0, 0.2, 1)"
          >
            <CollapsibleContent>
          <div className="filter settings-class">
            <h2 className="setting-title">
              {t('creators.settings.filter.header')}
            </h2>
            <div className="filter-section">
              <div className="filter-row">
                <CustomSelect
                  value={selectedVerificationOption}
                  onChange={(option) => {
                    setVerificationFilter(option.value);
                    setForceUpdate((prev) => !prev);
                  }}
                  options={verificationFilterOptions}
                  label={t('creators.settings.verificationFilter.label')}
                  width="12rem"
                />
              </div>
              <div className="filter-row creators-list-page__curation-facet-row">
                <FacetQueryBuilder
                  items={curationTypes}
                  value={creatorFacetFilters.curationTypes}
                  onChange={(v) => {
                    setCreatorFacetFilters((prev) => ({ ...prev, curationTypes: v }));
                    setForceUpdate((prev) => !prev);
                  }}
                  title={t('creators.settings.curationTypes.label')}
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
            duration="0.5s"
            easing="cubic-bezier(0.4, 0, 0.2, 1)"
          >
            <CollapsibleContent>
          <div className="sort sort-class">
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
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="creators-list-page__list" style={{ minHeight: "500px" }}>
          {creatorData === null ? (
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          ) : (displayedCreators?.length ?? 0) > 0 ? (
            <VirtualList
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              items={displayedCreators}
              loadMore={() => fetchCreators(displayedCreators.length, { immediate: true })}
              hasMore={hasMore}
              loader={<div className="loader loader-relative"></div>}
              endMessage={
                <p className="end-message">
                  <b>{t('creators.infiniteScroll.end')}</b>
                </p>
              }
              renderItem={(creator) => (
                <CreatorCard creator={creator} />
              )}
              computeItemKey={(index, creator) => creator?.id ?? index}
            />
          ) : (
            <div className="creators-list-page__empty">
              <p className="end-message">
                <b>{t('creators.list.empty')}</b>
              </p>
            </div>
          )}
        </div>
      </div>

      {showHelpPopup && (
        <CreatorHelpPopup onClose={() => setShowHelpPopup(false)} />
      )}
    </div>
  );
};

export default CreatorsListPage;

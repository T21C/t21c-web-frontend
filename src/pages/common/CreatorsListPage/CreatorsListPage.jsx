import { routes } from '@/api/routes';
// tuf-search: #CreatorsListPage #creatorsListPage #creatorsList
import "./creatorslistpage.css";
import "@/pages/common/search-section.css";
import "@/pages/common/sort.css";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { CreatorCard } from "@/components/cards";
import { CustomSelect, FacetQueryBuilder, StateDisplay } from "@/components/common/selectors";
import { useDifficultyContext } from "@/contexts/DifficultyContext";
import { buildFacetQueryParam, facetDomainHasFilter } from "@/utils/facetQueryCodec";
import { Tooltip } from '@/components/common/display/Tooltip';
import { VirtualList, useScrollParent } from "@/components/common/VirtualList";
import api from '@/utils/api';
import {
  CREATOR_LEADERBOARD_DEFAULT_SORT_BY,
  normalizeCreatorLeaderboardSortBy,
} from '@/utils/creatorLeaderboardSort';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { useLeaderboardLocate } from '@/hooks/useLeaderboardLocate';
import { CreatorListContext } from "@/contexts/CreatorListContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from '@/utils/meta';
import { useLocation } from 'react-router-dom';
import { SortDescIcon, SortAscIcon, ResetIcon, SortIcon, FilterIcon, LocateIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { AdvancedSearchBar } from "@/components/common/AdvancedSearch";
import {
  normalizeCreatorSearchQuery,
  parseHashtagIdQuery,
} from '@/utils/normalizeEntitySearchQuery';

const limit = 30;

/** Matches server `validCreatorVerificationStatuses` for leaderboard `filters`. */
const CREATOR_VERIFICATION_STATUSES = ['declined', 'pending', 'conditional', 'allowed'];

const CreatorsListPage = () => {
  const { t } = useTranslation('pages');
  const { user } = useAuth();
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
  const [locateMode, setLocateMode] = useState(false);
  const [locateScrollArmed, setLocateScrollArmed] = useState(false);
  const runRequest = useDebouncedRequest(500);
  const isFirstListEffectRef = useRef(true);
  const { scrollRef: locateScrollRef, scrollParent: locateScrollParent } = useScrollParent();

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
    followingFilter,
    setFollowingFilter,
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
    const runner = immediate ? runRequest.flush : runRequest;
    const creatorId = parseHashtagIdQuery(query);
    if (creatorId && offset === 0) {
      try {
        const response = await runner(({ signal }) =>
          api.get(`${routes.creatorsV3.root()}/${creatorId}`, { signal })
        );
        const creator = response.data;
        setCreatorData(creator ? [creator] : []);
        setDisplayedCreators(creator ? [creator] : []);
        setCreatorListTotal(creator ? 1 : 0);
        setHasMore(false);
        return;
      } catch (error) {
        if (axios.isCancel(error)) return;
        setCreatorData([]);
        setDisplayedCreators([]);
        setCreatorListTotal(0);
        setHasMore(false);
        if (error.response?.status !== 404) {
          console.error('Error fetching creator by id:', error);
        }
        return;
      }
    }

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
    if (user && followingFilter === 'only') {
      params.set('following', 'only');
    }
    const endpoint = `${routes.creatorsV3.leaderboard()}?${params.toString()}`;
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
      if (hasCached && !(followingFilter === 'only' && !user)) {
        setHasMore(displayedCreators.length < creatorListTotal);
        return;
      }
    }
    setCreatorListTotal(null);
    setCreatorData(null);
    fetchCreators(0);
  }, [forceUpdate, query, sort, sortBy, verificationFilter, creatorFacetFilters, followingFilter, user]);

  const handleQueryChange = (e) => {
    setQuery(normalizeCreatorSearchQuery(e.target.value));
    setForceUpdate(prev => !prev);
  };

  const resetAll = () => {
    runRequest.cancel();
    setSortBy(CREATOR_LEADERBOARD_DEFAULT_SORT_BY);
    setSort('DESC');
    setQuery('');
    setVerificationFilter('');
    setCreatorFacetFilters({ curationTypes: null, combine: 'and' });
    setFollowingFilter('no');
    setForceUpdate(prev => !prev);
  };

  const liveCreatorSearchParams = () => {
    const params = new URLSearchParams({
      query,
      sortBy: normalizeCreatorLeaderboardSortBy(sortBy),
      order: String(sort ?? 'DESC').toLowerCase(),
    });
    if (verificationFilter) {
      params.set('filters', JSON.stringify({ verificationStatus: verificationFilter }));
    }
    const facetQuery = buildFacetQueryParam(creatorFacetFilters);
    if (facetQuery) {
      params.set('facetQuery', facetQuery);
    }
    if (user && followingFilter === 'only') {
      params.set('following', 'only');
    }
    return params;
  };

  const locateBlock = !user ? 'signed-out' : !user.creatorId ? 'unlinked' : null;
  const locateRequestKey = liveCreatorSearchParams().toString();
  const locate = useLeaderboardLocate({
    active: locateMode && !locateBlock,
    requestKey: locateRequestKey,
    request: ({ direction, cursor, signal } = {}) => {
      const params = liveCreatorSearchParams();
      if (direction) {
        params.set('direction', direction);
        params.set('cursor', JSON.stringify(cursor));
        params.set('limit', '30');
      }
      return api
        .get(`${routes.creatorsV3.leaderboardAround()}?${params.toString()}`, { signal })
        .then((response) => response.data);
    },
  });

  useEffect(() => {
    if (!locateMode) return;
    window.scrollTo(0, 0);
  }, [locateMode]);

  useEffect(() => {
    if (!locateMode || locate.status !== 'ready') {
      setLocateScrollArmed(false);
      return undefined;
    }
    const timer = setTimeout(() => setLocateScrollArmed(true), 200);
    return () => clearTimeout(timer);
  }, [locateMode, locate.status, locateRequestKey]);

  useEffect(() => {
    if (!locateMode || !locateBlock) return;
    const messageKey = locateBlock === 'signed-out'
      ? 'creators.locate.signedOut'
      : 'creators.locate.unlinked';
    toast.error(t(messageKey));
  }, [locateMode, locateBlock, t]);

  useEffect(() => {
    if (!locateMode || locate.status !== 'missing') return;
    toast.error(t('creators.locate.missing'));
  }, [locateMode, locate.status, locateRequestKey, t]);

  const locateItems = locate.windowState?.items ?? [];
  const locateStartIndex = locate.windowState?.startIndex ?? 0;
  const locateUserIndex = typeof locate.windowState?.index === 'number'
    ? locate.windowState.index - locateStartIndex
    : 0;

  return (
    <div className={`creators-list-page${locateMode ? ' creators-list-page--locate' : ''}`}>
      <MetaTags {...pageMeta} />

      <div className="creators-list-page__body page-content-70rem">
        {!locateMode && <ScrollButton />}

        <div className="creators-list-page__locate-row">
          <button
            type="button"
            className={`creators-list-page__locate-toggle${locateMode ? ' creators-list-page__locate-toggle--active' : ''}`}
            onClick={() => setLocateMode((prev) => !prev)}
            aria-pressed={locateMode}
          >
            <LocateIcon color="currentColor" size={18} />
            <span>{t('creators.locate.button')}</span>
          </button>
        </div>

        <div className="search-section">
          <AdvancedSearchBar
            profile="creator"
            value={query}
            onChange={handleQueryChange}
            placeholder={t('creators.input.placeholder')}
            helpLabel={t('creators.buttons.searchHelp')}
            tooltipId="creator-search-help"
          />

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
              className={`action-button ${filterOpen || verificationFilter || hasCurationFacetFilter || (user && followingFilter === 'only') ? 'active' : ''}`}
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
                {user && (
                  <StateDisplay
                    label={t('creators.settings.filter.following')}
                    currentState={followingFilter}
                    onChange={setFollowingFilter}
                    states={['no', 'only']}
                    showValue={false}
                  />
                )}
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

        {creatorListTotal != null && (
          <span className="total-search-results">
            {t('totalResults', { ns: 'common', count: creatorListTotal })}
          </span>
        )}

        <div
          className="creators-list-page__list"
          style={locateMode ? undefined : { minHeight: "500px" }}
          ref={locateMode ? locateScrollRef : undefined}
        >
          {locateMode && locateBlock && (
            <p className="end-message">
              <b>{t(locateBlock === 'signed-out' ? 'creators.locate.signedOut' : 'creators.locate.unlinked')}</b>
            </p>
          )}
          {locateMode && !locateBlock && locate.status !== 'ready' && locate.status !== 'missing' && (
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          )}
          {locateMode && !locateBlock && locate.status === 'missing' && (
            <div className="creators-list-page__empty">
              <p className="end-message">
                <b>{t('creators.locate.missing')}</b>
              </p>
            </div>
          )}
          {locateMode && !locateBlock && locate.status === 'ready' && locateScrollParent && (
            <VirtualList
              key={locateRequestKey}
              customScrollParent={locateScrollParent}
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              items={locateItems}
              firstItemIndex={locateStartIndex}
              initialTopMostItemIndex={{ index: locateUserIndex, align: 'center' }}
              startReached={locateScrollArmed ? locate.loadBefore : undefined}
              loadMore={locateScrollArmed ? locate.loadAfter : undefined}
              hasMore={locateScrollArmed && Boolean(locate.windowState?.hasAfter)}
              loadingMore={locate.loadingAfter}
              header={locate.loadingBefore && <div className="loader loader-relative" />}
              restoreScroll={false}
              loader={<div className="loader loader-relative"></div>}
              endMessage={
                <p className="end-message">
                  <b>{t('creators.infiniteScroll.end')}</b>
                </p>
              }
              renderItem={(creator) => (
                <CreatorCard
                  creator={creator}
                  highlighted={Number(creator?.id) === Number(user?.creatorId)}
                />
              )}
              computeItemKey={(index, creator) => creator?.id ?? index}
            />
          )}
          {!locateMode && creatorData === null && (
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          )}
          {!locateMode && creatorData !== null && (displayedCreators?.length ?? 0) > 0 && (
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
          )}
          {!locateMode && creatorData !== null && (displayedCreators?.length ?? 0) === 0 && (
            <div className="creators-list-page__empty">
              <p className="end-message">
                <b>{user && followingFilter === 'only' ? t('creators.list.emptyFollowing') : t('creators.list.empty')}</b>
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default CreatorsListPage;

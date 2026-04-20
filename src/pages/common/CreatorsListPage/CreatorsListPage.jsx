import "./creatorslistpage.css";
import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { CreatorCard } from "@/components/cards";
import { CustomSelect } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import api from '@/utils/api';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { CreatorListContext } from "@/contexts/CreatorListContext";
import { useTranslation } from "react-i18next";
import { ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { SortDescIcon, SortAscIcon, SortIcon, ResetIcon } from "@/components/common/icons";

const currentUrl = window.location.origin + location.pathname;
const limit = 30;

const CreatorsListPage = () => {
  const { t } = useTranslation('pages');
  const [hasMore, setHasMore] = useState(true);
  const runRequest = useDebouncedRequest(500);

  const {
    creatorData,
    setCreatorData,
    displayedCreators,
    setDisplayedCreators,
    sortOpen,
    setSortOpen,
    setMaxFields,
    query,
    setQuery,
    sort,
    setSort,
    sortBy,
    setSortBy,
    forceUpdate,
    setForceUpdate,
  } = useContext(CreatorListContext);

  const sortOptions = [
    { value: 'chartsTotal', label: t('creators.sortOptions.chartsTotal') },
    { value: 'chartsCreated', label: t('creators.sortOptions.chartsCreated') },
    { value: 'chartsCharted', label: t('creators.sortOptions.chartsCharted') },
    { value: 'chartsVfxed', label: t('creators.sortOptions.chartsVfxed') },
    { value: 'chartsTeamed', label: t('creators.sortOptions.chartsTeamed') },
    { value: 'totalChartClears', label: t('creators.sortOptions.totalChartClears') },
    { value: 'totalChartLikes', label: t('creators.sortOptions.totalChartLikes') },
    { value: 'name', label: t('creators.sortOptions.name') },
  ];

  const fetchCreators = async (offset = 0, { immediate = false } = {}) => {
    const params = new URLSearchParams({
      query,
      sortBy,
      order: sort.toLowerCase(),
      offset,
      limit,
    });
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
        setCreatorData(prev => [...(prev || []), ...results]);
        setDisplayedCreators(prev => [...prev, ...results]);
      }

      const nextLength = (offset === 0 ? results.length : displayedCreators.length + results.length);
      const total = response.data.count ?? response.data.total ?? nextLength;
      setHasMore(nextLength < total);
    } catch (error) {
      if (axios.isCancel(error)) return;
      console.error('Error fetching creators data:', error);
    }
  };

  // Initial / filter-driven loads are debounced; pagination uses flush so
  // infinite scroll fires immediately when the user reaches the bottom.
  useEffect(() => {
    setCreatorData(null);
    fetchCreators(0);
  }, [forceUpdate, query, sort, sortBy]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setForceUpdate(prev => !prev);
  };

  const resetAll = () => {
    runRequest.cancel();
    setSortBy(sortOptions[0].value);
    setSort('DESC');
    setQuery('');
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

        <div className="creators-list-page__input-option">
          <div className="creators-list-page__search">
            <input
              value={query}
              autoComplete="off"
              type="text"
              placeholder={t('creators.input.placeholder')}
              onChange={handleQueryChange}
            />
          </div>

          <div className="creators-list-page__buttons">
            <Tooltip id="creator-sort" place="bottom" noArrow>
              {t('creators.tooltips.sort')}
            </Tooltip>
            <Tooltip id="creator-reset" place="bottom" noArrow>
              {t('creators.tooltips.reset')}
            </Tooltip>

            <SortIcon
              data-tooltip-id="creator-sort"
              color="#ffffff"
              style={{ backgroundColor: sortOpen ? "rgba(255, 255, 255, 0.7)" : "" }}
              onClick={() => setSortOpen(!sortOpen)}
            />
            <ResetIcon
              color="#ffffff"
              onClick={resetAll}
              data-tooltip-id="creator-reset"
            />
          </div>
        </div>

        <div className={`creators-list-page__settings ${sortOpen ? 'is-open' : ''}`}>
          <h2 className="creators-list-page__settings-title">
            {t('creators.settings.sort.header')}
          </h2>

          <div className="creators-list-page__sort-row">
            <div className="creators-list-page__sort-group">
              <p>{t('creators.settings.sort.sortOrder')}</p>
              <Tooltip id="creator-asc" place="top" noArrow>
                {t('creators.tooltips.recentAsc')}
              </Tooltip>
              <Tooltip id="creator-desc" place="top" noArrow>
                {t('creators.tooltips.recentDesc')}
              </Tooltip>
              <div className="creators-list-page__sort-buttons">
                <SortAscIcon
                  data-tooltip-id="creator-asc"
                  style={{ backgroundColor: sort === "ASC" ? "rgba(255, 255, 255, 0.7)" : "" }}
                  onClick={() => setSort("ASC")}
                />
                <SortDescIcon
                  data-tooltip-id="creator-desc"
                  style={{ backgroundColor: sort === "DESC" ? "rgba(255, 255, 255, 0.7)" : "" }}
                  onClick={() => setSort("DESC")}
                />
              </div>
            </div>

            <div className="creators-list-page__sort-group">
              <p>{t('creators.settings.sort.sortBy')}</p>
              <CustomSelect
                value={sortOptions.find(option => option.value === sortBy)}
                onChange={(option) => setSortBy(option.value)}
                options={sortOptions}
                width="11rem"
              />
            </div>
          </div>
        </div>

        <div className="creators-list-page__list" style={{ minHeight: "500px" }}>
          {!creatorData ? (
            <div className="loader loader-level-page"></div>
          ) : (
            <InfiniteScroll
              style={{ paddingBottom: "4rem", overflow: "visible" }}
              dataLength={displayedCreators.length}
              next={() => fetchCreators(displayedCreators.length, { immediate: true })}
              hasMore={hasMore}
              loader={<div className="loader"></div>}
              endMessage={
                displayedCreators.length > 0 && (
                  <p style={{ textAlign: "center" }}>
                    <b>{t('creators.infiniteScroll.end')}</b>
                  </p>
                )
              }
            >
              {displayedCreators.map((creator) => (
                <CreatorCard key={creator.id} creator={creator} />
              ))}
            </InfiniteScroll>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorsListPage;

// tuf-search: #PackPage #packPage #pack — Packs - TUF
import "./packpage.css";
import "@/pages/common/sort.css";
import "@/pages/common/search-section.css";
import { useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";

import { PackCard } from "@/components/cards";
import { CustomSelect } from "@/components/common/selectors";
import { Tooltip } from '@/components/common/display/Tooltip';
import { VirtualList } from "@/components/common/VirtualList";
import { PackContext } from "@/contexts/PackContext";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { buildStaticPageMeta } from '@/utils/meta';
import { SortAscIcon, SortDescIcon, ResetIcon, SortIcon, FilterIcon, SwitchIcon, LikeIcon } from "@/components/common/icons";
import { Collapsible, CollapsibleContent } from "@/components/common/Collapsible";
import { CreatePackPopup } from "@/components/popups/Packs";
import { AdvancedSearchBar } from "@/components/common/AdvancedSearch";
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { LevelPackViewModes } from "@/utils/constants";
import { normalizePackSearchQuery } from '@/utils/normalizeEntitySearchQuery';

// Internal component that uses unified PackContext
const PackPageContent = () => {
  const { t } = useTranslation('pages');

  const { user } = useAuth();
  const location = useLocation();
  const isMyPacks = location.pathname === '/packs/my';
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: isMyPacks ? t('pack.meta.myPacksTitle') : t('pack.meta.title'),
        description: isMyPacks ? t('pack.meta.myPacksDescription') : t('pack.meta.description'),
        pathname: location.pathname,
      }),
    [t, location.pathname, isMyPacks],
  );
  
  const {
    packs,
    filters,
    error,
    hasMore,
    totalPacks,
    loadPackList,
    forceUpdate,
    triggerRefresh,
    loadMore,
    retryLoadMore,
    createPack,
    updateFilter,
    handleMyLikesToggle
  } = useContext(PackContext);

  // Local state for UI controls
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [displayMode, setDisplayMode] = useState('grid');
  const scrollRef = useRef(null);
  const isFirstListEffectRef = useRef(true);

  // Lazy-load the list only while this page is mounted. On remount, keep
  // context-backed rows (same idea as LevelPage / LeaderboardPage).
  useEffect(() => {
    if (isFirstListEffectRef.current) {
      isFirstListEffectRef.current = false;
      if (totalPacks != null) {
        return;
      }
      loadPackList({ immediate: true });
      return;
    }
    loadPackList();
  }, [loadPackList, forceUpdate]);

  // Sort options
  const sortOptions = [
    { value: 'RECENT', label: t('pack.sort.recent') },
    { value: 'NAME', label: t('pack.sort.name') },
    { value: 'LEVELS', label: t('pack.sort.levels') },
    { value: 'FAVORITES', label: t('pack.sort.favorites') }
  ];

  // Check if user is admin
  const isAdmin = user && hasFlag(user, permissionFlags.SUPER_ADMIN);

  // View mode options - filter based on admin status
  const viewModeOptions = [
    { value: 'all', label: t('pack.viewMode.all') },
    ...(isAdmin ? [{ value: String(LevelPackViewModes.PUBLIC), label: t('pack.viewMode.public') }] : []),
    { value: String(LevelPackViewModes.LINKONLY), label: t('pack.viewMode.linkonly') },
    { value: String(LevelPackViewModes.PRIVATE), label: t('pack.viewMode.private') },
    { value: String(LevelPackViewModes.FORCED_PRIVATE), label: t('pack.viewMode.forcedPrivate') }
  ];

  // Handle my packs mode (only change if needed)
  useEffect(() => {
    if (isMyPacks && user && filters.viewMode !== 'all') {
      updateFilter('viewMode', 'all');
    }
  }, [isMyPacks, user, filters.viewMode]);

  // No longer overriding viewMode for non-admins - default is PUBLIC

  function handleQueryChange(e) {
    updateFilter('query', normalizePackSearchQuery(e.target.value));
    triggerRefresh();
  }

  // Handle reset
  const handleReset = useCallback(() => {
    updateFilter('query', '');
    updateFilter('viewMode', LevelPackViewModes.PUBLIC);
    updateFilter('sort', 'FAVORITES');
    updateFilter('order', 'DESC');
    updateFilter('myLikesOnly', false);
    triggerRefresh();
  }, [updateFilter, triggerRefresh]);

  // Handle create pack
  const handleCreatePack = async (packData) => {
    // Return the created pack so CreatePackPopup can upload the icon before closing.
    return await createPack(packData);
  };

  const canCreatePack = user && (
    !isMyPacks || 
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  );

  return (
    <div className="pack-page">
      <MetaTags {...pageMeta} />
      
      
      <div className="pack-page__container page-content-70rem">
        <div className="pack-page__header">
          <div className="pack-page__title-section">
            <h1 className="pack-page__title">
              {isMyPacks ? t('pack.title.myPacks') : t('pack.title.allPacks')}
            </h1>
            <p className="pack-page__subtitle">
              {isMyPacks ? t('pack.subtitle.myPacks') : t('pack.subtitle.allPacks')}
            </p>
          </div>
          
          <div className="pack-page__actions">
            <div className="pack-page__view-toggle" role="group" aria-label={t('pack.actions.viewToggleGroup')}>
              <button
                type="button"
                className={`pack-page__view-toggle-btn${displayMode === 'grid' ? ' pack-page__view-toggle-btn--active' : ''}`}
                onClick={() => setDisplayMode('grid')}
                aria-pressed={displayMode === 'grid'}
                aria-label={t('pack.actions.gridView')}
                data-tooltip-id="pack-view-tooltip-grid"
                data-tooltip-content={t('pack.actions.gridView')}
              >
                <span className="pack-page__view-toggle-icon" aria-hidden="true">
                  <svg className="pack-page__view-toggle-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="4" width="6.5" height="6.5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
                    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
                    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
                    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.25" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                className={`pack-page__view-toggle-btn${displayMode === 'list' ? ' pack-page__view-toggle-btn--active' : ''}`}
                onClick={() => setDisplayMode('list')}
                aria-pressed={displayMode === 'list'}
                aria-label={t('pack.actions.listView')}
                data-tooltip-id="pack-view-tooltip-list"
                data-tooltip-content={t('pack.actions.listView')}
              >
                <span className="pack-page__view-toggle-icon" aria-hidden="true">
                  <svg className="pack-page__view-toggle-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M4 7h16M4 12h16M4 17h12"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </div>

            {canCreatePack && (
              <button
                className="pack-page__create-btn"
                onClick={() => setShowCreatePopup(true)}
                data-tooltip-id="create-pack-tooltip"
                data-tooltip-content={t('pack.actions.createPack')}
              >
                <span className="pack-page__create-btn-text">
                  {t('pack.actions.createPack')}
                </span>
              </button>
            )}
          </div>
        </div>

        <Tooltip id="pack-view-tooltip-grid" place="bottom" noArrow>
          {t('pack.actions.gridView')}
        </Tooltip>
        <Tooltip id="pack-view-tooltip-list" place="bottom" noArrow>
          {t('pack.actions.listView')}
        </Tooltip>

        <div className="search-section">
          {/* Search Row */}
          <AdvancedSearchBar
            profile="pack"
            value={filters.query}
            onChange={handleQueryChange}
            placeholder={t('pack.search.placeholder')}
            helpLabel={t('pack.buttons.searchHelp')}
            tooltipId="search"
          />

          {/* Buttons Row */}
          <div className="buttons-row">
            <FilterIcon
              color="var(--color-white)"
              onClick={() => setFilterOpen(!filterOpen)}
              data-tooltip-id="filter"
              className={`action-button ${filterOpen ? 'active' : ''}`}
            />

            <SortIcon
              color="var(--color-white)"
              onClick={() => setSortOpen(!sortOpen)}
              data-tooltip-id="sort"
              className={`action-button ${sortOpen ? 'active' : ''}`}
            />

            <ResetIcon
              strokeWidth="1.5"
              stroke="currentColor"
              onClick={handleReset}
              data-tooltip-id="reset"
              className="action-button"
            />
          </div>

          <Tooltip id="search" place="bottom" noArrow>
            {t('pack.toolTip.search')}
          </Tooltip>
          <Tooltip id="filter" place="bottom" noArrow>
            {t('pack.toolTip.filter')}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {t('pack.toolTip.sort')}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {t('pack.toolTip.reset')}
          </Tooltip>
          <Tooltip id="display-mode" place="bottom" noArrow>
            {displayMode === 'grid' ? t('pack.actions.listView') : t('pack.actions.gridView')}
          </Tooltip>
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
            <h2 className="setting-title">{t('pack.filters.title')}</h2>
            <div className="filter-section">
              <div className="filter-row">
                {isAdmin && (
                  <div className="pack-page__filter-group">
                    <label className="pack-page__filter-label">
                      {t('pack.filters.viewMode')}
                    </label>
                    <CustomSelect
                      value={viewModeOptions.find(option => filters.viewMode === option.value)}
                      onChange={(option) => {
                        updateFilter('viewMode', option.value);
                        triggerRefresh();
                      }}
                      options={viewModeOptions}
                      placeholder={t('pack.filters.viewModePlaceholder')}
                    />
                  </div>
                )}
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
              {t('pack.sort.title')}
            </h2>
            <div className="sort-option">
              <CustomSelect
                value={sortOptions.find(option => filters.sort === option.value)}
                onChange={(option) => {
                  updateFilter('sort', option.value);
                  triggerRefresh();
                }}
                options={sortOptions}
                label={t('pack.sort.header')}
              />
              
              <div className="order">
                <p>{t('pack.sort.order')}</p>
                <Tooltip id="ascending" place="bottom" noArrow>
                  {t('pack.sort.ascending')}
                </Tooltip>
                <Tooltip id="descending" place="bottom" noArrow>
                  {t('pack.sort.descending')}
                </Tooltip>

                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        filters.order === 'ASC' ? "var(--color-white-t70)" : "",
                    }}
                    value="RECENT_ASC"
                    onClick={() => {
                      updateFilter('order', 'ASC');
                      triggerRefresh();
                    }}
                    data-tooltip-id="ascending"
                  />

                  <SortDescIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        filters.order === 'DESC' ? "var(--color-white-t70)" : "",
                    }}
                    onClick={() => {
                      updateFilter('order', 'DESC');
                      triggerRefresh();
                    }}
                    value="RECENT_DESC"
                    data-tooltip-id="descending"
                  />
                </div>
              </div>

              {user && (
                <div className="order" >
                  <div className={`wrapper-like ${filters.myLikesOnly ? 'active' : ''}`} onClick={handleMyLikesToggle}>
                    <LikeIcon color={filters.myLikesOnly ? "var(--color-white)" : "none"} size={"22px"} />
                    <p>{t('pack.sort.myLikes')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {totalPacks != null && (
          <span className="total-search-results">
            {t('totalResults', { ns: 'common', count: totalPacks })}
          </span>
        )}

        <div className="pack-page__content" ref={scrollRef}>
          {error && packs.length === 0 ? (
            <div className="pack-page__error">
              <p>{t('pack.error.loadFailed')}</p>
              <button onClick={triggerRefresh} className="pack-page__retry-btn">
                {t('pack.error.retry')}
              </button>
            </div>
          ) : (
            <>
            <VirtualList
              style={{ paddingBottom: "7rem", minHeight: "50vh" }}
              items={packs ?? []}
              loadMore={loadMore}
              hasMore={hasMore}
              overscan={800}
              grid={displayMode === 'grid'}
              minColumnWidth={300}
              gap={20}
              listClassName={`pack-page__grid pack-page__grid--${displayMode}`}
              loader={
                <div className="pack-page__loading">
                  <div className="spinner spinner-large"></div>
                  <p>{t('pack.loading.more')}</p>
                </div>
              }
              endMessage={
                <div className="pack-page__end-message">
                  <p>{t('pack.endMessage')}</p>
                </div>
              }
              renderItem={(pack, index) => (
                <PackCard
                  index={index}
                  packId={pack.id}
                  user={user}
                  sortBy={filters.sort}
                  displayMode={displayMode}
                  size="medium"
                />
              )}
              computeItemKey={(index, pack) => pack?.id ?? index}
            />

            {error && packs.length > 0 && (
              <div className="pack-page__infinite-error">
                <p>{t('pack.error.loadMoreFailed')}</p>
                <button onClick={retryLoadMore} className="pack-page__retry-btn">
                  {t('pack.error.retry')}
                </button>
              </div>
            )}
            </>
          )}
        </div>

        <ScrollButton targetRef={scrollRef} />
      </div>

      {showCreatePopup && (
        <CreatePackPopup
          onClose={() => setShowCreatePopup(false)}
          onCreate={handleCreatePack}
        />
      )}

    </div>
  );
};

const PackPage = () => {
  return <PackPageContent />;
};

export default PackPage;

import "./packpage.css";
import "../sort.css";
import "../search-section.css";
import { useContext, useEffect, useState, useCallback, useRef } from "react";

import { PackCard } from "@/components/cards";
import { StateDisplay, CustomSelect } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import { PackContext, usePackContext } from "@/contexts/PackContext";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ReferencesButton, ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { SortAscIcon, SortDescIcon, ResetIcon, SortIcon, FilterIcon, PinIcon, SwitchIcon, LikeIcon } from "@/components/common/icons";
import { CreatePackPopup, PackHelpPopup } from "@/components/popups";
import toast from 'react-hot-toast';
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";
import { LevelPackViewModes } from "@/utils/constants";

const currentUrl = window.location.origin + location.pathname;

const limit = 30;

// Internal component that uses unified PackContext
const PackPageContent = () => {
  const { t } = useTranslation('pages');
  const tPack = (key, params = {}) => t(`pack.${key}`, params);

  const { user } = useAuth();
  const location = useLocation();
  const isMyPacks = location.pathname === '/packs/my';
  
  const {
    packs,
    filters,
    error,
    hasMore,
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
  const [showHelpPopup, setShowHelpPopup] = useState(false);
  const [displayMode, setDisplayMode] = useState('grid');
  const scrollRef = useRef(null);
  const [pendingQuery, setPendingQuery] = useState(filters.query);

  // Sort options
  const sortOptions = [
    { value: 'RECENT', label: tPack('sort.recent') },
    { value: 'NAME', label: tPack('sort.name') },
    { value: 'LEVELS', label: tPack('sort.levels') },
    { value: 'FAVORITES', label: tPack('sort.favorites') }
  ];

  // Check if user is admin
  const isAdmin = user && hasFlag(user, permissionFlags.SUPER_ADMIN);

  // View mode options - filter based on admin status
  const viewModeOptions = [
    { value: 'all', label: tPack('viewMode.all') },
    ...(isAdmin ? [{ value: String(LevelPackViewModes.PUBLIC), label: tPack('viewMode.public') }] : []),
    { value: String(LevelPackViewModes.LINKONLY), label: tPack('viewMode.linkonly') },
    { value: String(LevelPackViewModes.PRIVATE), label: tPack('viewMode.private') },
    { value: String(LevelPackViewModes.FORCED_PRIVATE), label: tPack('viewMode.forcedPrivate') }
  ];

  // Handle my packs mode (only change if needed)
  useEffect(() => {
    if (isMyPacks && user && filters.viewMode !== 'all') {
      updateFilter('viewMode', 'all');
    }
  }, [isMyPacks, user, filters.viewMode]);

  // No longer overriding viewMode for non-admins - default is PUBLIC

  // Debounced search effect (same pattern as PassPage)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pendingQuery !== filters.query) {
        updateFilter('query', pendingQuery);
        triggerRefresh();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pendingQuery]);

  // Initialize pendingQuery with query value and check for preset queries
  useEffect(() => {
    setPendingQuery(filters.query);
    
    // Check for preset search queries from window context
    if (window.packSearchContext && window.packSearchContext.query) {
      const presetQuery = window.packSearchContext.query;
      
      // Set the query in the search input
      setPendingQuery(presetQuery);
      
      // Clean up the window context after consuming it
      delete window.packSearchContext;
    }
  }, []);

  function handleQueryChange(e) {
    setPendingQuery(e.target.value);
  }

  // Handle reset
  const handleReset = useCallback(() => {
    updateFilter('query', '');
    setPendingQuery('');
    updateFilter('viewMode', LevelPackViewModes.PUBLIC);
    updateFilter('sort', 'RECENT');
    updateFilter('order', 'DESC');
    updateFilter('myLikesOnly', false);
    triggerRefresh();
  }, [updateFilter, triggerRefresh]);

  // Handle create pack
  const handleCreatePack = async (packData) => {
    try {
      await createPack(packData);
      setShowCreatePopup(false);
      toast.success(tPack('create.success'));
    } catch (error) {
      console.error('Error creating pack:', error);
      toast.error(tPack('create.error'));
    }
  };

  // Handle display mode toggle
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  const canCreatePack = user && (
    !isMyPacks || 
    hasFlag(user, permissionFlags.SUPER_ADMIN)
  );

  return (
    <div className="pack-page">
      <MetaTags 
        title={isMyPacks ? tPack('meta.myPacksTitle') : tPack('meta.title')}
        description={isMyPacks ? tPack('meta.myPacksDescription') : tPack('meta.description')}
        url={currentUrl}
      />
      
      
      <div className="pack-page__container">
        <div className="pack-page__header">
          <div className="pack-page__title-section">
            <h1 className="pack-page__title">
              {isMyPacks ? tPack('title.myPacks') : tPack('title.allPacks')}
            </h1>
            <p className="pack-page__subtitle">
              {isMyPacks ? tPack('subtitle.myPacks') : tPack('subtitle.allPacks')}
            </p>
          </div>
          
          <div className="pack-page__actions">
            <button
              className="pack-page__display-toggle"
              onClick={toggleDisplayMode}
              data-tooltip-id="display-mode-tooltip"
              data-tooltip-content={displayMode === 'grid' ? tPack('actions.listView') : tPack('actions.gridView')}
            >
              <SwitchIcon />
            </button>
            
            {canCreatePack && (
              <button
                className="pack-page__create-btn"
                onClick={() => setShowCreatePopup(true)}
                data-tooltip-id="create-pack-tooltip"
                data-tooltip-content={tPack('actions.createPack')}
              >
                <span className="pack-page__create-btn-text">
                  {tPack('actions.createPack')}
                </span>
              </button>
            )}
          </div>
        </div>

        <div className="search-section">
          {/* Search Row */}
          <div className="search-row">
            <button 
              className="help-button"
              onClick={() => setShowHelpPopup(true)}
              data-tooltip-id="search"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <path d="M12 3C7.04 3 3 7.04 3 12C3 16.96 7.04 21 12 21C16.96 21 21 16.96 21 12C21 7.04 16.96 3 12 3ZM12 19.5C7.86 19.5 4.5 16.14 4.5 12C4.5 7.86 7.86 4.5 12 4.5C16.14 4.5 19.5 7.86 19.5 12C19.5 16.14 16.14 19.5 12 19.5ZM14.3 7.7C14.91 8.31 15.25 9.13 15.25 10C15.25 10.87 14.91 11.68 14.3 12.3C13.87 12.73 13.33 13.03 12.75 13.16V13.5C12.75 13.91 12.41 14.25 12 14.25C11.59 14.25 11.25 13.91 11.25 13.5V12.5C11.25 12.09 11.59 11.75 12 11.75C12.47 11.75 12.91 11.57 13.24 11.24C13.57 10.91 13.75 10.47 13.75 10C13.75 9.53 13.57 9.09 13.24 8.76C12.58 8.1 11.43 8.1 10.77 8.76C10.44 9.09 10.26 9.53 10.26 10C10.26 10.41 9.92 10.75 9.51 10.75C9.1 10.75 8.76 10.41 8.76 10C8.76 9.13 9.1 8.32 9.71 7.7C10.94 6.47 13.08 6.47 14.31 7.7H14.3ZM13 16.25C13 16.8 12.55 17.25 12 17.25C11.45 17.25 11 16.8 11 16.25C11 15.7 11.45 15.25 12 15.25C12.55 15.25 13 15.7 13 16.25Z" fill="#ffffff"></path>
                </g>
              </svg>
              <span>{tPack('buttons.searchHelp')}</span>
            </button>

            <input
              value={pendingQuery}
              type="text"
              placeholder={tPack('search.placeholder')}
              onChange={handleQueryChange}
              className={pendingQuery !== filters.query ? 'search-pending' : ''}
            />
          </div>

          {/* Buttons Row */}
          <div className="buttons-row">
            <FilterIcon
              color="#ffffff"
              onClick={() => setFilterOpen(!filterOpen)}
              data-tooltip-id="filter"
              className={`action-button ${filterOpen ? 'active' : ''}`}
            />

            <SortIcon
              color="#ffffff"
              onClick={() => setSortOpen(!sortOpen)}
              data-tooltip-id="sort"
              className={`action-button ${sortOpen ? 'active' : ''}`}
            />

            <SwitchIcon
              color="#ffffff"
              onClick={() => setDisplayMode(displayMode === 'grid' ? 'list' : 'grid')}
              data-tooltip-id="display-mode"
              className="action-button"
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
            {tPack('toolTip.search')}
          </Tooltip>
          <Tooltip id="filter" place="bottom" noArrow>
            {tPack('toolTip.filter')}
          </Tooltip>
          <Tooltip id="sort" place="bottom" noArrow>
            {tPack('toolTip.sort')}
          </Tooltip>
          <Tooltip id="reset" place="bottom" noArrow>
            {tPack('toolTip.reset')}
          </Tooltip>
          <Tooltip id="display-mode" place="bottom" noArrow>
            {displayMode === 'grid' ? tPack('actions.listView') : tPack('actions.gridView')}
          </Tooltip>
        </div>

        <div className="input-setting">
          <div
            className={`filter settings-class ${filterOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">{tPack('filters.title')}</h2>
            <div className="filter-section">
              <div className="filter-row">
                {isAdmin && (
                  <div className="pack-page__filter-group">
                    <label className="pack-page__filter-label">
                      {tPack('filters.viewMode')}
                    </label>
                    <CustomSelect
                      value={viewModeOptions.find(option => filters.viewMode === option.value)}
                      onChange={(option) => {
                        updateFilter('viewMode', option.value);
                        triggerRefresh();
                      }}
                      options={viewModeOptions}
                      placeholder={tPack('filters.viewModePlaceholder')}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            className={`sort sort-class ${sortOpen ? 'visible' : 'hidden'}`}
          >
            <h2 className="setting-title">
              {tPack('sort.title')}
            </h2>
            <div className="sort-option">
              <CustomSelect
                value={sortOptions.find(option => filters.sort === option.value)}
                onChange={(option) => {
                  updateFilter('sort', option.value);
                  triggerRefresh();
                }}
                options={sortOptions}
                label={tPack('sort.header')}
              />
              
              <div className="order">
                <p>{tPack('sort.order')}</p>
                <Tooltip id="ascending" place="bottom" noArrow>
                  {tPack('sort.ascending')}
                </Tooltip>
                <Tooltip id="descending" place="bottom" noArrow>
                  {tPack('sort.descending')}
                </Tooltip>

                <div className="wrapper">
                  <SortAscIcon
                    className="svg-fill"
                    style={{
                      backgroundColor:
                        filters.order === 'ASC' ? "rgba(255, 255, 255, 0.7)" : "",
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
                        filters.order === 'DESC' ? "rgba(255, 255, 255, 0.7)" : "",
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
                    <p>{tPack('sort.myLikes')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pack-page__content" ref={scrollRef}>
          {error && packs.length === 0 ? (
            <div className="pack-page__error">
              <p>{tPack('error.loadFailed')}</p>
              <button onClick={triggerRefresh} className="pack-page__retry-btn">
                {tPack('error.retry')}
              </button>
            </div>
          ) : (
            <InfiniteScroll
              style={{ paddingBottom: "7rem", minHeight: "50vh", overflow: "visible" }}
              dataLength={packs?.length || 0}
              next={loadMore}
              hasMore={hasMore}
              loader={
                <div className="pack-page__loading">
                  <div className="pack-page__loading-spinner"></div>
                  <p>{tPack('loading.more')}</p>
                </div>
              }
              endMessage={
                <div className="pack-page__end-message">
                  <p>{tPack('endMessage')}</p>
                </div>
              }
              scrollableTarget={scrollRef.current || undefined}
            >
              <div className={`pack-page__grid pack-page__grid--${displayMode}`}>
                {packs.map((pack, index) => (
                    <PackCard
                    key={pack.id}
                    index={index}
                    packId={pack.id}
                    user={user}
                    sortBy={filters.sort}
                    displayMode={displayMode}
                    size="medium"
                  />
                ))}
              </div>
              
              {/* Show error message for infinite scroll failures */}
              {error && packs.length > 0 && (
                <div className="pack-page__infinite-error">
                  <p>{tPack('error.loadMoreFailed')}</p>
                  <button onClick={retryLoadMore} className="pack-page__retry-btn">
                    {tPack('error.retry')}
                  </button>
                </div>
              )}
            </InfiniteScroll>
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

      {showHelpPopup && (
        <PackHelpPopup onClose={() => setShowHelpPopup(false)} />
      )}
    </div>
  );
};

// Main wrapper component that provides the unified PackContext
const PackPage = () => {
  return <PackPageContent />;
};

export default PackPage;

import "./packpage.css";
import "../sort.css";
import "../search-section.css";
import { useContext, useEffect, useState, useCallback, useRef } from "react";
import { CompleteNav } from "@/components/layout";
import { PackCard } from "@/components/cards";
import { StateDisplay, CustomSelect } from "@/components/common/selectors";
import { Tooltip } from "react-tooltip";
import InfiniteScroll from "react-infinite-scroll-component";
import { PackContext } from "@/contexts/PackContext";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { ReferencesButton, ScrollButton } from "@/components/common/buttons";
import { MetaTags } from "@/components/common/display";
import { SortAscIcon, SortDescIcon, ResetIcon, SortIcon, FilterIcon, PinIcon, SwitchIcon } from "@/components/common/icons";
import { CreatePackPopup } from "@/components/popups";
import toast from 'react-hot-toast';
import { hasFlag, permissionFlags } from "@/utils/UserPermissions";

const currentUrl = window.location.origin + location.pathname;

const limit = 30;

const PackPage = () => {
  const { t } = useTranslation('pages');
  const tPack = (key, params = {}) => t(`pack.${key}`, params);

  const [forceUpdate, setForceUpdate] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const isMyPacks = location.pathname === '/packs/my';
  
  const {
    packs,
    setPacks,
    filterOpen,
    setFilterOpen,
    sortOpen,
    setSortOpen,
    query,
    setQuery,
    viewMode,
    setViewMode,
    pinned,
    setPinned,
    sort,
    setSort,
    order,
    setOrder,
    hasMore,
    loading,
    error,
    resetAndFetch,
    loadMore,
    createPack
  } = useContext(PackContext);

  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [displayMode, setDisplayMode] = useState('grid');
  const scrollRef = useRef(null);

  // Sort options
  const sortOptions = [
    { value: 'RECENT', label: tPack('sort.recent') },
    { value: 'NAME', label: tPack('sort.name') },
    { value: 'LEVELS', label: tPack('sort.levels') }
  ];

  // View mode options
  const viewModeOptions = [
    { value: 'all', label: tPack('viewMode.all') },
    { value: '1', label: tPack('viewMode.public') },
    { value: '2', label: tPack('viewMode.linkonly') },
    { value: '3', label: tPack('viewMode.private') }
  ];

  // Handle my packs mode
  useEffect(() => {
    if (isMyPacks && user) {
      setViewMode('all');
    } else if (!isMyPacks) {
    }
  }, [isMyPacks, user, setViewMode]);

  // Initial fetch
  useEffect(() => {
    resetAndFetch();
  }, []); // Empty dependency array - only run on mount

  // Handle search
  const handleSearch = useCallback(() => {
    resetAndFetch();
  }, [resetAndFetch]);

  // Handle reset
  const handleReset = useCallback(() => {
    setQuery('');
    setViewMode('all');
    setPinned(false); // Show all packs (pinned first) by default
    setSort('RECENT');
    setOrder('DESC');
    resetAndFetch();
  }, [setQuery, setViewMode, setPinned, setSort, setOrder, resetAndFetch]);

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
      
      <CompleteNav />
      
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

        <div className="pack-page__filters">
          <div className="search-section">
            <div className="search-section__input-group">
              <input
                type="text"
                className="search-section__input"
                placeholder={tPack('search.placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className="search-section__search-btn"
                onClick={handleSearch}
                data-tooltip-id="search-tooltip"
                data-tooltip-content={tPack('search.search')}
              >
                🔍
              </button>
            </div>
          </div>

          <div className="pack-page__filter-controls">
            <button
              className={`pack-page__filter-btn ${filterOpen ? 'active' : ''}`}
              onClick={() => setFilterOpen(!filterOpen)}
              data-tooltip-id="filter-tooltip"
              data-tooltip-content={tPack('filters.toggle')}
            >
              <FilterIcon />
              <span>{tPack('filters.title')}</span>
            </button>

            <button
              className={`pack-page__sort-btn ${sortOpen ? 'active' : ''}`}
              onClick={() => setSortOpen(!sortOpen)}
              data-tooltip-id="sort-tooltip"
              data-tooltip-content={tPack('sort.toggle')}
            >
              <SortIcon />
              <span>{tPack('sort.title')}</span>
            </button>

            <button
              className="pack-page__reset-btn"
              onClick={handleReset}
              data-tooltip-id="reset-tooltip"
              data-tooltip-content={tPack('actions.reset')}
            >
              <ResetIcon />
              <span>{tPack('actions.reset')}</span>
            </button>
          </div>
        </div>

        {(filterOpen || sortOpen) && (
          <div className="pack-page__controls">
            {filterOpen && (
              <div className="pack-page__filter-panel">

                <div className="pack-page__filter-group">
                  <label className="pack-page__filter-label">
                    {tPack('filters.viewMode')}
                  </label>
                  <CustomSelect
                    value={viewMode}
                    onChange={setViewMode}
                    options={viewModeOptions}
                    placeholder={tPack('filters.viewModePlaceholder')}
                  />
                </div>

                <div className="pack-page__filter-group">
                  <label className="pack-page__filter-checkbox">
                    <input
                      type="checkbox"
                      checked={pinned}
                      onChange={(e) => setPinned(e.target.checked)}
                    />
                    <PinIcon className="pack-page__filter-checkbox-icon" />
                    <span>{tPack('filters.pinnedOnly')}</span>
                  </label>
                </div>
              </div>
            )}

            {sortOpen && (
              <div className="pack-page__sort-panel">
                <div className="pack-page__sort-group">
                  <label className="pack-page__sort-label">
                    {tPack('sort.by')}
                  </label>
                  <CustomSelect
                    value={sort}
                    onChange={setSort}
                    options={sortOptions}
                    placeholder={tPack('sort.placeholder')}
                  />
                </div>

                <div className="pack-page__sort-group">
                  <button
                    className={`pack-page__order-btn ${order === 'ASC' ? 'active' : ''}`}
                    onClick={() => setOrder('ASC')}
                    data-tooltip-id="sort-asc-tooltip"
                    data-tooltip-content={tPack('sort.ascending')}
                  >
                    <SortAscIcon />
                  </button>
                  <button
                    className={`pack-page__order-btn ${order === 'DESC' ? 'active' : ''}`}
                    onClick={() => setOrder('DESC')}
                    data-tooltip-id="sort-desc-tooltip"
                    data-tooltip-content={tPack('sort.descending')}
                  >
                    <SortDescIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="pack-page__content" ref={scrollRef}>
          {error ? (
            <div className="pack-page__error">
              <p>{tPack('error.loadFailed')}</p>
              <button onClick={resetAndFetch} className="pack-page__retry-btn">
                {tPack('error.retry')}
              </button>
            </div>
          ) : (
            <InfiniteScroll
              dataLength={packs?.length||0}
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
              scrollableTarget={scrollRef.current}
            >
              <div className={`pack-page__grid pack-page__grid--${displayMode}`}>
                {packs?.map((pack, index) => (
                  <PackCard
                    key={pack.id}
                    index={index}
                    pack={pack}
                    user={user}
                    sortBy={sort}
                    displayMode={displayMode}
                    size="medium"
                  />
                ))}
              </div>
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

      {/* Tooltips */}
      <Tooltip id="display-mode-tooltip" />
      <Tooltip id="create-pack-tooltip" />
      <Tooltip id="search-tooltip" />
      <Tooltip id="filter-tooltip" />
      <Tooltip id="sort-tooltip" />
      <Tooltip id="reset-tooltip" />
      <Tooltip id="sort-asc-tooltip" />
      <Tooltip id="sort-desc-tooltip" />
    </div>
  );
};

export default PackPage;

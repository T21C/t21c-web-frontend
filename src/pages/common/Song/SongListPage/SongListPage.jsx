import { routes } from '@/api/routes';
// tuf-search: #SongListPage #songListPage #song #songList — Songs - TUF
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { VirtualList } from '@/components/common/VirtualList';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { normalizeSongSearchQuery } from '@/utils/normalizeEntitySearchQuery';
import { CustomSelect } from '@/components/common/selectors';
import { useSongContext } from '@/contexts/SongContext';
import { getVerificationClass } from '@/utils/Utility';
import './songListPage.css';
import '@/pages/common/search-section.css';

const SongListPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const location = useLocation();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('songList.meta.title'),
        description: t('songList.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );
  const {
    searchQuery,
    sortBy,
    verificationState,
    setSearchQuery,
    setSortBy,
    setVerificationState
  } = useSongContext();

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalSongs, setTotalSongs] = useState(null);
  
  // Cancel token ref for race condition prevention
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetchSongs(true);
    
    // Cleanup: abort any pending requests when component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, sortBy, verificationState]);

  const fetchSongs = async (reset = false) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setSongs([]);
        setTotalSongs(null);
      }

      const currentPage = reset ? 1 : page;
      const params = {
        page: currentPage,
        limit: 50,
        search: searchQuery,
        sort: sortBy
      };
      
      if (verificationState) {
        params.verificationState = verificationState;
      }
      
      const response = await api.get(routes.database.songs.root(), {
        params,
        signal: abortController.signal
      });
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      const data = response.data;
      const newSongs = data.songs || [];
      
      if (reset) {
        setSongs(newSongs);
        setTotalSongs(data.total ?? 0);
      } else {
        setSongs(prev => [...prev, ...newSongs]);
      }

      setHasMore(data.hasMore || false);
      setPage(currentPage + 1);
    } catch (error) {
      // Don't show error if request was cancelled
      if (api.isCancel && api.isCancel(error)) {
        return;
      }
      console.error('Error fetching songs:', error);
    } finally {
      // Only update loading state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchSongs(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(normalizeSongSearchQuery(e.target.value));
  };

  const handleVerificationChange = (option) => {
    setVerificationState(option?.value || null);
  };
  
  const handleSortChange = (option) => {
    setSortBy(option?.value || 'NAME_ASC');
  };
  
  const sortOptions = [
    { value: 'NAME_ASC', label: t('songList.sort.nameAsc') },
    { value: 'NAME_DESC', label: t('songList.sort.nameDesc') },
    { value: 'ID_ASC', label: t('songList.sort.idAsc') },
    { value: 'ID_DESC', label: t('songList.sort.idDesc') }
  ];

  const verificationStateOptions = [
    { value: null, label: t('verification.all', { ns: 'common' }) },
    { value: 'unverified', label: t('verification.unverified', { ns: 'common' }) },
    { value: 'pending', label: t('verification.pending', { ns: 'common' }) },
    { value: 'declined', label: t('verification.declined', { ns: 'common' }) },
    { value: 'mostly_declined', label: t('verification.mostly_declined', { ns: 'common' }) },
    { value: 'mostly_allowed', label: t('verification.mostly_allowed', { ns: 'common' }) },
    { value: 'allowed', label: t('verification.allowed', { ns: 'common' }) }
  ];

  return (
    <div className="song-list-page">
      <MetaTags {...pageMeta} />

      <div className="song-list-container page-content">
        <h1>{t('songList.title')}</h1>

        <div className="song-list-controls">
          <div className="search-container">
            <input
              type="text"
              autoComplete='off'
              className="search-input"
              placeholder={t('songList.search.placeholder')}
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-container">
            <CustomSelect
              options={verificationStateOptions}
              value={verificationStateOptions.find(opt => opt.value === verificationState) || verificationStateOptions[0]}
              onChange={handleVerificationChange}
              label={t('songList.filter.verificationState')}
              width="12rem"
            />
          </div>

          <div className="sort-container">
            <CustomSelect
              options={sortOptions}
              value={sortOptions.find(opt => opt.value === sortBy) || sortOptions[0]}
              onChange={handleSortChange}
              label={t('songList.sort.label')}
              width="12rem"
            />
          </div>
        </div>

        {totalSongs != null && (
          <span className="total-search-results">
            {t('totalResults', { ns: 'common', count: totalSongs })}
          </span>
        )}

        {loading && songs.length === 0 ? (
          <div className="loader-shell loader-shell--tall">
            <div className="loader loader-relative" />
          </div>
        ) : songs.length > 0 ? (
          <VirtualList
            style={{ paddingBottom: "7rem", minHeight: "50vh" }}
            items={songs}
            loadMore={handleLoadMore}
            hasMore={hasMore}
            overscan={800}
            grid
            listClassName="song-cards-grid"
            loader={<div className="loader loader-relative"></div>}
            endMessage={
              songs.length > 0 && (
                <p className="end-message">
                  <b>{t('songList.infScroll.end')}</b>
                </p>
              )
            }
            renderItem={(song) => (
              <Link
                className="song-card"
                to={`/songs/${song.id}`}
              >
                <div className="song-card-content">
                  <h3 className="song-card-name">{song.name}</h3>
                  {song.aliases && song.aliases.length > 0 && (
                    <div className="song-card-aliases">
                      {song.aliases.slice(0, 2).map((alias) => (
                        <span key={alias.id} className="alias-tag">{alias.alias}</span>
                      ))}
                      {song.aliases.length > 2 && (
                        <span className="alias-more">+{song.aliases.length - 2}</span>
                      )}
                    </div>
                  )}
                  {song.credits && song.credits.length > 0 && (
                    <div className="song-card-artists">
                      {song.credits.slice(0, 2).map((credit) => (
                        <div key={credit.id} className="artist-item">
                          {credit.artist?.avatarUrl && (
                            <img
                              src={credit.artist.avatarUrl}
                              alt={credit.artist.name}
                              className="artist-avatar-small"
                            />
                          )}
                          <span className="artist-name">{credit.artist?.name || 'Unknown'}</span>
                        </div>
                      ))}
                      {song.credits.length > 2 && (
                        <span className="artist-more">+{song.credits.length - 2}</span>
                      )}
                    </div>
                  )}
                  <div className="song-card-verification">
                    <span className={getVerificationClass(song.verificationState)}>
                      {t(`verification.${song.verificationState}`, { ns: 'common' })}
                    </span>
                  </div>
                </div>
              </Link>
            )}
            computeItemKey={(index, song) => song?.id ?? index}
          />
        ) : (
          <div className="no-songs">
            <p>{t('songList.noSongs')}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default SongListPage;

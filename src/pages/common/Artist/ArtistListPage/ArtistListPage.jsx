import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { CustomSelect } from '@/components/common/selectors';
import { useArtistContext } from '@/contexts/ArtistContext';
import './artistListPage.css';
import { getVerificationClass } from '@/utils/Utility';

const ArtistListPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const navigate = useNavigate();
  const currentUrl = window.location.origin + location.pathname;
  const {
    searchQuery,
    sortBy,
    verificationState,
    setSearchQuery,
    setSortBy,
    setVerificationState
  } = useArtistContext();

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Cancel token ref for race condition prevention
  const abortControllerRef = useRef(null);

  useEffect(() => {
    fetchArtists(true);
    
    // Cleanup: abort any pending requests when component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchQuery, sortBy, verificationState]);

  const fetchArtists = async (reset = false) => {
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
        setArtists([]);
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
      
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/artists`, {
        params,
        signal: abortController.signal
      });
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      const data = response.data;
      const newArtists = data.artists || [];
      
      if (reset) {
        setArtists(newArtists);
      } else {
        setArtists(prev => [...prev, ...newArtists]);
      }

      // If no artists returned, there's no more data regardless of hasMore flag
      setHasMore(newArtists.length > 0 && (data.hasMore || false));
      setPage(currentPage + 1);
    } catch (error) {
      // Don't show error if request was cancelled
      if (api.isCancel && api.isCancel(error)) {
        return;
      }
      console.error('Error fetching artists:', error);
    } finally {
      // Only update loading state if request wasn't aborted
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchArtists(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleVerificationChange = (option) => {
    setVerificationState(option?.value || null);
  };
  
  const handleSortChange = (option) => {
    setSortBy(option?.value || 'NAME_ASC');
  };

  const sortOptions = [
    { value: 'NAME_ASC', label: t('artistList.sort.nameAsc') },
    { value: 'NAME_DESC', label: t('artistList.sort.nameDesc') },
    { value: 'ID_ASC', label: t('artistList.sort.idAsc') },
    { value: 'ID_DESC', label: t('artistList.sort.idDesc') }
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
    <div className="artist-list-page">
      <MetaTags
        title={t('artistList.meta.title')}
        description={t('artistList.meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />

      <div className="artist-list-container">
        <h1>{t('artistList.title')}</h1>

        <div className="artist-list-controls">
          <div className="search-container">
            <input
              type="text"
              autoComplete='off'
              className="search-input"
              placeholder={t('artistList.search.placeholder')}
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-container">
            <CustomSelect
              options={verificationStateOptions}
              value={verificationStateOptions.find(opt => opt.value === verificationState) || verificationStateOptions[0]}
              onChange={handleVerificationChange}
              label={t('artistList.filter.verificationState')}
              width="12rem"
            />
          </div>

          <div className="sort-container">
            <CustomSelect
              options={sortOptions}
              value={sortOptions.find(opt => opt.value === sortBy) || sortOptions[0]}
              onChange={handleSortChange}
              label={t('artistList.sort.label')}
              width="12rem"
            />
          </div>
        </div>

        {loading && artists.length === 0 ? (
          <div className="loader loader-level-page"></div>
        ) : (
          <InfiniteScroll
            style={{ paddingBottom: "7rem", minHeight: "100vh", overflow: "visible" }}
            dataLength={artists.length}
            next={handleLoadMore}
            hasMore={hasMore}
            loader={<div className="loader loader-level-page"></div>}
            endMessage={
              artists.length > 0 && (
                <p className="end-message">
                  <b>{t('artistList.infScroll.end')}</b>
                </p>
              )
            }
          >
            <div className="artist-cards-grid">
              {artists.map((artist) => (
                <div
                  key={artist.id}
                  className="artist-card"
                  onClick={() => navigate(`/artists/${artist.id}`)}
                >
                  {artist.avatarUrl && (
                    <div className="artist-card-avatar">
                      <img src={artist.avatarUrl} alt={artist.name} />
                    </div>
                  )}
                  <div className="artist-card-content">
                    <h3 className="artist-card-name">{artist.name}</h3>
                    {artist.aliases && artist.aliases.length > 0 && (
                      <div className="artist-card-aliases">
                        {artist.aliases.slice(0, 2).map((alias) => (
                          <span key={alias.id} className="alias-tag">{alias.alias}</span>
                        ))}
                        {artist.aliases.length > 2 && (
                          <span className="alias-more">+{artist.aliases.length - 2}</span>
                        )}
                      </div>
                    )}
                    <div className="artist-card-verification">
                      <span className={getVerificationClass(artist.verificationState)}>
                        {t(`verification.${artist.verificationState}`, { ns: 'common' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </InfiniteScroll>
        )}

        {!loading && artists.length === 0 && (
          <div className="no-artists">
            <p>{t('artistList.noArtists')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistListPage;

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { CustomSelect } from '@/components/common/selectors';
import './artistListPage.css';
import { getVerificationClass } from '@/utils/Utility';

const ArtistListPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const tArtist = (key, params = {}) => t(`artistList.${key}`, params);
  const navigate = useNavigate();
  const currentUrl = window.location.origin + location.pathname;

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME_ASC');
  const [verificationState, setVerificationState] = useState(null);

  useEffect(() => {
    fetchArtists(true);
  }, [searchQuery, sortBy, verificationState]);

  const fetchArtists = async (reset = false) => {
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
        params
      });

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
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
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

  const sortOptions = [
    { value: 'NAME_ASC', label: tArtist('sort.nameAsc') },
    { value: 'NAME_DESC', label: tArtist('sort.nameDesc') },
    { value: 'ID_ASC', label: tArtist('sort.idAsc') },
    { value: 'ID_DESC', label: tArtist('sort.idDesc') }
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
        title={tArtist('meta.title')}
        description={tArtist('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />

      <div className="artist-list-container">
        <h1>{tArtist('title')}</h1>

        <div className="artist-list-controls">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder={tArtist('search.placeholder')}
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="filter-container">
            <CustomSelect
              options={verificationStateOptions}
              value={verificationStateOptions.find(opt => opt.value === verificationState) || verificationStateOptions[0]}
              onChange={(option) => setVerificationState(option?.value || null)}
              label={tArtist('filter.verificationState')}
              width="12rem"
            />
          </div>

          <div className="sort-container">
            <CustomSelect
              options={sortOptions}
              value={sortOptions.find(opt => opt.value === sortBy) || sortOptions[0]}
              onChange={(option) => setSortBy(option?.value || 'NAME_ASC')}
              label={tArtist('sort.label')}
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
                  <b>{tArtist('infScroll.end')}</b>
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
            <p>{tArtist('noArtists')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistListPage;

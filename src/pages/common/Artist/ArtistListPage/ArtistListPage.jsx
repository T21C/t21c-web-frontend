import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import './artistListPage.css';

const ArtistListPage = () => {
  const { t } = useTranslation('pages');
  const tArtist = (key, params = {}) => t(`artistList.${key}`, params);
  const navigate = useNavigate();
  const currentUrl = window.location.origin + location.pathname;

  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME_ASC');

  useEffect(() => {
    fetchArtists(true);
  }, [searchQuery, sortBy]);

  const fetchArtists = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setArtists([]);
      }

      const currentPage = reset ? 1 : page;
      const response = await api.get(`${import.meta.env.VITE_API_URL}/artists`, {
        params: {
          page: currentPage,
          limit: 50,
          search: searchQuery,
          sort: sortBy
        }
      });

      const data = response.data;
      const newArtists = data.artists || [];
      
      if (reset) {
        setArtists(newArtists);
      } else {
        setArtists(prev => [...prev, ...newArtists]);
      }

      setHasMore(data.hasMore || false);
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

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const getVerificationClass = (state) => {
    return `verification-chip ${state || 'unverified'}`;
  };

  const verificationStateLabels = {
    unverified: tArtist('verification.unverified'),
    pending: tArtist('verification.pending'),
    declined: tArtist('verification.declined'),
    'mostly declined': tArtist('verification.mostlyDeclined'),
    'mostly allowed': tArtist('verification.mostlyAllowed'),
    allowed: tArtist('verification.allowed')
  };

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

          <div className="sort-container">
            <label>{tArtist('sort.label')}</label>
            <select value={sortBy} onChange={handleSortChange} className="sort-select">
              <option value="NAME_ASC">{tArtist('sort.nameAsc')}</option>
              <option value="NAME_DESC">{tArtist('sort.nameDesc')}</option>
              <option value="ID_ASC">{tArtist('sort.idAsc')}</option>
              <option value="ID_DESC">{tArtist('sort.idDesc')}</option>
            </select>
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
                        {verificationStateLabels[artist.verificationState] || verificationStateLabels.unverified}
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

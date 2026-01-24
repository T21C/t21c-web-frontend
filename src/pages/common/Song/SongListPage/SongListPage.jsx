import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import './songListPage.css';

const SongListPage = () => {
  const { t } = useTranslation('pages');
  const tSong = (key, params = {}) => t(`songList.${key}`, params);
  const navigate = useNavigate();
  const currentUrl = window.location.origin + location.pathname;

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME_ASC');

  useEffect(() => {
    fetchSongs(true);
  }, [searchQuery, sortBy]);

  const fetchSongs = async (reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
        setSongs([]);
      }

      const currentPage = reset ? 1 : page;
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/songs`, {
        params: {
          page: currentPage,
          limit: 50,
          search: searchQuery,
          sort: sortBy
        }
      });

      const data = response.data;
      const newSongs = data.songs || [];
      
      if (reset) {
        setSongs(newSongs);
      } else {
        setSongs(prev => [...prev, ...newSongs]);
      }

      setHasMore(data.hasMore || false);
      setPage(currentPage + 1);
    } catch (error) {
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchSongs(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const getVerificationClass = (state) => {
    return `verification-chip ${state || 'pending'}`;
  };

  const verificationStateLabels = {
    declined: tSong('verification.declined'),
    pending: tSong('verification.pending'),
    conditional: tSong('verification.conditional'),
    ysmod_only: tSong('verification.ysmodOnly'),
    allowed: tSong('verification.allowed')
  };

  return (
    <div className="song-list-page">
      <MetaTags
        title={tSong('meta.title')}
        description={tSong('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />

      <div className="song-list-container">
        <h1>{tSong('title')}</h1>

        <div className="song-list-controls">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder={tSong('search.placeholder')}
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>

          <div className="sort-container">
            <label>{tSong('sort.label')}</label>
            <select value={sortBy} onChange={handleSortChange} className="sort-select">
              <option value="NAME_ASC">{tSong('sort.nameAsc')}</option>
              <option value="NAME_DESC">{tSong('sort.nameDesc')}</option>
              <option value="ID_ASC">{tSong('sort.idAsc')}</option>
              <option value="ID_DESC">{tSong('sort.idDesc')}</option>
            </select>
          </div>
        </div>

        {loading && songs.length === 0 ? (
          <div className="loader loader-level-page"></div>
        ) : (
          <InfiniteScroll
            style={{ paddingBottom: "7rem", minHeight: "100vh", overflow: "visible" }}
            dataLength={songs.length}
            next={handleLoadMore}
            hasMore={hasMore}
            loader={<div className="loader loader-level-page"></div>}
            endMessage={
              songs.length > 0 && (
                <p className="end-message">
                  <b>{tSong('infScroll.end')}</b>
                </p>
              )
            }
          >
            <div className="song-cards-grid">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="song-card"
                  onClick={() => navigate(`/songs/${song.id}`)}
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
                        {verificationStateLabels[song.verificationState] || verificationStateLabels.pending}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </InfiniteScroll>
        )}

        {!loading && songs.length === 0 && (
          <div className="no-songs">
            <p>{tSong('noSongs')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongListPage;

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import './songPopup.css';
import { ExternalLinkIcon } from '@/components/common/icons';

export const SongPopup = ({ song, onClose }) => {
  const { t } = useTranslation('components');
  const tSong = (key, params) => t(`songPopup.${key}`, params) || key;
  const popupRef = useRef(null);
  const navigate = useNavigate();
  const [songData, setSongData] = useState(song);
  const [loading, setLoading] = useState(!song);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (event.button !== 0 && event.button !== undefined) {
        return;
      }
      
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        const isReactSelectMenu = event.target.closest('.custom-select-menu') || 
                                  event.target.closest('[class*="react-select"]') ||
                                  event.target.closest('[id*="react-select"]');
        if (!isReactSelectMenu) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const fetchSongData = async () => {
      if (song?.id && !song.aliases) {
        try {
          setLoading(true);
          const response = await api.get(`${import.meta.env.VITE_API_URL}/songs/${song.id}`);
          setSongData(response.data);
        } catch (error) {
          console.error('Error fetching song data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setSongData(song);
        setLoading(false);
      }
    };

    fetchSongData();
  }, [song]);

  if (loading) {
    return (
      <div className="popup-overlay">
        <div className="song-popup" ref={popupRef}>
          <div className="song-popup-loading">{tSong('loading')}</div>
        </div>
      </div>
    );
  }

  if (!songData) {
    return null;
  }

  const verificationStateLabels = {
    unverified: tSong('verification.unverified'),
    pending: tSong('verification.pending'),
    verified: tSong('verification.verified')
  };

  const getVerificationClass = (state) => {
    return `verification-chip ${state || 'unverified'}`;
  };

  const handleArtistClick = (artistId) => {
    onClose();
    navigate(`/artists/${artistId}`);
  };

  return (
    <div className="popup-overlay">
      <div className="song-popup" ref={popupRef}>
        <div className="song-popup-header">
          <h2 className="song-popup-title">{songData.name}</h2>
          <button className="song-popup-close" onClick={onClose}>×</button>
        </div>

        <div className="song-popup-content">
          {/* Verification State */}
          <div className="song-popup-section">
            <div className="song-popup-verification">
              <span className={getVerificationClass(songData.verificationState)}>
                {verificationStateLabels[songData.verificationState] || verificationStateLabels.unverified}
              </span>
            </div>
          </div>

          {/* Aliases */}
          {songData.aliases && songData.aliases.length > 0 && (
            <div className="song-popup-section">
              <h3 className="song-popup-section-title">{tSong('aliases.title')}</h3>
              <div className="song-popup-aliases">
                {songData.aliases.map((alias) => (
                  <span key={alias.id} className="song-popup-alias-tag">
                    {alias.alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {songData.links && songData.links.length > 0 && (
            <div className="song-popup-section">
              <h3 className="song-popup-section-title">{tSong('links.title')}</h3>
              <div className="song-popup-links">
                {songData.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="song-popup-link"
                  >
                    {link.link}
                    <ExternalLinkIcon size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Artist Credits */}
          {songData.credits && songData.credits.length > 0 && (
            <div className="song-popup-section">
              <h3 className="song-popup-section-title">{tSong('artists.title')}</h3>
              <div className="song-popup-artists">
                {songData.credits.map((credit) => (
                  <div
                    key={credit.id}
                    className="song-popup-artist-item"
                    onClick={() => credit.artist && handleArtistClick(credit.artist.id)}
                  >
                    {credit.artist?.avatarUrl && (
                      <img
                        src={credit.artist.avatarUrl}
                        alt={credit.artist.name}
                        className="song-popup-artist-avatar"
                      />
                    )}
                    <div className="song-popup-artist-info">
                      <span className="song-popup-artist-name">{credit.artist?.name || 'Unknown'}</span>
                      {credit.role && (
                        <span className="song-popup-artist-role">{credit.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Full Details Link */}
          <div className="song-popup-section">
            <button
              className="song-popup-view-details"
              onClick={() => {
                onClose();
                navigate(`/songs/${songData.id}`);
              }}
            >
              {tSong('viewDetails')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SongPopup;

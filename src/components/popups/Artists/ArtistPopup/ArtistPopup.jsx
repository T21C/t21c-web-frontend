import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import './artistPopup.css';
import { ExternalLinkIcon } from '@/components/common/icons';

export const ArtistPopup = ({ artist, onClose }) => {
  const { t } = useTranslation('components');
  const tArtist = (key, params) => t(`artistPopup.${key}`, params) || key;
  const popupRef = useRef(null);
  const navigate = useNavigate();
  const [artistData, setArtistData] = useState(artist);
  const [loading, setLoading] = useState(!artist);

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
    const fetchArtistData = async () => {
      if (artist?.id && !artist.aliases) {
        try {
          setLoading(true);
          const response = await api.get(`${import.meta.env.VITE_API_URL}/artists/${artist.id}`);
          setArtistData(response.data);
        } catch (error) {
          console.error('Error fetching artist data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setArtistData(artist);
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [artist]);

  if (loading) {
    return (
      <div className="popup-overlay">
        <div className="artist-popup" ref={popupRef}>
          <div className="artist-popup-loading">{tArtist('loading')}</div>
        </div>
      </div>
    );
  }

  if (!artistData) {
    return null;
  }

  const verificationStateLabels = {
    unverified: tArtist('verification.unverified'),
    pending: tArtist('verification.pending'),
    declined: tArtist('verification.declined'),
    'mostly declined': tArtist('verification.mostlyDeclined'),
    'mostly allowed': tArtist('verification.mostlyAllowed'),
    allowed: tArtist('verification.allowed')
  };

  const getVerificationClass = (state) => {
    return `verification-chip ${state || 'unverified'}`;
  };

  return (
    <div className="popup-overlay">
      <div className="artist-popup" ref={popupRef}>
        <div className="artist-popup-header">
          <div className="artist-popup-header-content">
            {artistData.avatarUrl && (
              <img
                src={artistData.avatarUrl}
                alt={artistData.name}
                className="artist-popup-avatar"
              />
            )}
            <h2 className="artist-popup-title">{artistData.name}</h2>
          </div>
          <button className="artist-popup-close" onClick={onClose}>×</button>
        </div>

        <div className="artist-popup-content">
          {/* Verification State */}
          <div className="artist-popup-section">
            <div className="artist-popup-verification">
              <span className={getVerificationClass(artistData.verificationState)}>
                {verificationStateLabels[artistData.verificationState] || verificationStateLabels.unverified}
              </span>
            </div>
          </div>

          {/* Aliases */}
          {artistData.aliases && artistData.aliases.length > 0 && (
            <div className="artist-popup-section">
              <h3 className="artist-popup-section-title">{tArtist('aliases.title')}</h3>
              <div className="artist-popup-aliases">
                {artistData.aliases.map((alias) => (
                  <span key={alias.id} className="artist-popup-alias-tag">
                    {alias.alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {artistData.links && artistData.links.length > 0 && (
            <div className="artist-popup-section">
              <h3 className="artist-popup-section-title">{tArtist('links.title')}</h3>
              <div className="artist-popup-links">
                {artistData.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="artist-popup-link"
                  >
                    {link.link}
                    <ExternalLinkIcon size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* View Full Details Link */}
          <div className="artist-popup-section">
            <button
              className="artist-popup-view-details"
              onClick={() => {
                onClose();
                navigate(`/artists/${artistData.id}`);
              }}
            >
              {tArtist('viewDetails')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtistPopup;

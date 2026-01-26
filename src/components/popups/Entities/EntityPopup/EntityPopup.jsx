import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '@/utils/api';
import './entityPopup.css';
import { ExternalLinkIcon } from '@/components/common/icons';
import { getVerificationClass } from '@/utils/Utility';

export const EntityPopup = ({ artist, song, onClose, type = 'artist' }) => {
  const { t } = useTranslation(['components', 'common']);
  const tEntity = (key, params) => {
    const translationKey = type === 'artist' ? `artistPopup.${key}` : `songPopup.${key}`;
    return t(translationKey, params) || key;
  };
  const popupRef = useRef(null);
  const navigate = useNavigate();
  const [entityData, setEntityData] = useState(artist || song);
  const [loading, setLoading] = useState(!entityData);

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
    const fetchEntityData = async () => {
      const entity = type === 'artist' ? artist : song;
      if (entity?.id && !entity.aliases) {
        try {
          setLoading(true);
          const endpoint = type === 'artist' 
            ? `${import.meta.env.VITE_API_URL}/v2/database/artists/${entity.id}`
            : `${import.meta.env.VITE_API_URL}/v2/database/songs/${entity.id}`;
          const response = await api.get(endpoint);
          setEntityData(response.data);
        } catch (error) {
          console.error(`Error fetching ${type} data:`, error);
        } finally {
          setLoading(false);
        }
      } else {
        setEntityData(entity);
        setLoading(false);
      }
    };

    fetchEntityData();
  }, [artist, song, type]);

  if (loading) {
    return (
      <div className="entity-popup-overlay">
        <div className="entity-popup" ref={popupRef}>
          <div className="popup-loading">{tEntity('loading')}</div>
        </div>
      </div>
    );
  }

  if (!entityData) {
    return null;
  }

  const verificationStateLabels = type === 'artist' 
    ? {
        allowed: t('verification.allowed', { ns: 'common' }),
        'mostly_allowed': t('verification.mostlyAllowed', { ns: 'common' }),
        'mostly_declined': t('verification.mostlyDeclined', { ns: 'common' }),
        declined: t('verification.declined', { ns: 'common' }),
        'ysmod_only': t('verification.ysmodOnly', { ns: 'common' }),
        pending: t('verification.pending', { ns: 'common' }),
        unverified: t('verification.unverified', { ns: 'common' })
      }
    : {
        allowed: t('verification.allowed', { ns: 'common' }),
        'ysmod_only': t('verification.ysmodOnly', { ns: 'common' }),
        conditional: t('verification.conditional', { ns: 'common' }),
        pending: t('verification.pending', { ns: 'common' }),
        declined: t('verification.declined', { ns: 'common' })
      };

  const handleArtistClick = (artistId) => {
    onClose();
    navigate(`/artists/${artistId}`);
  };

  const handleViewDetails = () => {
    onClose();
    if (type === 'artist') {
      navigate(`/artists/${entityData.id}`);
    } else {
      navigate(`/songs/${entityData.id}`);
    }
  };

  return (
    <div className="entity-popup-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="entity-popup" ref={popupRef}>
        <div className="popup-header">
          <div className="popup-header-content">
            {type === 'artist' && entityData.avatarUrl && (
              <img
                src={entityData.avatarUrl}
                alt={entityData.name}
                className="popup-avatar"
              />
            )}
            <h2 className="popup-title">{entityData.name}</h2>
          </div>
          <button className="popup-close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          {/* Verification State */}
          <div className="popup-section">
            <div className="popup-verification">
              <span className={getVerificationClass(entityData.verificationState)}>
                {verificationStateLabels[entityData.verificationState] || (type === 'song' ? verificationStateLabels.pending : verificationStateLabels.unverified)}
              </span>
            </div>
          </div>

          {/* Aliases */}
          {entityData.aliases && entityData.aliases.length > 0 && (
            <div className="popup-section">
              <h3 className="popup-section-title">{tEntity('aliases.title')}</h3>
              <div className="popup-aliases">
                {entityData.aliases.map((alias) => (
                  <span key={alias.id} className="popup-alias-tag">
                    {alias.alias}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {entityData.links && entityData.links.length > 0 && (
            <div className="popup-section">
              <h3 className="popup-section-title">{tEntity('links.title')}</h3>
              <div className="popup-links">
                {entityData.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="popup-link"
                  >
                    {link.link}
                    <ExternalLinkIcon size={14} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Artist Credits (Songs only) */}
          {type === 'song' && entityData.credits && entityData.credits.length > 0 && (
            <div className="popup-section">
              <h3 className="popup-section-title">{tEntity('artists.title')}</h3>
              <div className="popup-artists">
                {entityData.credits.map((credit) => (
                  <div
                    key={credit.id}
                    className="popup-artist-item"
                    onClick={() => credit.artist && handleArtistClick(credit.artist.id)}
                  >
                    {credit.artist?.avatarUrl && (
                      <img
                        src={credit.artist.avatarUrl}
                        alt={credit.artist.name}
                        className="popup-artist-avatar"
                      />
                    )}
                    <div className="popup-artist-info">
                      <span className="popup-artist-name">{credit.artist?.name || 'Unknown'}</span>
                      {credit.role && (
                        <span className="popup-artist-role">{credit.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View Full Details Link */}
          <div className="popup-section">
            <button
              className="popup-view-details"
              onClick={handleViewDetails}
            >
              {tEntity('viewDetails')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EntityPopup;

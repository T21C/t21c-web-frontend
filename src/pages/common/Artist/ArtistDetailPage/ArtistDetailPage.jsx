import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { EvidenceGalleryPopup } from '@/components/popups';
import { ExternalLinkIcon } from '@/components/common/icons';
import './artistDetailPage.css';

const ArtistDetailPage = () => {
  const { t } = useTranslation('pages');
  const tArtist = (key, params = {}) => t(`artistDetail.${key}`, params);
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUrl = window.location.origin + location.pathname;

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);

  useEffect(() => {
    fetchArtist();
  }, [id]);

  const fetchArtist = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${import.meta.env.VITE_API_URL}/artists/${id}`);
      setArtist(response.data);
    } catch (error) {
      console.error('Error fetching artist:', error);
      if (error.response?.status === 404) {
        setError('notFound');
      } else {
        setError('loadFailed');
      }
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="artist-detail-page">
        <div className="loader loader-level-detail"></div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="artist-detail-page">
        <div className="error-container">
          <h2>{tArtist(`errors.${error || 'notFound'}`)}</h2>
          <button onClick={() => navigate('/artists')} className="back-button">
            {tArtist('backToList')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-detail-page">
      <MetaTags
        title={`${artist.name} - ${tArtist('meta.title')}`}
        description={tArtist('meta.description', { name: artist.name })}
        url={currentUrl}
        image={artist.avatarUrl || "/og-image.jpg"}
        type="article"
      />

      <div className="artist-detail-container">
        <div className="artist-header">
          {artist.avatarUrl && (
            <div className="artist-avatar-large">
              <img src={artist.avatarUrl} alt={artist.name} />
            </div>
          )}
          <div className="artist-header-content">
            <h1>{artist.name}</h1>
            <div className="artist-verification">
              <span className={getVerificationClass(artist.verificationState)}>
                {verificationStateLabels[artist.verificationState] || verificationStateLabels.unverified}
              </span>
            </div>
          </div>
        </div>

        <div className="artist-content">
          {/* Aliases */}
          {artist.aliases && artist.aliases.length > 0 && (
            <div className="artist-section">
              <h2>{tArtist('sections.aliases')}</h2>
              <div className="aliases-list">
                {artist.aliases.map((alias) => (
                  <span key={alias.id} className="alias-tag">{alias.alias}</span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {artist.links && artist.links.length > 0 && (
            <div className="artist-section">
              <h2>{tArtist('sections.links')}</h2>
              {artist.links.length > 0 && (
                <div className="links-list">
                {artist.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-item"
                  >
                    {link.link}
                    <ExternalLinkIcon size={14} />
                  </a>
                ))}
                </div>
              )}
            </div>
          )}

          {/* Songs */}
          {artist.songCredits && artist.songCredits.length > 0 && (
            <div className="artist-section">
              <h2>{tArtist('sections.songs')}</h2>
              <div className="songs-list">
                {artist.songCredits.map((credit) => (
                  <div
                    key={credit.id}
                    className="song-item"
                    onClick={() => credit.song && navigate(`/songs/${credit.song.id}`)}
                  >
                    <span className="song-name">{credit.song?.name || 'Unknown'}</span>
                    {credit.role && (
                      <span className="song-role">{credit.role}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence */}
          {artist.evidences && artist.evidences.length > 0 && (
            <div className="artist-section">
              <h2>{tArtist('sections.evidence')}</h2>
              <div className="evidence-preview">
                {artist.evidences.slice(0, 4).map((evidence) => (
                  <img
                    key={evidence.id}
                    src={evidence.link}
                    alt={`Evidence ${evidence.id}`}
                    className="evidence-thumbnail"
                    onClick={() => setShowEvidenceGallery(true)}
                  />
                ))}
                {artist.evidences.length > 4 && (
                  <div
                    className="evidence-more"
                    onClick={() => setShowEvidenceGallery(true)}
                  >
                    +{artist.evidences.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Levels */}
          {artist.levels && artist.levels.length > 0 && (
            <div className="artist-section">
              <h2>{tArtist('sections.levels')}</h2>
              <div className="levels-list">
                {artist.levels.map((level) => (
                  <div
                    key={level.id}
                    className="level-item"
                    onClick={() => navigate(`/levels/${level.id}`)}
                  >
                    {(() => {
                      const songName = level.songObject?.name || level.song || '';
                      const artistName = level.artistObject?.name || level.artist || '';
                      return songName || artistName ? `${songName} - ${artistName}` : `Level ${level.id}`;
                    })()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEvidenceGallery && artist.evidences && (
        <EvidenceGalleryPopup
          evidence={artist.evidences}
          onClose={() => setShowEvidenceGallery(false)}
        />
      )}
    </div>
  );
};

export default ArtistDetailPage;

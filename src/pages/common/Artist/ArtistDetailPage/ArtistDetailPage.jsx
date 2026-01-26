import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { getVerificationClass, isImageUrl } from '@/utils/Utility';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { EvidenceGalleryPopup, EntityActionPopup } from '@/components/popups';
import { EditIcon, ExternalLinkIcon } from '@/components/common/icons';
import './artistDetailPage.css';

const ArtistDetailPage = () => {
  const { t } = useTranslation('pages');
  const tArtist = (key, params = {}) => t(`artistDetail.${key}`, params);
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUrl = window.location.origin + location.pathname;
  const { user } = useAuth();

  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);

  const isSuperAdmin = user && hasFlag(user, permissionFlags.SUPER_ADMIN);

  useEffect(() => {
    fetchArtist();
  }, [id]);

  const fetchArtist = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/artists/${id}`);
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

  const verificationStateLabels = {
    unverified: t('verification.unverified', { ns: 'common' }),
    pending: t('verification.pending', { ns: 'common' }),
    'ysmod_only': t('verification.ysmodOnly', { ns: 'common' }),
    declined: t('verification.declined', { ns: 'common' }),
    'mostly_declined': t('verification.mostlyDeclined', { ns: 'common' }),
    'mostly_allowed': t('verification.mostlyAllowed', { ns: 'common' }),
    allowed: t('verification.allowed', { ns: 'common' })
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
            <div className="artist-name-wrapper">
            <h1>{artist.name}</h1>
              {isSuperAdmin && (
                <EditIcon className="edit-icon" size={24} onClick={() => setShowEditPopup(true)} />
              )}
            </div>
            <div className="artist-verification">
              <span className={getVerificationClass(artist.verificationState)}>
                {verificationStateLabels[artist.verificationState] || verificationStateLabels.unverified}
              </span>
            </div>
          </div>
        </div>

        <div className="artist-content">

          {/* Extra Info */}
          {artist.extraInfo && (
            <div className="artist-section">
              <h2>{tArtist('sections.extraInfo')}</h2>
              <div className="extra-info-content">{artist.extraInfo}</div>
            </div>
          )}

          {/* Evidence */}
          {artist.evidences && artist.evidences.length > 0 && (
            <div className="artist-section">
              <h2>{tArtist('sections.evidence')}</h2>
              <div className="evidence-preview">
                {artist.evidences.slice(0, 4).map((evidence) => {
                  const isImage = isImageUrl(evidence.link);
                  const title = evidence.extraInfo 
                    ? `${evidence.link}\n\n${evidence.extraInfo}` 
                    : evidence.link;
                  return isImage ? (
                    <img
                      key={evidence.id}
                      src={evidence.link}
                      alt={`Evidence ${evidence.id}`}
                      className="evidence-thumbnail"
                      onClick={() => setShowEvidenceGallery(true)}
                      title={title}
                    />
                  ) : (
                    <div
                      key={evidence.id}
                      className="evidence-thumbnail evidence-link-thumbnail"
                      onClick={() => setShowEvidenceGallery(true)}
                      title={title}
                    >
                      <span className="evidence-link-icon">🔗</span>
                      {evidence.extraInfo && (
                        <span className="evidence-extra-info-indicator" title={evidence.extraInfo}>ℹ️</span>
                      )}
                    </div>
                  );
                })}
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
        </div>
      </div>

      {showEvidenceGallery && artist.evidences && (
        <EvidenceGalleryPopup
          evidence={artist.evidences}
          onClose={() => setShowEvidenceGallery(false)}
        />
      )}

      {showEditPopup && artist && (
        <EntityActionPopup
          artist={artist}
          onClose={() => setShowEditPopup(false)}
          onUpdate={() => {
            setShowEditPopup(false);
            fetchArtist();
          }}
          type="artist"
        />
      )}
    </div>
  );
};

export default ArtistDetailPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { getVerificationClass, isImageUrl } from '@/utils/Utility';
import api from '@/utils/api';
import { MetaTags } from '@/components/common/display';
import { EvidenceGalleryPopup, EntityActionPopup } from '@/components/popups';
import { EditIcon, ExternalLinkIcon } from '@/components/common/icons';
import { LevelCard } from '@/components/cards';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import './songDetailPage.css';

const SongDetailPage = () => {
  const { t } = useTranslation('pages');
  const tSong = (key, params = {}) => t(`songDetail.${key}`, params);
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUrl = window.location.origin + location.pathname;
  const { difficultyDict, tagsDict } = useDifficultyContext();
  const { user } = useAuth();

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);

  const isSuperAdmin = user && hasFlag(user, permissionFlags.SUPER_ADMIN);

  useEffect(() => {
    fetchSong();
  }, [id]);

  const fetchSong = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/songs/${id}`);
      setSong(response.data);
    } catch (error) {
      console.error('Error fetching song:', error);
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
    allowed: t('verification.allowed', { ns: 'common' }),
    'mostly_allowed': t('verification.mostlyAllowed', { ns: 'common' }),
    'mostly_declined': t('verification.mostlyDeclined', { ns: 'common' }),
    declined: t('verification.declined', { ns: 'common' }),
    'ysmod_only': t('verification.ysmodOnly', { ns: 'common' }),
    pending: t('verification.pending', { ns: 'common' }),
    conditional: t('verification.conditional', { ns: 'common' })
  };

  if (loading) {
    return (
      <div className="song-detail-page">
        <div className="loader loader-level-detail"></div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="song-detail-page">
        <div className="error-container">
          <h2>{tSong(`errors.${error || 'notFound'}`)}</h2>
          <button onClick={() => navigate('/songs')} className="back-button">
            {tSong('backToList')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="song-detail-page">
      <MetaTags
        title={`${song.name} - ${tSong('meta.title')}`}
        description={tSong('meta.description', { name: song.name })}
        url={currentUrl}
        image="/og-image.jpg"
        type="article"
      />

      <div className="song-detail-container">
        <div className="song-header">
          <div className="song-header-content">
            <div className="song-name-wrapper">
              <h1>{song.name}</h1>
              {isSuperAdmin && (
                <EditIcon className="edit-icon" size={24} onClick={() => setShowEditPopup(true)} />
              )}
            </div>
            <div className="song-verification">
              <span className={getVerificationClass(song.verificationState)}>
                {verificationStateLabels[song.verificationState] || verificationStateLabels.pending}
              </span>
            </div>
          </div>
        </div>

        <div className="song-content">
          {/* Aliases */}
          {song.aliases && song.aliases.length > 0 && (
            <div className="song-section">
              <h2>{tSong('sections.aliases')}</h2>
              <div className="aliases-list">
                {song.aliases.map((alias) => (
                  <span key={alias.id} className="alias-tag">{alias.alias}</span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {song.links && song.links.length > 0 && (
            <div className="song-section">
              <h2>{tSong('sections.links')}</h2>
              <div className="links-list">
                {song.links.map((link) => (
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
            </div>
          )}

          {/* Artists */}
          {song.credits && song.credits.length > 0 && (
            <div className="song-section">
              <h2>{tSong('sections.artists')}</h2>
              <div className="artists-list">
                {song.credits.map((credit) => (
                  <div
                    key={credit.id}
                    className="artist-item"
                    onClick={() => credit.artist && navigate(`/artists/${credit.artist.id}`)}
                  >
                    {credit.artist?.avatarUrl && (
                      <img
                        src={credit.artist.avatarUrl}
                        alt={credit.artist.name}
                        className="artist-avatar"
                      />
                    )}
                    <div className="artist-info">
                      <span className="artist-name">{credit.artist?.name || 'Unknown'}</span>
                      {credit.role && (
                        <span className="artist-role">{credit.role}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence */}
          {song.evidences && song.evidences.length > 0 && (
            <div className="song-section">
              <h2>{tSong('sections.evidence')}</h2>
              <div className="evidence-preview">
                {song.evidences.slice(0, 4).map((evidence) => {
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
                {song.evidences.length > 4 && (
                  <div
                    className="evidence-more"
                    onClick={() => setShowEvidenceGallery(true)}
                  >
                    +{song.evidences.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Levels */}
          {song.levels && song.levels.length > 0 && (
            <div className="song-section">
              <h2>{tSong('sections.levels')}</h2>
              <div className="levels-list">
                {song.levels.map((level) => (
                  <LevelCard
                    key={level.id || level._id}
                    level={level}
                    user={user}
                    displayMode="normal"
                    size="medium"
                    showTags={true}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>



      {showEvidenceGallery && song.evidences && (
        <EvidenceGalleryPopup
          evidence={song.evidences}
          onClose={() => setShowEvidenceGallery(false)}
        />
      )}

      {showEditPopup && song && (
        <EntityActionPopup
          song={song}
          onClose={() => setShowEditPopup(false)}
          onUpdate={() => {
            setShowEditPopup(false);
            fetchSong();
          }}
          type="song"
        />
      )}
    </div>
  );
};

export default SongDetailPage;

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './songActionPopup.css';
import { toast } from 'react-hot-toast';
import { ExternalLinkIcon } from '@/components/common/icons';
import { EvidenceGalleryPopup } from '@/components/popups';

export const SongActionPopup = ({ song, onClose, onUpdate }) => {
  const { t } = useTranslation('components');
  const tSong = (key, params = {}) => t(`songActionPopup.${key}`, params) || key;
  const popupRef = useRef(null);

  // Helper function to extract error message, prioritizing details.errors
  const getErrorMessage = (error, defaultMessage) => {
    if (error?.response?.data?.details?.errors && Array.isArray(error.response.data.details.errors) && error.response.data.details.errors.length > 0) {
      return error.response.data.details.errors[0];
    }
    return error?.response?.data?.error || defaultMessage;
  };

  const [mode, setMode] = useState('update'); // update, merge, aliases, links, evidence, credits
  const [name, setName] = useState(song?.name || '');
  const [verificationState, setVerificationState] = useState(song?.verificationState || 'unverified');
  const [aliases, setAliases] = useState(song?.aliases?.map(a => a.alias) || []);
  const [links, setLinks] = useState(song?.links?.map(l => l.link) || []);
  const [evidences, setEvidences] = useState(song?.evidences || []);
  const [credits, setCredits] = useState(song?.credits || []);
  const [newAlias, setNewAlias] = useState('');
  const [newLink, setNewLink] = useState('');
  const [newCreditArtistId, setNewCreditArtistId] = useState('');
  const [newCreditRole, setNewCreditRole] = useState('');
  const [creditSearch, setCreditSearch] = useState('');
  const [availableArtists, setAvailableArtists] = useState([]);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeTargetSearch, setMergeTargetSearch] = useState('');
  const [availableSongs, setAvailableSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]); // Array of {file, preview}
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    const handleClickOutside = (event) => {
      if (event.button !== 0 && event.button !== undefined) return;
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
    let cancelToken;

    const fetchSongs = async () => {
      try {
        if (cancelToken) {
          cancelToken.cancel('New search initiated');
        }

        cancelToken = api.CancelToken.source();
        setAvailableSongs(null);

        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          search: mergeTargetSearch,
          sort: 'NAME_ASC'
        });

        const response = await api.get(`/v2/admin/songs?${params}`, {
          cancelToken: cancelToken.token
        });

        setAvailableSongs((response.data.songs || []).filter(s => s.id !== song?.id));
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching songs:', error);
          setError(tSong('errors.loadSongsFailed'));
          setAvailableSongs([]);
        }
      }
    };

    if (mode === 'merge') {
      fetchSongs();
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [song?.id, mode, mergeTargetSearch]);

  useEffect(() => {
    let cancelToken;

    const fetchArtists = async () => {
      if (!creditSearch.trim()) {
        setAvailableArtists([]);
        return;
      }

      try {
        if (cancelToken) {
          cancelToken.cancel('New search initiated');
        }

        cancelToken = api.CancelToken.source();

        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          search: creditSearch,
          sort: 'NAME_ASC'
        });

        const response = await api.get(`/v2/admin/artists?${params}`, {
          cancelToken: cancelToken.token
        });

        setAvailableArtists(response.data.artists || []);
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching artists:', error);
          setAvailableArtists([]);
        }
      }
    };

    if (mode === 'credits') {
      fetchArtists();
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [mode, creditSearch]);

  const handleAddAlias = () => {
    if (newAlias.trim() && !aliases.includes(newAlias.trim())) {
      setAliases([...aliases, newAlias.trim()]);
      setNewAlias('');
    }
  };

  const handleRemoveAlias = (alias) => {
    setAliases(aliases.filter(a => a !== alias));
  };

  const handleAddLink = () => {
    if (newLink.trim() && !links.includes(newLink.trim())) {
      setLinks([...links, newLink.trim()]);
      setNewLink('');
    }
  };

  const handleRemoveLink = (link) => {
    setLinks(links.filter(l => l !== link));
  };

  const handleAddCredit = async () => {
    if (!newCreditArtistId) {
      toast.error(tSong('errors.selectArtist'));
      return;
    }

    try {
      await api.post(`/v2/admin/songs/${song.id}/credits`, {
        artistId: parseInt(newCreditArtistId),
        role: newCreditRole.trim() || null
      });

      toast.success(tSong('messages.creditAdded'));
      const response = await api.get(`/v2/admin/songs/${song.id}`);
      setCredits(response.data.credits || []);
      setNewCreditArtistId('');
      setNewCreditRole('');
      setCreditSearch('');
    } catch (error) {
      const errorMessage = getErrorMessage(error, tSong('errors.creditFailed'));
      toast.error(errorMessage);
    }
  };

  const handleRemoveCredit = async (creditId) => {
    try {
      await api.delete(`/v2/admin/songs/${song.id}/credits/${creditId}`);
      toast.success(tSong('messages.creditRemoved'));
      setCredits(credits.filter(c => c.id !== creditId));
    } catch (error) {
      const errorMessage = getErrorMessage(error, tSong('errors.deleteFailed'));
      toast.error(errorMessage);
    }
  };

  const handleUpdate = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/v2/admin/songs/${song.id}`, {
        name: name.trim(),
        verificationState
      });

      // Update aliases
      const currentAliases = song.aliases || [];
      
      // Add new aliases
      const newAliases = aliases.filter(a => !currentAliases.some(ca => ca.alias === a));
      for (const alias of newAliases) {
        await api.post(`/v2/admin/songs/${song.id}/aliases`, { alias });
      }

      // Remove deleted aliases
      const removedAliases = currentAliases.filter(ca => !aliases.includes(ca.alias));
      for (const alias of removedAliases) {
        await api.delete(`/v2/admin/songs/${song.id}/aliases/${alias.id}`);
      }

      // Update links
      const currentLinks = song.links || [];
      
      // Add new links
      const newLinks = links.filter(l => !currentLinks.some(cl => cl.link === l));
      for (const link of newLinks) {
        await api.post(`/v2/admin/songs/${song.id}/links`, { link });
      }

      // Remove deleted links
      const removedLinks = currentLinks.filter(cl => !links.includes(cl.link));
      for (const link of removedLinks) {
        await api.delete(`/v2/admin/songs/${song.id}/links/${link.id}`);
      }

      setSuccess(tSong('messages.updated'));
      toast.success(tSong('messages.updated'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (error) {
      const errorMessage = getErrorMessage(error, tSong('errors.updateFailed'));
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeTarget) {
      setError(tSong('errors.selectTarget'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/v2/admin/songs/${song.id}/merge`, {
        targetId: mergeTarget.id
      });

      setSuccess(tSong('messages.merged'));
      toast.success(tSong('messages.merged'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (error) {
      const errorMessage = getErrorMessage(error, tSong('errors.mergeFailed'));
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvidenceFileSelect = (files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (fileArray.length === 0) {
      toast.error(tSong('errors.invalidFileType'));
      return;
    }

    const newEvidenceFiles = fileArray.map(file => {
      const reader = new FileReader();
      const previewPromise = new Promise((resolve) => {
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.readAsDataURL(file);
      });
      return { file, preview: null, previewPromise };
    });

    // Set files immediately, then update with previews
    setEvidenceFiles(prev => [...prev, ...newEvidenceFiles]);
    
    // Update previews as they load
    Promise.all(newEvidenceFiles.map(item => item.previewPromise)).then(previews => {
      setEvidenceFiles(prev => {
        const updated = [...prev];
        let previewIndex = 0;
        return updated.map(item => {
          if (item.preview === null && item.previewPromise) {
            const preview = previews[previewIndex++];
            return { ...item, preview, previewPromise: null };
          }
          return item;
        });
      });
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleEvidenceFileSelect(files);
    }
  };

  const handleAddEvidence = async () => {
    if (evidenceFiles.length === 0) {
      toast.error(tSong('errors.noFile'));
      return;
    }

    setIsUploadingEvidence(true);
    try {
      const formData = new FormData();
      evidenceFiles.forEach(({ file }) => {
        formData.append('evidence', file);
      });

      await api.post(
        `/v2/admin/songs/${song.id}/evidences/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success(tSong('messages.evidenceAdded'));
      // Refresh song data
      const response = await api.get(`/v2/admin/songs/${song.id}`);
      setEvidences(response.data.evidences || []);
      // Clear preview files
      setEvidenceFiles([]);
    } catch (error) {
      const errorMessage = getErrorMessage(error, tSong('errors.evidenceFailed'));
      toast.error(errorMessage);
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const handleRemoveEvidencePreview = (index) => {
    setEvidenceFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleDeleteEvidence = async (evidenceId) => {
    try {
      await api.delete(`/v2/admin/songs/${song.id}/evidences/${evidenceId}`);
      toast.success(tSong('messages.evidenceDeleted'));
      setEvidences(evidences.filter(e => e.id !== evidenceId));
    } catch (error) {
      const errorMessage = getErrorMessage(error, tSong('errors.deleteFailed'));
      toast.error(errorMessage);
    }
  };

  return (
    <div className="song-action-popup-overlay">
      <div className="song-action-popup" ref={popupRef}>
        <div className="popup-header">
          <h2>{tSong('title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'update' ? 'active' : ''}`}
              onClick={() => setMode('update')}
            >
              {tSong('tabs.update')}
            </button>
            <button
              className={`mode-tab ${mode === 'merge' ? 'active' : ''}`}
              onClick={() => setMode('merge')}
            >
              {tSong('tabs.merge')}
            </button>
            <button
              className={`mode-tab ${mode === 'aliases' ? 'active' : ''}`}
              onClick={() => setMode('aliases')}
            >
              {tSong('tabs.aliases')}
            </button>
            <button
              className={`mode-tab ${mode === 'links' ? 'active' : ''}`}
              onClick={() => setMode('links')}
            >
              {tSong('tabs.links')}
            </button>
            <button
              className={`mode-tab ${mode === 'credits' ? 'active' : ''}`}
              onClick={() => setMode('credits')}
            >
              {tSong('tabs.credits')}
            </button>
            <button
              className={`mode-tab ${mode === 'evidence' ? 'active' : ''}`}
              onClick={() => setMode('evidence')}
            >
              {tSong('tabs.evidence')}
            </button>
          </div>

          {mode === 'update' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tSong('form.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{tSong('form.verificationState')}</label>
                <select
                  value={verificationState}
                  onChange={(e) => setVerificationState(e.target.value)}
                >
                  <option value="unverified">{tSong('verification.unverified')}</option>
                  <option value="pending">{tSong('verification.pending')}</option>
                  <option value="verified">{tSong('verification.verified')}</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  className="submit-button"
                  onClick={handleUpdate}
                  disabled={isLoading || !name.trim()}
                >
                  {isLoading ? tSong('buttons.updating') : tSong('buttons.update')}
                </button>
              </div>
            </div>
          )}

          {mode === 'merge' && (
            <div className="form-section">
              <p className="info-text">{tSong('merge.info')}</p>
              <div className="form-group">
                <label>{tSong('merge.search')}</label>
                <input
                  type="text"
                  value={mergeTargetSearch}
                  onChange={(e) => setMergeTargetSearch(e.target.value)}
                  placeholder={tSong('merge.placeholder')}
                />
              </div>

              {availableSongs && availableSongs.length > 0 && (
                <div className="merge-results">
                  {availableSongs.map((target) => (
                    <div
                      key={target.id}
                      className={`merge-item ${mergeTarget?.id === target.id ? 'selected' : ''}`}
                      onClick={() => setMergeTarget(target)}
                    >
                      <span>{target.name} (ID: {target.id})</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="form-actions">
                <button
                  className="submit-button"
                  onClick={handleMerge}
                  disabled={isLoading || !mergeTarget}
                >
                  {isLoading ? tSong('buttons.merging') : tSong('buttons.merge')}
                </button>
              </div>
            </div>
          )}

          {mode === 'aliases' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tSong('aliases.add')}</label>
                <div className="alias-input-group">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAlias();
                      }
                    }}
                    placeholder={tSong('aliases.placeholder')}
                  />
                  <button onClick={handleAddAlias}>{tSong('buttons.add')}</button>
                </div>
              </div>

              <div className="aliases-list">
                {aliases.map((alias, index) => (
                  <div key={index} className="alias-item">
                    <span>{alias}</span>
                    <button onClick={() => handleRemoveAlias(alias)}>×</button>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                  className="submit-button"
                  onClick={handleUpdate}
                  disabled={isLoading}
                >
                  {isLoading ? tSong('buttons.saving') : tSong('buttons.save')}
                </button>
              </div>
            </div>
          )}

          {mode === 'links' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tSong('links.add')}</label>
                <div className="link-input-group">
                  <input
                    type="text"
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLink();
                      }
                    }}
                    placeholder={tSong('links.placeholder')}
                  />
                  <button onClick={handleAddLink}>{tSong('buttons.add')}</button>
                </div>
              </div>

              <div className="links-list">
                {links.map((link, index) => (
                  <div key={index} className="link-item">
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      {link}
                      <ExternalLinkIcon size={14} />
                    </a>
                    <button onClick={() => handleRemoveLink(link)}>×</button>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button
                  className="submit-button"
                  onClick={handleUpdate}
                  disabled={isLoading}
                >
                  {isLoading ? tSong('buttons.saving') : tSong('buttons.save')}
                </button>
              </div>
            </div>
          )}

          {mode === 'credits' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tSong('credits.search')}</label>
                <input
                  type="text"
                  value={creditSearch}
                  onChange={(e) => setCreditSearch(e.target.value)}
                  placeholder={tSong('credits.placeholder')}
                />
              </div>

              {availableArtists.length > 0 && (
                <div className="credits-results">
                  {availableArtists.map((artist) => (
                    <div
                      key={artist.id}
                      className={`credit-item ${newCreditArtistId === artist.id.toString() ? 'selected' : ''}`}
                      onClick={() => setNewCreditArtistId(artist.id.toString())}
                    >
                      {artist.avatarUrl && (
                        <img src={artist.avatarUrl} alt={artist.name} className="credit-avatar" />
                      )}
                      <span>{artist.name} (ID: {artist.id})</span>
                    </div>
                  ))}
                </div>
              )}

              {newCreditArtistId && (
                <div className="form-group">
                  <label>{tSong('credits.role')}</label>
                  <input
                    type="text"
                    value={newCreditRole}
                    onChange={(e) => setNewCreditRole(e.target.value)}
                    placeholder={tSong('credits.rolePlaceholder')}
                  />
                </div>
              )}

              <div className="form-actions">
                <button
                  className="submit-button"
                  onClick={handleAddCredit}
                  disabled={!newCreditArtistId}
                >
                  {tSong('buttons.addCredit')}
                </button>
              </div>

              <div className="credits-list">
                <h4>{tSong('credits.existing')}</h4>
                {credits.map((credit) => (
                  <div key={credit.id} className="credit-item">
                    {credit.artist?.avatarUrl && (
                      <img src={credit.artist.avatarUrl} alt={credit.artist.name} className="credit-avatar" />
                    )}
                    <div className="credit-info">
                      <span>{credit.artist?.name || 'Unknown'}</span>
                      {credit.role && <span className="credit-role">{credit.role}</span>}
                    </div>
                    <button onClick={() => handleRemoveCredit(credit.id)}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mode === 'evidence' && (
            <div className="form-section">
              {/* Drop-in field for uploading new evidence */}
              <div className="evidence-upload-zone">
                <div
                  className={`evidence-drop-zone ${isDragOver ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="evidence-upload-input"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleEvidenceFileSelect(e.target.files);
                      }
                      // Reset input so same file can be selected again
                      e.target.value = '';
                    }}
                  />
                  <label htmlFor="evidence-upload-input" className="evidence-drop-label">
                    <div className="evidence-drop-content">
                      <span className="evidence-drop-icon">📁</span>
                      <span className="evidence-drop-text">
                        {tSong('evidence.dropZoneText')}
                      </span>
                      <span className="evidence-drop-hint">
                        {tSong('evidence.dropZoneHint')}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Show previews of files selected for upload */}
                {evidenceFiles.length > 0 && (
                  <div className="evidence-preview-upload">
                    <div className="evidence-items-container">
                      {evidenceFiles.map((evidenceFile, index) => (
                        <div key={index} className="evidence-item">
                          <img
                            src={evidenceFile.preview || ''}
                            alt="Evidence preview"
                            className={evidenceFile.preview ? '' : 'loading'}
                          />
                          <button onClick={() => handleRemoveEvidencePreview(index)}>
                            {tSong('buttons.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleAddEvidence} 
                      disabled={isUploadingEvidence || evidenceFiles.length === 0}
                      className="upload-evidence-btn"
                    >
                      {isUploadingEvidence ? tSong('buttons.uploading') : tSong('buttons.upload')}
                    </button>
                  </div>
                )}
              </div>

              {/* Show existing uploaded evidence */}
              {evidences.length > 0 && (
                <div className="evidence-preview">
                  <label>{tSong('evidence.existing')}</label>
                  <div className="evidence-items-container">
                    {evidences.map((evidence) => (
                      <div key={evidence.id} className="evidence-item">
                        <img
                          src={evidence.link}
                          alt="Evidence"
                          onClick={() => setShowEvidenceGallery(true)}
                        />
                        <button onClick={() => handleDeleteEvidence(evidence.id)}>
                          {tSong('buttons.delete')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showEvidenceGallery && (
                <EvidenceGalleryPopup
                  evidence={evidences}
                  onClose={() => setShowEvidenceGallery(false)}
                  onDelete={handleDeleteEvidence}
                  canDelete={true}
                />
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    </div>
  );
};

export default SongActionPopup;

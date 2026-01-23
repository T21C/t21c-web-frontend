import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';
import api from '@/utils/api';
import './artistActionPopup.css';
import { toast } from 'react-hot-toast';
import { ExternalLinkIcon } from '@/components/common/icons';
import { EvidenceGalleryPopup } from '@/components/popups';

export const ArtistActionPopup = ({ artist, onClose, onUpdate }) => {
  const { t } = useTranslation('components');
  const tArtist = (key, params = {}) => t(`artistActionPopup.${key}`, params) || key;
  const popupRef = useRef(null);

  const [mode, setMode] = useState('update'); // update, merge, split, aliases, links, evidence
  const [name, setName] = useState(artist?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(artist?.avatarUrl || '');
  const [verificationState, setVerificationState] = useState(artist?.verificationState || 'unverified');
  const [aliases, setAliases] = useState(artist?.aliases?.map(a => a.alias) || []);
  const [links, setLinks] = useState(artist?.links?.map(l => l.link) || []);
  const [evidences, setEvidences] = useState(artist?.evidences || []);
  const [newAlias, setNewAlias] = useState('');
  const [newLink, setNewLink] = useState('');
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeTargetSearch, setMergeTargetSearch] = useState('');
  const [availableArtists, setAvailableArtists] = useState([]);
  const [splitName1, setSplitName1] = useState('');
  const [splitName2, setSplitName2] = useState('');
  const [deleteOriginal, setDeleteOriginal] = useState(false);
  const [existingArtists, setExistingArtists] = useState({existing1: null, existing2: null});
  const [showSplitConfirm, setShowSplitConfirm] = useState(false);
  const [useExisting1, setUseExisting1] = useState(false);
  const [useExisting2, setUseExisting2] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEvidenceGallery, setShowEvidenceGallery] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const verificationStateOptions = [
    { value: 'unverified', label: tArtist('verification.unverified') },
    { value: 'pending', label: tArtist('verification.pending') },
    { value: 'declined', label: tArtist('verification.declined') },
    { value: 'mostly declined', label: tArtist('verification.mostlyDeclined') },
    { value: 'mostly allowed', label: tArtist('verification.mostlyAllowed') },
    { value: 'allowed', label: tArtist('verification.allowed') }
  ];

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

    const fetchArtists = async () => {
      try {
        if (cancelToken) {
          cancelToken.cancel('New search initiated');
        }

        cancelToken = api.CancelToken.source();
        setAvailableArtists(null);

        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          search: mergeTargetSearch,
          sort: 'NAME_ASC'
        });

        const response = await api.get(`/v2/admin/artists?${params}`, {
          cancelToken: cancelToken.token
        });

        setAvailableArtists((response.data.artists || []).filter(a => a.id !== artist?.id));
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching artists:', error);
          setError(tArtist('errors.loadArtistsFailed'));
          setAvailableArtists([]);
        }
      }
    };

    if (mode === 'merge') {
      fetchArtists();
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [artist?.id, mode, mergeTargetSearch]);

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

  const handleUpdate = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.put(`/v2/admin/artists/${artist.id}`, {
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
        verificationState
      });

      // Update aliases
      const currentAliases = artist.aliases || [];
      const aliasIds = currentAliases.map(a => a.id);
      
      // Add new aliases
      const newAliases = aliases.filter(a => !currentAliases.some(ca => ca.alias === a));
      for (const alias of newAliases) {
        await api.post(`/v2/admin/artists/${artist.id}/aliases`, { alias });
      }

      // Remove deleted aliases
      const removedAliases = currentAliases.filter(ca => !aliases.includes(ca.alias));
      for (const alias of removedAliases) {
        await api.delete(`/v2/admin/artists/${artist.id}/aliases/${alias.id}`);
      }

      // Update links
      const currentLinks = artist.links || [];
      
      // Add new links
      const newLinks = links.filter(l => !currentLinks.some(cl => cl.link === l));
      for (const link of newLinks) {
        await api.post(`${import.meta.env.VITE_ADMIN_API}/artists/${artist.id}/links`, { link });
      }

      // Remove deleted links
      const removedLinks = currentLinks.filter(cl => !links.includes(cl.link));
      for (const link of removedLinks) {
        await api.delete(`/v2/admin/artists/${artist.id}/links/${link.id}`);
      }

      setSuccess(tArtist('messages.updated'));
      toast.success(tArtist('messages.updated'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (error) {
      setError(error.response?.data?.error || tArtist('errors.updateFailed'));
      toast.error(error.response?.data?.error || tArtist('errors.updateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!mergeTarget) {
      setError(tArtist('errors.selectTarget'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/v2/admin/artists/${artist.id}/merge`, {
        targetId: mergeTarget.id
      });

      setSuccess(tArtist('messages.merged'));
      toast.success(tArtist('messages.merged'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (error) {
      setError(error.response?.data?.error || tArtist('errors.mergeFailed'));
      toast.error(error.response?.data?.error || tArtist('errors.mergeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplitCheck = async () => {
    if (!splitName1.trim() || !splitName2.trim()) {
      setError(tArtist('errors.bothNamesRequired'));
      return;
    }

    if (splitName1.trim().toLowerCase() === splitName2.trim().toLowerCase()) {
      setError(tArtist('errors.namesMustBeDifferent'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if artists already exist
      const checkResponse = await api.post(`/v2/admin/artists/${artist.id}/split/check`, {
        name1: splitName1.trim(),
        name2: splitName2.trim()
      });

      const {existing1, existing2} = checkResponse.data;

      if (existing1 || existing2) {
        // Show confirmation dialog
        setExistingArtists({existing1, existing2});
        setUseExisting1(false);
        setUseExisting2(false);
        setShowSplitConfirm(true);
        setIsLoading(false);
      } else {
        // No existing artists, proceed directly
        await performSplit(false, false);
      }
    } catch (error) {
      setError(error.response?.data?.error || tArtist('errors.checkFailed'));
      toast.error(error.response?.data?.error || tArtist('errors.checkFailed'));
      setIsLoading(false);
    }
  };

  const performSplit = async (useExisting1Flag, useExisting2Flag) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/v2/admin/artists/${artist.id}/split`, {
        name1: splitName1.trim(),
        name2: splitName2.trim(),
        deleteOriginal,
        useExisting1: useExisting1Flag,
        useExisting2: useExisting2Flag
      });

      setSuccess(tArtist('messages.split', { 
        name1: response.data.artist1.name, 
        name2: response.data.artist2.name 
      }));
      toast.success(tArtist('messages.splitSuccess'));
      setShowSplitConfirm(false);
      setExistingArtists({existing1: null, existing2: null});
      setTimeout(() => {
        onUpdate();
      }, 1500);
    } catch (error) {
      setError(error.response?.data?.error || tArtist('errors.splitFailed'));
      toast.error(error.response?.data?.error || tArtist('errors.splitFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplitConfirm = () => {
    performSplit(useExisting1, useExisting2);
  };

  const handleSplitCancel = () => {
    setShowSplitConfirm(false);
    setExistingArtists({existing1: null, existing2: null});
    setUseExisting1(false);
    setUseExisting2(false);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      toast.error(tArtist('errors.noFile'));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response =       await api.post(
        `/v2/admin/artists/${artist.id}/avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setAvatarUrl(response.data.avatarUrl);
      toast.success(tArtist('messages.avatarUploaded'));
      setAvatarFile(null);
    } catch (error) {
      toast.error(error.response?.data?.error || tArtist('errors.uploadFailed'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      await api.delete(`/v2/admin/artists/${artist.id}/avatar`);
      setAvatarUrl('');
      toast.success(tArtist('messages.avatarDeleted'));
    } catch (error) {
      toast.error(error.response?.data?.error || tArtist('errors.deleteFailed'));
    }
  };

  const handleAddEvidence = async (files) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('evidence', file);
      });

      await api.post(
        `/v2/admin/artists/${artist.id}/evidences/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success(tArtist('messages.evidenceAdded'));
      // Refresh artist data
      const response = await api.get(`/v2/admin/artists/${artist.id}`);
      setEvidences(response.data.evidences || []);
    } catch (error) {
      toast.error(error.response?.data?.error || tArtist('errors.evidenceFailed'));
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    try {
      await api.delete(`/v2/admin/artists/${artist.id}/evidences/${evidenceId}`);
      toast.success(tArtist('messages.evidenceDeleted'));
      setEvidences(evidences.filter(e => e.id !== evidenceId));
    } catch (error) {
      toast.error(error.response?.data?.error || tArtist('errors.deleteFailed'));
    }
  };

  return (
    <div className="artist-action-popup-overlay">
      <div className="artist-action-popup" ref={popupRef}>
        <div className="popup-header">
          <h2>{tArtist('title')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="popup-content">
          <div className="mode-tabs">
            <button
              className={`mode-tab ${mode === 'update' ? 'active' : ''}`}
              onClick={() => {
                setMode('update');
                setError('');
                setSuccess('');
              }}
            >
              {tArtist('tabs.update')}
            </button>
            <button
              className={`mode-tab ${mode === 'merge' ? 'active' : ''}`}
              onClick={() => {
                setMode('merge');
                setError('');
                setSuccess('');
              }}
            >
              {tArtist('tabs.merge')}
            </button>
            <button
              className={`mode-tab ${mode === 'split' ? 'active' : ''}`}
              onClick={() => {
                setMode('split');
                setError('');
                setSuccess('');
                setSplitName1('');
                setSplitName2('');
                setDeleteOriginal(false);
                setShowSplitConfirm(false);
                setExistingArtists({existing1: null, existing2: null});
                setUseExisting1(false);
                setUseExisting2(false);
              }}
            >
              {tArtist('tabs.split')}
            </button>
            <button
              className={`mode-tab ${mode === 'aliases' ? 'active' : ''}`}
              onClick={() => setMode('aliases')}
            >
              {tArtist('tabs.aliases')}
            </button>
            <button
              className={`mode-tab ${mode === 'links' ? 'active' : ''}`}
              onClick={() => setMode('links')}
            >
              {tArtist('tabs.links')}
            </button>
            <button
              className={`mode-tab ${mode === 'evidence' ? 'active' : ''}`}
              onClick={() => setMode('evidence')}
            >
              {tArtist('tabs.evidence')}
            </button>
          </div>

          {mode === 'update' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tArtist('form.name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{tArtist('form.avatarUrl')}</label>
                <div className="avatar-section">
                  {avatarUrl && (
                    <div className="avatar-preview">
                      <img src={avatarUrl} alt="Avatar" />
                      <button onClick={handleDeleteAvatar} className="delete-avatar-btn">
                        {tArtist('buttons.deleteAvatar')}
                      </button>
                    </div>
                  )}
                  <div className="avatar-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                      id="avatar-upload"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="avatar-upload" className="upload-label">
                      {tArtist('buttons.selectAvatar')}
                    </label>
                    {avatarFile && (
                      <button onClick={handleAvatarUpload} disabled={isUploadingAvatar}>
                        {isUploadingAvatar ? tArtist('buttons.uploading') : tArtist('buttons.upload')}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder={tArtist('form.avatarUrlPlaceholder')}
                  />
                </div>
              </div>

              <div className="form-group">
                <CustomSelect
                  label={tArtist('form.verificationState')}
                  options={verificationStateOptions}
                  value={verificationStateOptions.find(opt => opt.value === verificationState) || verificationStateOptions[0]}
                  onChange={(option) => setVerificationState(option?.value || 'unverified')}
                  width="100%"
                />
              </div>

              <div className="form-actions">
                <button
                  className="submit-button"
                  onClick={handleUpdate}
                  disabled={isLoading || !name.trim()}
                >
                  {isLoading ? tArtist('buttons.updating') : tArtist('buttons.update')}
                </button>
              </div>
            </div>
          )}

          {mode === 'merge' && (
            <div className="form-section">
              <p className="info-text">{tArtist('merge.info')}</p>
              <div className="form-group">
                <label>{tArtist('merge.search')}</label>
                <input
                  type="text"
                  value={mergeTargetSearch}
                  onChange={(e) => setMergeTargetSearch(e.target.value)}
                  placeholder={tArtist('merge.placeholder')}
                />
              </div>

              {availableArtists && availableArtists.length > 0 && (
                <div className="merge-results">
                  {availableArtists.map((target) => (
                    <div
                      key={target.id}
                      className={`merge-item ${mergeTarget?.id === target.id ? 'selected' : ''}`}
                      onClick={() => setMergeTarget(target)}
                    >
                      {target.avatarUrl && (
                        <img src={target.avatarUrl} alt={target.name} className="merge-avatar" />
                      )}
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
                  {isLoading ? tArtist('buttons.merging') : tArtist('buttons.merge')}
                </button>
              </div>
            </div>
          )}

          {mode === 'split' && (
            <div className="form-section">
              {!showSplitConfirm ? (
                <>
                  <p className="info-text">{tArtist('split.info')}</p>
                  <div className="form-group">
                    <label>{tArtist('split.name1')}</label>
                    <input
                      type="text"
                      value={splitName1}
                      onChange={(e) => setSplitName1(e.target.value)}
                      placeholder={tArtist('split.name1Placeholder')}
                    />
                  </div>
                  <div className="form-group">
                    <label>{tArtist('split.name2')}</label>
                    <input
                      type="text"
                      value={splitName2}
                      onChange={(e) => setSplitName2(e.target.value)}
                      placeholder={tArtist('split.name2Placeholder')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={deleteOriginal}
                        onChange={(e) => setDeleteOriginal(e.target.checked)}
                      />
                      {tArtist('split.deleteOriginal')}
                    </label>
                  </div>
                  <div className="form-actions">
                    <button
                      className="submit-button"
                      onClick={handleSplitCheck}
                      disabled={isLoading || !splitName1.trim() || !splitName2.trim()}
                    >
                      {isLoading ? tArtist('buttons.checking') : tArtist('buttons.split')}
                    </button>
                  </div>
                </>
              ) : (
                <div className="split-confirm-section">
                  <p className="info-text warning">{tArtist('split.confirmTitle')}</p>
                  
                  {existingArtists.existing1 && (
                    <div className="existing-artist-warning">
                      <p>{tArtist('split.existing1', {name: existingArtists.existing1.name})}</p>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={useExisting1}
                          onChange={(e) => setUseExisting1(e.target.checked)}
                        />
                        {tArtist('split.useExisting')}
                      </label>
                    </div>
                  )}
                  
                  {existingArtists.existing2 && (
                    <div className="existing-artist-warning">
                      <p>{tArtist('split.existing2', {name: existingArtists.existing2.name})}</p>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={useExisting2}
                          onChange={(e) => setUseExisting2(e.target.checked)}
                        />
                        {tArtist('split.useExisting')}
                      </label>
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      className="submit-button"
                      onClick={handleSplitConfirm}
                      disabled={isLoading}
                    >
                      {isLoading ? tArtist('buttons.splitting') : tArtist('buttons.proceed')}
                    </button>
                    <button
                      className="cancel-button"
                      onClick={handleSplitCancel}
                      disabled={isLoading}
                    >
                      {tArtist('buttons.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'aliases' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tArtist('aliases.add')}</label>
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
                    placeholder={tArtist('aliases.placeholder')}
                  />
                  <button onClick={handleAddAlias}>{tArtist('buttons.add')}</button>
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
                  {isLoading ? tArtist('buttons.saving') : tArtist('buttons.save')}
                </button>
              </div>
            </div>
          )}

          {mode === 'links' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tArtist('links.add')}</label>
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
                    placeholder={tArtist('links.placeholder')}
                  />
                  <button onClick={handleAddLink}>{tArtist('buttons.add')}</button>
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
                  {isLoading ? tArtist('buttons.saving') : tArtist('buttons.save')}
                </button>
              </div>
            </div>
          )}

          {mode === 'evidence' && (
            <div className="form-section">
              <div className="form-group">
                <label>{tArtist('evidence.add')}</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleAddEvidence(e.target.files);
                    }
                  }}
                />
              </div>

              {evidences.length > 0 && (
                <div className="evidence-preview">
                  {evidences.map((evidence) => (
                    <div key={evidence.id} className="evidence-item">
                      <img
                        src={evidence.link}
                        alt="Evidence"
                        onClick={() => setShowEvidenceGallery(true)}
                      />
                      <button onClick={() => handleDeleteEvidence(evidence.id)}>
                        {tArtist('buttons.delete')}
                      </button>
                    </div>
                  ))}
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

export default ArtistActionPopup;

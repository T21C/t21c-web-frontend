import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './entityActionPopup.css';
import { toast } from 'react-hot-toast';
import { UpdateTab, MergeTab, SplitTab, AliasesTab, LinksTab, CreditsTab, EvidenceTab } from './tabs';

export const EntityActionPopup = ({ artist, song, onClose, onUpdate, type = 'artist' }) => {
  const { t } = useTranslation('components');
  const entity = type === 'song' ? song : artist;
  const entityId = entity?.id;
  const tEntity = (key, params = {}) => {
    const translationKey = type === 'song' ? `songActionPopup.${key}` : `artistActionPopup.${key}`;
    return t(translationKey, params) || key;
  };
  const popupRef = useRef(null);

  const [mode, setMode] = useState('update'); // update, merge, split, aliases, links, evidence, credits (songs only)
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
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState([]); // Array of {file, preview}
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const verificationStateOptions = type === 'song' 
    ? [
        { value: 'unverified', label: tEntity('verification.unverified') },
        { value: 'pending', label: tEntity('verification.pending') },
        { value: 'verified', label: tEntity('verification.verified') }
      ]
    : [
        { value: 'unverified', label: tEntity('verification.unverified') },
        { value: 'pending', label: tEntity('verification.pending') },
        { value: 'declined', label: tEntity('verification.declined') },
        { value: 'mostly declined', label: tEntity('verification.mostlyDeclined') },
        { value: 'mostly allowed', label: tEntity('verification.mostlyAllowed') },
        { value: 'allowed', label: tEntity('verification.allowed') }
      ];

  useEffect(() => {    
    // Lock scrolling
    document.body.style.overflowY = 'hidden';

    // Cleanup function to restore original scroll state
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  // Song-specific state
  const [credits, setCredits] = useState(type === 'song' ? (song?.credits || []) : []);
  const [newCreditArtistId, setNewCreditArtistId] = useState('');
  const [newCreditRole, setNewCreditRole] = useState('');
  const [creditSearch, setCreditSearch] = useState('');
  const [availableArtistsForCredits, setAvailableArtistsForCredits] = useState([]);
  const [availableSongs, setAvailableSongs] = useState([]);

  // Update local state when entity prop changes
  useEffect(() => {
    if (entity) {
      setName(entity.name || '');
      if (type === 'artist') {
        setAvatarUrl(entity.avatarUrl || '');
      }
      setVerificationState(entity.verificationState || 'unverified');
      setAliases(entity.aliases?.map(a => a.alias) || []);
      setLinks(entity.links?.map(l => l.link) || []);
      setEvidences(entity.evidences || []);
      if (type === 'song') {
        setCredits(entity.credits || []);
      }
    }
  }, [entity, type]);

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

    const fetchEntities = async () => {
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

        const endpoint = type === 'song' ? '/v2/admin/songs' : '/v2/admin/artists';
        const response = await api.get(`${endpoint}?${params}`, {
          cancelToken: cancelToken.token
        });

        const items = type === 'song' ? (response.data.songs || []) : (response.data.artists || []);
        if (type === 'song') {
          setAvailableSongs(items.filter(s => String(s.id) !== String(entityId)));
        } else {
          setAvailableArtists(items.filter(a => a.id !== entityId));
        }
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error(`Error fetching ${type}s:`, error);
          setError(tEntity(`errors.load${type === 'song' ? 'Songs' : 'Artists'}Failed`));
          if (type === 'song') {
            setAvailableSongs([]);
          } else {
            setAvailableArtists([]);
          }
        }
      }
    };

    if (mode === 'merge') {
      fetchEntities();
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [entityId, mode, mergeTargetSearch, type]);

  // Fetch artists for credits (songs only)
  useEffect(() => {
    let cancelToken;

    const fetchArtists = async () => {
      if (!creditSearch.trim()) {
        setAvailableArtistsForCredits([]);
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

        setAvailableArtistsForCredits(response.data.artists || []);
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching artists:', error);
          setAvailableArtistsForCredits([]);
        }
      }
    };

    if (mode === 'credits' && type === 'song') {
      fetchArtists();
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [mode, creditSearch, type]);

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
      const endpoint = type === 'song' ? `/v2/admin/songs/${entityId}` : `/v2/admin/artists/${entityId}`;
      await api.put(endpoint, {
        name: name.trim(),
        verificationState
      });

      // Update aliases
      const currentAliases = entity.aliases || [];
      
      // Add new aliases
      const newAliases = aliases.filter(a => !currentAliases.some(ca => ca.alias === a));
      for (const alias of newAliases) {
        await api.post(`${endpoint}/aliases`, { alias });
      }

      // Remove deleted aliases
      const removedAliases = currentAliases.filter(ca => !aliases.includes(ca.alias));
      for (const alias of removedAliases) {
        await api.delete(`${endpoint}/aliases/${alias.id}`);
      }

      // Update links
      const currentLinks = entity.links || [];
      
      // Add new links
      const newLinks = links.filter(l => !currentLinks.some(cl => cl.link === l));
      for (const link of newLinks) {
        await api.post(`${endpoint}/links`, { link });
      }

      // Remove deleted links
      const removedLinks = currentLinks.filter(cl => !links.includes(cl.link));
      for (const link of removedLinks) {
        await api.delete(`${endpoint}/links/${link.id}`);
      }

      setSuccess(tEntity('messages.updated'));
      toast.success(tEntity('messages.updated'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.updateFailed'));
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerge = async () => {
    if (!currentMergeTarget) {
      setError(tEntity('errors.selectTarget'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = type === 'song' 
        ? `/v2/admin/songs/${entityId}/merge`
        : `/v2/admin/artists/${entityId}/merge`;
      await api.post(endpoint, {
        targetId: currentMergeTarget.id
      });

      setSuccess(tEntity('messages.merged'));
      toast.success(tEntity('messages.merged'));
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.mergeFailed'));
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplitCheck = async () => {
    if (!splitName1.trim() || !splitName2.trim()) {
      setError(tEntity('errors.bothNamesRequired'));
      return;
    }

    if (splitName1.trim().toLowerCase() === splitName2.trim().toLowerCase()) {
      setError(tEntity('errors.namesMustBeDifferent'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if artists already exist
      const checkResponse = await api.post(`/v2/admin/artists/${entityId}/split/check`, {
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
      const errorMessage = getErrorMessage(error, tEntity('errors.checkFailed'));
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const performSplit = async (useExisting1Flag, useExisting2Flag) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.post(`/v2/admin/artists/${entityId}/split`, {
        name1: splitName1.trim(),
        name2: splitName2.trim(),
        deleteOriginal,
        useExisting1: useExisting1Flag,
        useExisting2: useExisting2Flag
      });

      setSuccess(tEntity('messages.split', { 
        name1: response.data.artist1.name, 
        name2: response.data.artist2.name 
      }));
      toast.success(tEntity('messages.splitSuccess'));
      setShowSplitConfirm(false);
      setExistingArtists({existing1: null, existing2: null});
      setTimeout(() => {
        onUpdate();
      }, 1500);
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.splitFailed'));
      setError(errorMessage);
      toast.error(errorMessage);
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

  // Song-specific handlers
  const handleAddCredit = async () => {
    if (!newCreditArtistId) {
      toast.error(tEntity('errors.selectArtist'));
      return;
    }

    try {
      await api.post(`/v2/admin/songs/${entityId}/credits`, {
        artistId: parseInt(newCreditArtistId),
        role: newCreditRole.trim() || null
      });

      toast.success(tEntity('messages.creditAdded'));
      const response = await api.get(`/v2/admin/songs/${entityId}`);
      setCredits(response.data.credits || []);
      setNewCreditArtistId('');
      setNewCreditRole('');
      setCreditSearch('');
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.creditFailed'));
      toast.error(errorMessage);
    }
  };

  const handleRemoveCredit = async (creditId) => {
    try {
      await api.delete(`/v2/admin/songs/${entityId}/credits/${creditId}`);
      toast.success(tEntity('messages.creditRemoved'));
      setCredits(credits.filter(c => c.id !== creditId));
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.deleteFailed'));
      toast.error(errorMessage);
    }
  };

  // Helper function to extract error message, prioritizing details.errors
  const getErrorMessage = (error, defaultMessage) => {
    if (error?.response?.data?.details?.errors && Array.isArray(error.response.data.details.errors) && error.response.data.details.errors.length > 0) {
      return error.response.data.details.errors[0];
    }
    return error?.response?.data?.error || defaultMessage;
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || type !== 'artist') {
      toast.error(tEntity('errors.noFile'));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const response = await api.post(
        `/v2/admin/artists/${entityId}/avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      const newAvatarUrl = response.data.avatarUrl;
      setAvatarUrl(newAvatarUrl);
      setAvatarPreview(null); // Clear preview since we now have the uploaded URL
      setAvatarFile(null);
      toast.success(tEntity('messages.avatarUploaded'));
      // Refresh entity data to update parent component
      onUpdate();
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.uploadFailed'));
      toast.error(errorMessage);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (type !== 'artist') return;
    try {
      await api.delete(`/v2/admin/artists/${entityId}/avatar`);
      setAvatarUrl('');
      setAvatarPreview(null);
      toast.success(tEntity('messages.avatarDeleted'));
      // Refresh entity data to update parent component
      onUpdate();
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.deleteFailed'));
      toast.error(errorMessage);
    }
  };

  const handleEvidenceFileSelect = (files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (fileArray.length === 0) {
      toast.error(tEntity('errors.invalidFileType'));
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
      toast.error(tEntity('errors.noFile'));
      return;
    }

    setIsUploadingEvidence(true);
    try {
      const formData = new FormData();
      evidenceFiles.forEach(({ file }) => {
        formData.append('evidence', file);
      });

      const endpoint = type === 'song'
        ? `/v2/admin/songs/${entityId}/evidences/upload`
        : `/v2/admin/artists/${entityId}/evidences/upload`;
      await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(tEntity('messages.evidenceAdded'));
      // Refresh entity data
      const fetchEndpoint = type === 'song' ? `/v2/admin/songs/${entityId}` : `/v2/admin/artists/${entityId}`;
      const response = await api.get(fetchEndpoint);
      setEvidences(response.data.evidences || []);
      // Clear preview files
      setEvidenceFiles([]);
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.evidenceFailed'));
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
    if (!window.confirm(tEntity('evidence.deleteConfirm'))) {
      return;
    }

    try {
      const endpoint = type === 'song'
        ? `/v2/admin/songs/${entityId}/evidences/${evidenceId}`
        : `/v2/admin/artists/${entityId}/evidences/${evidenceId}`;
      await api.delete(endpoint);
      toast.success(tEntity('messages.evidenceDeleted'));
      setEvidences(evidences.filter(e => e.id !== evidenceId));
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.deleteFailed'));
      toast.error(errorMessage);
    }
  };

  const currentMergeTarget = type === 'song' ? mergeTarget : mergeTarget;
  const availableMergeTargets = type === 'song' ? availableSongs : availableArtists;

  return (
    <div className={`entity-action-popup-overlay`}>
      <div className={`entity-action-popup`} ref={popupRef}>
        <div className="popup-header">
          <h2>{tEntity('title')}</h2>
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
              {tEntity('tabs.update')}
            </button>
            <button
              className={`mode-tab ${mode === 'merge' ? 'active' : ''}`}
              onClick={() => {
                setMode('merge');
                setError('');
                setSuccess('');
              }}
            >
              {tEntity('tabs.merge')}
            </button>
            {type === 'artist' && (
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
                {tEntity('tabs.split')}
              </button>
            )}
            <button
              className={`mode-tab ${mode === 'aliases' ? 'active' : ''}`}
              onClick={() => setMode('aliases')}
            >
              {tEntity('tabs.aliases')}
            </button>
            <button
              className={`mode-tab ${mode === 'links' ? 'active' : ''}`}
              onClick={() => setMode('links')}
            >
              {tEntity('tabs.links')}
            </button>
            {type === 'song' && (
              <button
                className={`mode-tab ${mode === 'credits' ? 'active' : ''}`}
                onClick={() => setMode('credits')}
              >
                {tEntity('tabs.credits')}
              </button>
            )}
            <button
              className={`mode-tab ${mode === 'evidence' ? 'active' : ''}`}
              onClick={() => setMode('evidence')}
            >
              {tEntity('tabs.evidence')}
            </button>
          </div>

          {mode === 'update' && (
            <UpdateTab
              type={type}
              name={name}
              setName={setName}
              avatarUrl={avatarUrl}
              avatarPreview={avatarPreview}
              avatarFile={avatarFile}
              setAvatarFile={setAvatarFile}
              setAvatarPreview={setAvatarPreview}
              handleAvatarUpload={handleAvatarUpload}
              handleDeleteAvatar={handleDeleteAvatar}
              isUploadingAvatar={isUploadingAvatar}
              verificationState={verificationState}
              setVerificationState={setVerificationState}
              verificationStateOptions={verificationStateOptions}
              handleUpdate={handleUpdate}
              isLoading={isLoading}
              tEntity={tEntity}
            />
          )}

          {mode === 'merge' && (
            <MergeTab
              type={type}
              mergeTargetSearch={mergeTargetSearch}
              setMergeTargetSearch={setMergeTargetSearch}
              availableMergeTargets={availableMergeTargets}
              currentMergeTarget={currentMergeTarget}
              setMergeTarget={setMergeTarget}
              handleMerge={handleMerge}
              isLoading={isLoading}
              tEntity={tEntity}
            />
          )}

          {mode === 'split' && type === 'artist' && (
            <SplitTab
              splitName1={splitName1}
              setSplitName1={setSplitName1}
              splitName2={splitName2}
              setSplitName2={setSplitName2}
              deleteOriginal={deleteOriginal}
              setDeleteOriginal={setDeleteOriginal}
              showSplitConfirm={showSplitConfirm}
              existingArtists={existingArtists}
              useExisting1={useExisting1}
              setUseExisting1={setUseExisting1}
              useExisting2={useExisting2}
              setUseExisting2={setUseExisting2}
              handleSplitCheck={handleSplitCheck}
              handleSplitConfirm={handleSplitConfirm}
              handleSplitCancel={handleSplitCancel}
              isLoading={isLoading}
              tEntity={tEntity}
            />
          )}

          {mode === 'aliases' && (
            <AliasesTab
              newAlias={newAlias}
              setNewAlias={setNewAlias}
              aliases={aliases}
              handleAddAlias={handleAddAlias}
              handleRemoveAlias={handleRemoveAlias}
              handleUpdate={handleUpdate}
              isLoading={isLoading}
              tEntity={tEntity}
            />
          )}

          {mode === 'links' && (
            <LinksTab
              newLink={newLink}
              setNewLink={setNewLink}
              links={links}
              handleAddLink={handleAddLink}
              handleRemoveLink={handleRemoveLink}
              handleUpdate={handleUpdate}
              isLoading={isLoading}
              tEntity={tEntity}
            />
          )}

          {mode === 'credits' && type === 'song' && (
            <CreditsTab
              creditSearch={creditSearch}
              setCreditSearch={setCreditSearch}
              availableArtistsForCredits={availableArtistsForCredits}
              newCreditArtistId={newCreditArtistId}
              setNewCreditArtistId={setNewCreditArtistId}
              newCreditRole={newCreditRole}
              setNewCreditRole={setNewCreditRole}
              credits={credits}
              handleAddCredit={handleAddCredit}
              handleRemoveCredit={handleRemoveCredit}
              tEntity={tEntity}
            />
          )}

          {mode === 'evidence' && (
            <EvidenceTab
              type={type}
              entityId={entityId}
              isDragOver={isDragOver}
              handleDragOver={handleDragOver}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleEvidenceFileSelect={handleEvidenceFileSelect}
              evidenceFiles={evidenceFiles}
              handleRemoveEvidencePreview={handleRemoveEvidencePreview}
              handleAddEvidence={handleAddEvidence}
              isUploadingEvidence={isUploadingEvidence}
              evidences={evidences}
              showEvidenceGallery={showEvidenceGallery}
              setShowEvidenceGallery={setShowEvidenceGallery}
              handleDeleteEvidence={handleDeleteEvidence}
              tEntity={tEntity}
            />
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </div>
      </div>
    </div>
  );
};

export default EntityActionPopup;

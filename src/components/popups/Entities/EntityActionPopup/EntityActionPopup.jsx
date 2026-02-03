import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './entityActionPopup.css';
import { toast } from 'react-hot-toast';
import { UpdateTab, MergeTab, SplitTab, AliasesTab, LinksTab, CreditsTab, EvidenceTab, LevelSuffixTab, RelationsTab } from './tabs';

export const EntityActionPopup = ({ artist, song, onClose, onUpdate, type = 'artist' }) => {
  const { t } = useTranslation(['components', 'common']);
  const entity = type === 'song' ? song : artist;
  const entityId = entity?.id;
  const tEntity = (key, params = {}) => {
    const translationKey = type === 'song' ? `songActionPopup.${key}` : `artistActionPopup.${key}`;
    return t(translationKey, params) || key;
  };
  const popupRef = useRef(null);

  const [mode, setMode] = useState('update'); // update, merge, split, aliases, links, evidence, credits (songs only), levelSuffix (songs only)
  const [name, setName] = useState(artist?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(artist?.avatarUrl || '');
  const [verificationState, setVerificationState] = useState(
    type === 'song' 
      ? (song?.verificationState || 'pending')
      : (artist?.verificationState || 'unverified')
  );
  const [aliases, setAliases] = useState(artist?.aliases?.map(a => a.alias) || []);
  const [links, setLinks] = useState(artist?.links?.map(l => l.link) || []);
  const [evidences, setEvidences] = useState(artist?.evidences || []);
  const [newAlias, setNewAlias] = useState('');
  const [newLink, setNewLink] = useState('');
  const [mergeTarget, setMergeTarget] = useState(null);
  const [mergeTargetSearch, setMergeTargetSearch] = useState('');
  const [availableArtists, setAvailableArtists] = useState([]);
  const [splitEntity1, setSplitEntity1] = useState(null);
  const [splitEntity2, setSplitEntity2] = useState(null);
  const [splitSearch1, setSplitSearch1] = useState('');
  const [splitSearch2, setSplitSearch2] = useState('');
  const [availableEntities1, setAvailableEntities1] = useState(null);
  const [availableEntities2, setAvailableEntities2] = useState(null);
  const [deleteOriginal, setDeleteOriginal] = useState(false);
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
  const [newEvidenceLink, setNewEvidenceLink] = useState('');
  const [editingEvidenceId, setEditingEvidenceId] = useState(null);
  const [editingEvidenceLink, setEditingEvidenceLink] = useState('');
  const [entityExtraInfo, setEntityExtraInfo] = useState(entity?.extraInfo || '');
  const [editingEntityExtraInfo, setEditingEntityExtraInfo] = useState('');
  const [isEditingEntityExtraInfo, setIsEditingEntityExtraInfo] = useState(false);

  const verificationStateOptions = type === 'song' 
    ? [
        { value: 'allowed', label: t('verification.allowed', { ns: 'common' }) },
        { value: 'ysmod_only', label: t('verification.ysmod_only', { ns: 'common' }) },
        { value: 'tuf_verified', label: t('verification.tuf_verified', { ns: 'common' }) },
        { value: 'conditional', label: t('verification.conditional', { ns: 'common' }) },
        { value: 'pending', label: t('verification.pending', { ns: 'common' }) },
        { value: 'declined', label: t('verification.declined', { ns: 'common' }) }
      ]
    : [
        { value: 'allowed', label: t('verification.allowed', { ns: 'common' }) },
        { value: 'mostly_allowed', label: t('verification.mostly_allowed', { ns: 'common' }) },
        { value: 'mostly_declined', label: t('verification.mostly_declined', { ns: 'common' }) },
        { value: 'declined', label: t('verification.declined', { ns: 'common' }) },
        { value: 'tuf_verified', label: t('verification.tuf_verified', { ns: 'common' }) },
        { value: 'ysmod_only', label: t('verification.ysmod_only', { ns: 'common' }) },
        { value: 'pending', label: t('verification.pending', { ns: 'common' }) },
        { value: 'unverified', label: t('verification.unverified', { ns: 'common' }) }
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

  // Artist relations state (artists only)
  const [relations, setRelations] = useState(type === 'artist' ? (artist?.relatedArtists || []) : []);
  const [newRelationArtistId, setNewRelationArtistId] = useState('');
  const [relationSearch, setRelationSearch] = useState('');
  const [availableArtistsForRelations, setAvailableArtistsForRelations] = useState([]);

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
      setEntityExtraInfo(entity.extraInfo || '');
      if (type === 'song') {
        setCredits(entity.credits || []);
      }
      if (type === 'artist') {
        setRelations(entity.relatedArtists || []);
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

        const endpoint = type === 'song' ? '/v2/database/songs' : '/v2/database/artists';
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

        const response = await api.get(`/v2/database/artists?${params}`, {
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

  // Fetch entities for split (artists only)
  useEffect(() => {
    let cancelToken1;
    let cancelToken2;

    const fetchEntities1 = async () => {
      if (!splitSearch1 || splitSearch1.trim().length < 1) {
        setAvailableEntities1([]);
        return;
      }

      try {
        if (cancelToken1) {
          cancelToken1.cancel('New search initiated');
        }

        cancelToken1 = api.CancelToken.source();

        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          search: splitSearch1,
          sort: 'NAME_ASC'
        });

        const endpoint = type === 'song' ? '/v2/database/songs' : '/v2/database/artists';
        const response = await api.get(`${endpoint}?${params}`, {
          cancelToken: cancelToken1.token
        });

        const items = type === 'song' ? (response.data.songs || []) : (response.data.artists || []);
        setAvailableEntities1(items.filter(e => String(e.id) !== String(entityId)));
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error(`Error fetching ${type}s:`, error);
          setAvailableEntities1([]);
        }
      }
    };

    const fetchEntities2 = async () => {
      if (!splitSearch2 || splitSearch2.trim().length < 1) {
        setAvailableEntities2([]);
        return;
      }

      try {
        if (cancelToken2) {
          cancelToken2.cancel('New search initiated');
        }

        cancelToken2 = api.CancelToken.source();

        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          search: splitSearch2,
          sort: 'NAME_ASC'
        });

        const endpoint = type === 'song' ? '/v2/database/songs' : '/v2/database/artists';
        const response = await api.get(`${endpoint}?${params}`, {
          cancelToken: cancelToken2.token
        });

        const items = type === 'song' ? (response.data.songs || []) : (response.data.artists || []);
        setAvailableEntities2(items.filter(e => String(e.id) !== String(entityId)));
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error(`Error fetching ${type}s:`, error);
          setAvailableEntities2([]);
        }
      }
    };

    if (mode === 'split' && type === 'artist') {
      fetchEntities1();
      fetchEntities2();
    } else {
      setAvailableEntities1(null);
      setAvailableEntities2(null);
    }

    return () => {
      if (cancelToken1) {
        cancelToken1.cancel('Component unmounted');
      }
      if (cancelToken2) {
        cancelToken2.cancel('Component unmounted');
      }
    };
  }, [mode, splitSearch1, splitSearch2, type, entityId]);

  // Fetch artists for relations (artists only)
  useEffect(() => {
    let cancelToken;

    const fetchArtists = async () => {
      if (!relationSearch.trim()) {
        setAvailableArtistsForRelations([]);
        return;
      }

      try {
        if (cancelToken) {
          cancelToken.cancel('New search initiated');
        }

        cancelToken = api.CancelToken.source();
        setAvailableArtistsForRelations(null); // Set to null to show loading state

        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          search: relationSearch,
          sort: 'NAME_ASC'
        });

        const response = await api.get(`/v2/database/artists?${params}`, {
          cancelToken: cancelToken.token
        });

        // Filter out current artist and already related artists
        const relatedIds = new Set(relations.map(r => r.id));
        setAvailableArtistsForRelations(
          (response.data.artists || []).filter(
            a => a.id !== entityId && !relatedIds.has(a.id)
          )
        );
      } catch (error) {
        if (!api.isCancel(error)) {
          console.error('Error fetching artists:', error);
          setAvailableArtistsForRelations([]);
        }
      }
    };

    if (mode === 'relations' && type === 'artist') {
      fetchArtists();
    } else {
      setAvailableArtistsForRelations([]);
    }

    return () => {
      if (cancelToken) {
        cancelToken.cancel('Component unmounted');
      }
    };
  }, [mode, relationSearch, type, entityId, relations]);

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
      const endpoint = type === 'song' ? `/v2/database/songs/${entityId}` : `/v2/database/artists/${entityId}`;
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
        ? `/v2/database/songs/${entityId}/merge`
        : `/v2/database/artists/${entityId}/merge`;
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

  const handleSplit = async () => {
    if (!splitEntity1 || !splitEntity2) {
      setError(tEntity('errors.bothEntitiesRequired'));
      return;
    }

    if (splitEntity1.id === splitEntity2.id) {
      setError(tEntity('errors.entitiesMustBeDifferent'));
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = type === 'song' 
        ? `/v2/database/songs/${entityId}/split`
        : `/v2/database/artists/${entityId}/split`;
      
      const response = await api.post(endpoint, {
        targetId1: splitEntity1.id,
        targetId2: splitEntity2.id,
        deleteOriginal
      });

      setSuccess(tEntity('messages.split', { 
        name1: response.data.entity1.name, 
        name2: response.data.entity2.name 
      }));
      toast.success(tEntity('messages.splitSuccess'));
      setSplitEntity1(null);
      setSplitEntity2(null);
      setSplitSearch1('');
      setSplitSearch2('');
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

  // Song-specific handlers
  const handleAddCredit = async () => {
    if (!newCreditArtistId) {
      toast.error(tEntity('errors.selectArtist'));
      return;
    }

    try {
      await api.post(`/v2/database/songs/${entityId}/credits`, {
        artistId: parseInt(newCreditArtistId),
        role: newCreditRole.trim() || null
      });

      toast.success(tEntity('messages.creditAdded'));
      const response = await api.get(`/v2/database/songs/${entityId}`);
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
      await api.delete(`/v2/database/songs/${entityId}/credits/${creditId}`);
      toast.success(tEntity('messages.creditRemoved'));
      setCredits(credits.filter(c => c.id !== creditId));
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.deleteFailed'));
      toast.error(errorMessage);
    }
  };

  // Artist relations handlers (artists only)
  const handleAddRelation = async () => {
    if (!newRelationArtistId || type !== 'artist') {
      toast.error(tEntity('errors.selectArtist'));
      return;
    }

    try {
      const response = await api.post(`/v2/database/artists/${entityId}/relations`, {
        relatedArtistId: parseInt(newRelationArtistId)
      });

      // Use the returned artist data from the API response
      const addedArtist = response.data?.relation?.artist;
      if (addedArtist) {
        // Update local relations state with the new relation
        setRelations([...relations, addedArtist]);
        
        // Update the artist prop locally by creating updated artist object
        const updatedArtist = {
          ...artist,
          relatedArtists: [...(artist?.relatedArtists || []), addedArtist]
        };
        
        // Notify parent with updated artist data (no refetch needed)
        if (onUpdate) {
          onUpdate(updatedArtist);
        }
      }

      toast.success(tEntity('messages.relationAdded'));
      setNewRelationArtistId('');
      setRelationSearch('');
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.relationFailed'));
      toast.error(errorMessage);
    }
  };

  const handleRemoveRelation = async (relatedArtistId) => {
    if (type !== 'artist') return;
    
    // Optimistically update local state
    const updatedRelations = relations.filter(r => r.id !== relatedArtistId);
    setRelations(updatedRelations);
    
    try {
      await api.delete(`/v2/database/artists/${entityId}/relations/${relatedArtistId}`);
      
      // Update the artist prop locally
      const updatedArtist = {
        ...artist,
        relatedArtists: updatedRelations
      };
      
      // Notify parent with updated artist data (no refetch needed)
      if (onUpdate) {
        onUpdate(updatedArtist);
      }
      
      toast.success(tEntity('messages.relationRemoved'));
    } catch (error) {
      // Revert optimistic update on error
      setRelations(relations);
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
        `/v2/database/artists/${entityId}/avatar`,
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
      await api.delete(`/v2/database/artists/${entityId}/avatar`);
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
        ? `/v2/database/songs/${entityId}/evidences/upload`
        : `/v2/database/artists/${entityId}/evidences/upload`;
      await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(tEntity('messages.evidenceAdded'));
      // Refresh entity data
      const fetchEndpoint = type === 'song' ? `/v2/database/songs/${entityId}` : `/v2/database/artists/${entityId}`;
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

  const handleAddEvidenceLink = async () => {
    if (!newEvidenceLink.trim()) {
      toast.error(tEntity('errors.invalidLink'));
      return;
    }

    try {
      const endpoint = type === 'song'
        ? `/v2/database/songs/${entityId}/evidences`
        : `/v2/database/artists/${entityId}/evidences`;
      const response = await api.post(endpoint, { 
        link: newEvidenceLink.trim()
      });
      toast.success(tEntity('messages.evidenceAdded'));
      setEvidences([...evidences, response.data]);
      setNewEvidenceLink('');
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.evidenceFailed'));
      toast.error(errorMessage);
    }
  };

  const handleStartEditEvidence = (evidence) => {
    setEditingEvidenceId(evidence.id);
    setEditingEvidenceLink(evidence.link);
  };

  const handleCancelEditEvidence = () => {
    setEditingEvidenceId(null);
    setEditingEvidenceLink('');
  };

  const handleUpdateEvidence = async (evidenceId) => {
    if (!editingEvidenceLink.trim()) {
      toast.error(tEntity('errors.invalidLink'));
      return;
    }

    try {
      const endpoint = type === 'song'
        ? `/v2/database/songs/${entityId}/evidences/${evidenceId}`
        : `/v2/database/artists/${entityId}/evidences/${evidenceId}`;
      const response = await api.put(endpoint, { 
        link: editingEvidenceLink.trim()
      });
      toast.success(tEntity('messages.evidenceUpdated') || 'Evidence updated successfully');
      setEvidences(evidences.map(e => e.id === evidenceId ? response.data : e));
      setEditingEvidenceId(null);
      setEditingEvidenceLink('');
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.evidenceFailed'));
      toast.error(errorMessage);
    }
  };

  const handleStartEditEntityExtraInfo = () => {
    setEditingEntityExtraInfo(entityExtraInfo || '');
    setIsEditingEntityExtraInfo(true);
  };

  const handleCancelEditEntityExtraInfo = () => {
    setEditingEntityExtraInfo('');
    setIsEditingEntityExtraInfo(false);
  };

  const handleSaveEntityExtraInfo = async () => {
    try {
      const endpoint = type === 'song'
        ? `/v2/database/songs/${entityId}`
        : `/v2/database/artists/${entityId}`;
      const response = await api.put(endpoint, { 
        extraInfo: editingEntityExtraInfo.trim() || null
      });
      setEntityExtraInfo(response.data.extraInfo || '');
      setIsEditingEntityExtraInfo(false);
      setEditingEntityExtraInfo('');
      toast.success(tEntity('messages.entityExtraInfoUpdated') || 'Extra info updated successfully');
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error, tEntity('errors.updateFailed'));
      toast.error(errorMessage);
    }
  };

  const handleDeleteEvidence = async (evidenceId) => {
    if (!window.confirm(tEntity('evidence.deleteConfirm'))) {
      return;
    }

    try {
      const endpoint = type === 'song'
        ? `/v2/database/songs/${entityId}/evidences/${evidenceId}`
        : `/v2/database/artists/${entityId}/evidences/${evidenceId}`;
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
          <h2>{tEntity('title', { name: entity.name })}</h2>
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
                  setSplitEntity1(null);
                  setSplitEntity2(null);
                  setSplitSearch1('');
                  setSplitSearch2('');
                  setDeleteOriginal(false);
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
            {type === 'song' && (
              <button
                className={`mode-tab ${mode === 'levelSuffix' ? 'active' : ''}`}
                onClick={() => setMode('levelSuffix')}
              >
                {tEntity('tabs.levelSuffix')}
              </button>
            )}
            {type === 'artist' && (
              <button
                className={`mode-tab ${mode === 'relations' ? 'active' : ''}`}
                onClick={() => {
                  setMode('relations');
                  setError('');
                  setSuccess('');
                }}
              >
                {tEntity('tabs.relations')}
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
              type={type}
              splitEntity1={splitEntity1}
              setSplitEntity1={setSplitEntity1}
              splitEntity2={splitEntity2}
              setSplitEntity2={setSplitEntity2}
              splitSearch1={splitSearch1}
              setSplitSearch1={setSplitSearch1}
              splitSearch2={splitSearch2}
              setSplitSearch2={setSplitSearch2}
              availableEntities1={availableEntities1}
              availableEntities2={availableEntities2}
              deleteOriginal={deleteOriginal}
              setDeleteOriginal={setDeleteOriginal}
              handleSplit={handleSplit}
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

          {mode === 'levelSuffix' && type === 'song' && (
            <LevelSuffixTab
              song={song}
              onUpdate={onUpdate}
              isLoading={isLoading}
              tEntity={tEntity}
            />
          )}

          {mode === 'relations' && type === 'artist' && (
            <RelationsTab
              relationSearch={relationSearch}
              setRelationSearch={setRelationSearch}
              availableArtistsForRelations={availableArtistsForRelations}
              newRelationArtistId={newRelationArtistId}
              setNewRelationArtistId={setNewRelationArtistId}
              relations={relations}
              handleAddRelation={handleAddRelation}
              handleRemoveRelation={handleRemoveRelation}
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
              newEvidenceLink={newEvidenceLink}
              setNewEvidenceLink={setNewEvidenceLink}
              handleAddEvidenceLink={handleAddEvidenceLink}
              editingEvidenceId={editingEvidenceId}
              editingEvidenceLink={editingEvidenceLink}
              setEditingEvidenceLink={setEditingEvidenceLink}
              handleStartEditEvidence={handleStartEditEvidence}
              handleCancelEditEvidence={handleCancelEditEvidence}
              handleUpdateEvidence={handleUpdateEvidence}
              entityExtraInfo={entityExtraInfo}
              editingEntityExtraInfo={editingEntityExtraInfo}
              setEditingEntityExtraInfo={setEditingEntityExtraInfo}
              isEditingEntityExtraInfo={isEditingEntityExtraInfo}
              handleStartEditEntityExtraInfo={handleStartEditEntityExtraInfo}
              handleCancelEditEntityExtraInfo={handleCancelEditEntityExtraInfo}
              handleSaveEntityExtraInfo={handleSaveEntityExtraInfo}
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

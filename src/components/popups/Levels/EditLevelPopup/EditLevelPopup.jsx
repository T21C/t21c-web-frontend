import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './editlevelpopup.css';
import api from '@/utils/api';
import { RatingInput } from '@/components/common/selectors';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { useTranslation } from 'react-i18next';
import AliasManagementPopup from './AliasManagementPopup';
import { LevelUploadManagementPopup } from '@/components/popups';
import { UploadIcon, RefreshIcon } from '@/components/common/icons';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TagManagementPopup } from './TagManagementPopup';
import { isCdnUrl } from '@/utils/Utility';
import { useAuth } from '@/contexts/AuthContext';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';

export const EditLevelPopup = ({ level, onClose, onUpdate, isFromAnnouncementPage = false }) => {
  const { t } = useTranslation('components');
  const tLevel = (key) => t(`levelPopups.edit.${key}`) || key;
  const { user } = useAuth();
  const isSuperAdmin = hasFlag(user, permissionFlags.SUPER_ADMIN);
  
  // Fields allowed for non-admin creators
  const ALLOWED_CREATOR_FIELDS = ['song', 'artist', 'videoLink', 'dlLink', 'workshopLink'];
  
  // Check if a field is allowed for non-admin users
  const isFieldAllowed = (fieldName) => {
    if (isSuperAdmin) return true;
    return ALLOWED_CREATOR_FIELDS.includes(fieldName);
  };

  const [formData, setFormData] = useState({
    song: '',
    artist: '',
    creator: '',
    charter: '',
    vfxer: '',
    team: '',
    diffId: '',
    previousDiffId: null,
    ppBaseScore: '',
    baseScore: '',
    videoLink: '',
    dlLink: '',
    workshopLink: '',
    publicComments: '',
    rerateNum: '',
    toRate: false,
    rerateReason: '',
    isDeleted: false,
    isHidden: false,
    isAnnounced: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isHideMode, setIsHideMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { difficulties } = useDifficultyContext();
  const [showAliasManagement, setShowAliasManagement] = useState(false);
  const [showUploadManagement, setShowUploadManagement] = useState(false);
  const [showTagManagement, setShowTagManagement] = useState(false);
  const [levelTags, setLevelTags] = useState([]);
  const [isExternallyAvailable, setIsExternallyAvailable] = useState(false);
  const [isRefreshingTags, setIsRefreshingTags] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (level) {
      setFormData({
        song: level.song || '',
        artist: level.artist || '',
        diffId: level.diffId !== null ? level.diffId : 0,
        baseScore: level.baseScore,
        ppBaseScore: level.ppBaseScore,
        videoLink: level.videoLink || '',
        dlLink: level.dlLink || '',
        workshopLink: level.workshopLink || '',
        publicComments: level.publicComments || '',
        rerateNum: level.rerateNum || '',
        toRate: level.toRate || false,
        rerateReason: level.rerateReason || '',
        isDeleted: level.isDeleted || false,
        isHidden: level.isHidden || false,
        previousDiffId: level.previousDiffId,
        previousBaseScore: level.previousBaseScore,
      });
      setHasUnsavedChanges(false);
      setIsExternallyAvailable(level.isExternallyAvailable);
      
      // Fetch level tags
      const fetchTags = async () => {
        try {
          const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/levels/${level.id}/tags`);
          setLevelTags(response.data || []);
        } catch (err) {
          console.error('Error fetching level tags:', err);
          setLevelTags([]);
        }
      };
      fetchTags();
    }

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [level]);

  useEffect(() => {
    document.body.style.overflowY = 'hidden';
    return () => {
      document.body.style.overflowY = '';
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setHasUnsavedChanges(true);
  };

  const handlePreviousBaseScoreChange = (value) => {
    setFormData(prev => ({
      ...prev,
      previousBaseScore: value
    }));
    setHasUnsavedChanges(true);
  };

  const handleDifficultyChange = (value, field = 'diffId') => {
    const selectedDiff = difficulties.find(d => d.name === value);
    if (selectedDiff !== null) {
      const baseScoreDisplay = (() => {
        if (formData.baseScore === null) return "";
        const baseScore = parseFloat(formData.baseScore);
        const matchingDiff = difficulties.find(d => d.baseScore === baseScore);
        return matchingDiff ? matchingDiff.name : formData.baseScore.toString();
      })();

      const shouldUpdateBaseScore = baseScoreDisplay === value && field === 'diffId';
      
      setFormData(prev => ({
        ...prev,
        [field]: selectedDiff.id,
        baseScore: shouldUpdateBaseScore ? selectedDiff.baseScore : prev.baseScore
      }));
      setHasUnsavedChanges(true);
    }
  };

  const handleBaseScoreChange = (value, isFromDropdown) => {
    if (isFromDropdown) {
      const selectedDiff = difficulties.find(d => d.name === value);
      if (selectedDiff) {
        setFormData(prev => ({
          ...prev,
          baseScore: selectedDiff.baseScore
        }));
        setHasUnsavedChanges(true);
      } else {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue)) {
          setFormData(prev => ({
            ...prev,
            baseScore: numericValue
          }));
          setHasUnsavedChanges(true);
        }
      }
    } else {
      setFormData(prev => ({
        ...prev,
        baseScore: value === "" ? null : value
      }));
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const submitData = { ...formData };
      
      if (!isFromAnnouncementPage) {
        delete submitData.previousDiffId;
        delete submitData.previousBaseScore;
      }

      const levelData = {
        ...submitData,
        isExternallyAvailable,
      };

      const response = await api.put(
        isSuperAdmin ? `${import.meta.env.VITE_LEVELS}/${level.id}` : `${import.meta.env.VITE_LEVELS}/own/${level.id}`,
        levelData
      );

      if (response.data && response.data.level) {
        onUpdate(response.data);
        setHasUnsavedChanges(false);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || tLevel('errors.update'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isHideMode) {
      await handleToggleHidden();
      return;
    }

    if (!window.confirm(tLevel('confirmations.delete'))) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await api.delete(`${import.meta.env.VITE_LEVELS}/${level.id}`);
      if (response.data) {
        const updatedFields = response.data.level || response.data || {};
        if (onUpdate) {
          await onUpdate({ level: updatedFields });
        }
        setHasUnsavedChanges(false);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || tLevel('errors.delete'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleHidden = async () => {
    if (!window.confirm(level.isHidden ? tLevel('confirmations.unhide') : tLevel('confirmations.hide'))) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await api.patch(`${import.meta.env.VITE_LEVELS}/${level.id}/toggle-hidden`);
      if (response.data) {
        const updatedFields = response.data.level || response.data || {};
        if (onUpdate) {
          await onUpdate({ level: updatedFields });
        }
        setHasUnsavedChanges(false);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || tLevel('errors.toggleHidden'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (window.confirm(tLevel('confirmations.unsavedChanges'))) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const toggleMode = (e) => {
    e.stopPropagation();
    setIsHideMode(!isHideMode);
  };

  const handleRestore = async () => {
    if (!window.confirm(tLevel('confirmations.restore'))) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await api.patch(`${import.meta.env.VITE_LEVELS}/${level.id}/restore`);
      if (response.data) {
        const updatedFields = response.data.level || response.data || {};
        if (onUpdate) {
          await onUpdate({ level: updatedFields });
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || tLevel('errors.restore'));
    } finally {
      setIsSaving(false);
    }
  };

  const getDifficultyName = useCallback((diffId) => {
    if (!difficulties) return '';
    const diff = difficulties.find(d => d.id === parseInt(diffId));
    return diff ? diff.name : '';
  }, [difficulties]);

  const getBaseScoreDisplay = useCallback((field = "baseScore") => {
    if (formData[field] === null) {
      return "";
    }
    const baseScore = parseFloat(formData[field]);
    const matchingDiff = difficulties.find(d => d.baseScore === baseScore);
    return matchingDiff ? matchingDiff.name : formData[field]?.toString();
  }, [formData, difficulties]);

  const handleOpenTagManagement = (e) => {
    if (e) e.stopPropagation();
    setShowTagManagement(true);
  };

  const handleTagSave = async (updatedTags) => {
    setLevelTags(updatedTags);
    // Update the level data if onUpdate is available
    if (onUpdate) {
      await onUpdate({ level: { ...level, tags: updatedTags } });
    }
  };

  const handleRefreshAutoTags = async (e) => {
    if (e) e.stopPropagation();
    if (isRefreshingTags) return;

    setIsRefreshingTags(true);
    try {
      const response = await api.post(`${import.meta.env.VITE_LEVELS}/${level.id}/refresh-tags`);
      if (response.data?.success) {
        const { removedTags, assignedTags } = response.data;
        
        // Build toast message
        const changes = [];
        if (removedTags?.length > 0) {
          changes.push(`Removed: ${removedTags.join(', ')}`);
        }
        if (assignedTags?.length > 0) {
          changes.push(`Added: ${assignedTags.join(', ')}`);
        }
        
        if (changes.length > 0) {
          toast.success(changes.join('\n'), { duration: 4000 });
        } else {
          toast('No tag changes needed', { icon: 'ℹ️' });
        }

        // Fetch updated tags
        const tagsResponse = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/levels/${level.id}/tags`);
        setLevelTags(tagsResponse.data || []);
        // Update the level data if onUpdate is available
        if (onUpdate) {
          await onUpdate({ level: { ...level, tags: tagsResponse.data } });
        }
      }
    } catch (err) {
      console.error('Error refreshing auto tags:', err);
      toast.error(err.response?.data?.error || 'Failed to refresh auto tags');
    } finally {
      setIsRefreshingTags(false);
    }
  };

  const handleOpenUploadManagement = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUploadManagement(true);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  const popupContent = (
    <div className="edit-level-popup-overlay" onClick={handleOverlayClick}>
      <div className={`edit-level-popup ${!isSuperAdmin ? 'creator-limited-mode' : ''}`} onClick={handleContentClick}>
        <div className="popup-header">
          <h2>{tLevel('title')}</h2>
          <div className="popup-actions">
            <button 
              className="manage-aliases-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowAliasManagement(true);
              }}
              title={tLevel('manageAliases')}
              disabled={!isSuperAdmin}
            >
              {tLevel('manageAliases')}
            </button>
            <button 
              className="close-popup-btn" 
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
            >
              {tLevel('close')}
            </button>
          </div>
        </div>
        <div className="popup-content">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className={`form-group ${isFieldAllowed('song') ? 'field-enabled' : ''}`}>
                <label htmlFor="song">{tLevel('form.labels.song')}</label>
                <input
                  type="text"
                  id="song"
                  name="song"
                  value={formData.song}
                  onChange={handleInputChange}
                  disabled={!isFieldAllowed('song')}
                />
              </div>

              <div className={`form-group ${isFieldAllowed('artist') ? 'field-enabled' : ''}`}>
                <label htmlFor="artist">{tLevel('form.labels.artist')}</label>
                <input
                  type="text"
                  id="artist"
                  name="artist"
                  value={formData.artist}
                  onChange={handleInputChange}
                  disabled={!isFieldAllowed('artist')}
                />
              </div>

              <div className={`form-group ${isSuperAdmin ? 'field-enabled' : ''}`}>
                <button 
                className="manage-creators-btn"
                disabled={!isSuperAdmin}
                onClick={() => navigate('/admin/creators?search=' + encodeURIComponent("id:" + level.id))}>
                  Manage Creators
                </button>
              </div>
              {isFromAnnouncementPage &&
              <>
              <div className="form-group">
                <label htmlFor="baseScore">{tLevel('form.labels.previousBaseScore')}</label>
              <RatingInput
                value={(() => {
                  if (formData.previousBaseScore === null) {
                    return "";
                  }
                  return formData.previousBaseScore?.toString();
                })()}
                onChange={handlePreviousBaseScoreChange}
                difficulties={difficulties}
                allowCustomInput={true}
                placeholder={tLevel('form.placeholders.baseScore')}
              />
                {getBaseScoreDisplay('previousBaseScore') !== "" && (
                  <div className="base-score-display">
                    Equal to {getBaseScoreDisplay('previousBaseScore')}
                  </div>
                )}
            </div>
            </>
            }

              <div className={`form-group ${isSuperAdmin ? 'field-enabled' : ''}`}>
                <RatingInput
                  value={(() => {
                    if (formData.baseScore === null) {
                      return "";
                    }
                    return formData.baseScore.toString();
                  })()}
                  onChange={handleBaseScoreChange}
                  difficulties={difficulties}
                  allowCustomInput={true}
                  placeholder={tLevel('form.placeholders.baseScore')}
                  disabled={!isSuperAdmin}
                />
                {getBaseScoreDisplay() !== "" && (
                  <div className="base-score-display">
                    Equal to {getBaseScoreDisplay()}
                  </div>
                )}
              </div>

              <div className={`form-group ${isSuperAdmin ? 'field-enabled' : ''}`}>
                <RatingInput
                  value={getDifficultyName(formData.diffId)}
                  diffId={parseInt(formData.diffId)}
                  onChange={(value) => handleDifficultyChange(value, 'diffId')}
                  difficulties={difficulties}
                  showDiff={true}
                  disabled={!isSuperAdmin}
                />
                {isFromAnnouncementPage ? (
                  <div className="base-score-display">
                    Current
                  </div>
                ) : (
                  <div className="base-score-display">
                    {difficulties.find(d => d.id === parseInt(formData.diffId))?.baseScore} PP
                  </div>
                )}
              </div>

              {isFromAnnouncementPage ? (
                <div className="form-group">
                  <RatingInput
                    value={getDifficultyName(formData.previousDiffId)}
                    diffId={parseInt(formData.previousDiffId)}
                    onChange={(value) => handleDifficultyChange(value, 'previousDiffId')}
                    difficulties={difficulties}
                    showDiff={true}
                    placeholder={tLevel('form.labels.previousDifficulty')}
                  />
                  <div className="base-score-display">
                    Previous
                  </div>
                </div>
              ) : (
                <div className={`to-rate-checkbox-container ${isSuperAdmin ? 'field-enabled' : ''}`}>
                  <div className="to-rate-group">
                    <label className="to-rate-checkbox">
                      <input
                        type="checkbox"
                        name="toRate"
                        checked={formData.toRate}
                        onChange={handleInputChange}
                        disabled={!isSuperAdmin}
                      />
                      {tLevel('form.checkboxes.toRate')}
                    </label>
                    <div className={`rerate-num ${formData.toRate ? 'show' : ''}`}>
                      <input
                        type="text"
                        name="rerateNum"
                        value={formData.rerateNum}
                        onChange={handleInputChange}
                        placeholder={tLevel('form.placeholders.rerateNumber')}
                        disabled={!isSuperAdmin}
                      />
                    </div>
                  </div>
                  <div className={`rerate-reason ${formData.toRate ? 'show' : ''}`}>
                    <input
                      type="text"
                      name="rerateReason"
                      value={formData.rerateReason}
                      onChange={handleInputChange}
                      placeholder={tLevel('form.placeholders.rerateReason')}
                      disabled={!isSuperAdmin}
                    />
                  </div>
                </div>
              )}
              
              <div className={`form-group ${isSuperAdmin ? 'field-enabled' : ''}`}>
                <label htmlFor="ppBaseScore">{tLevel('form.labels.ppBaseScore')}</label>
                <input
                  type="number"
                  id="ppBaseScore"
                  name="ppBaseScore"
                  value={formData.ppBaseScore}
                  onChange={handleInputChange}
                  disabled={!isSuperAdmin}
                />
              </div>
            </div>

            <div className={`form-group ${isSuperAdmin ? 'field-enabled' : ''}`}>
              <label>{tLevel('form.labels.tags')}</label>
              <div className="edit-level-popup__tag-preview-container">
              <button
                  type="button"
                  className="edit-level-popup__manage-tags-button"
                  onClick={handleOpenTagManagement}
                  disabled={!isSuperAdmin}
                >
                  {tLevel('form.buttons.manageTags')}
                </button>
                <div className="edit-level-popup__tag-icons">
                  {levelTags.map(tag => (
                    <div
                      key={tag.id}
                      className="edit-level-popup__tag-icon"
                      style={{
                        backgroundColor: `${tag.color}aa`,
                        '--tag-bg-color': tag.color
                      }}
                      title={tag.name}
                    >
                      {tag.icon ? (
                        <img src={tag.icon} alt={tag.name} />
                      ) : (
                        <span className="edit-level-popup__tag-icon-fallback">
                          {tag.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className={`edit-level-popup__refresh-tags-button ${isRefreshingTags ? 'refreshing' : ''}`}
                  onClick={handleRefreshAutoTags}
                  disabled={isRefreshingTags || !isSuperAdmin}
                  title="Refresh auto-assigned tags"
                >
                  <RefreshIcon color="white" size={16} />
                </button>
              </div>
            </div>

            <div className={`form-group ${isFieldAllowed('videoLink') ? 'field-enabled' : ''}`}>
              <label htmlFor="videoLink">{tLevel('form.labels.videoLink')}</label>
              <input
                type="text"
                id="videoLink"
                name="videoLink"
                value={formData.videoLink}
                onChange={handleInputChange}
                disabled={!isFieldAllowed('videoLink')}
              />
            </div>

            <div className={`form-group ${isFieldAllowed('dlLink') ? 'field-enabled' : ''}`}>
              <label htmlFor="dlLink">{tLevel('form.labels.dlLink')}</label>
              {isCdnUrl(formData.dlLink) ? (
                <div className="edit-level-popup__cdn-managed">
                  <div className="edit-level-popup__cdn-info">
                    <span>CDN Managed File</span>
                    <a href={formData.dlLink} target="_blank" rel="noopener noreferrer">
                      {formData.dlLink}
                    </a>
                  </div>
                  <button
                    className="edit-level-popup__manage-button"
                    onClick={handleOpenUploadManagement}
                    disabled={!isFieldAllowed('dlLink')}
                  >
                    Manage Upload
                  </button>
                </div>
              ) : (
                <>
                <div className="edit-level-popup__dl-link-container">
                  <input
                    type="text"
                    id="dlLink"
                    name="dlLink"
                    value={formData.dlLink}
                    onChange={handleInputChange}
                    placeholder="Download Link"
                    disabled={!isFieldAllowed('dlLink')}
                  />
                  <button
                    className="edit-level-popup__upload-button"
                    onClick={handleOpenUploadManagement}
                    title="Upload Level File"
                    disabled={!isFieldAllowed('dlLink')}
                  >
                    <UploadIcon color="white" size={20} />
                  </button>
                </div>
                <div className={`checkbox-group ${isSuperAdmin ? 'field-enabled' : ''}`}
                  onClick={() => isSuperAdmin && setIsExternallyAvailable(!isExternallyAvailable)}
                  style={{ opacity: !isSuperAdmin ? 0.5 : (isExternallyAvailable ? 1 : 0.5), cursor: !isSuperAdmin ? 'not-allowed' : 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isExternallyAvailable}
                  onChange={() => {}} // Empty handler to prevent warning, actual logic handled by div onClick
                  readOnly
                  disabled={!isSuperAdmin}
                />
                {tLevel('form.labels.isExternallyAvailable')}
            </div> 
                </>
              )}
            </div>

            <div className={`form-group ${isFieldAllowed('workshopLink') ? 'field-enabled' : ''}`}>
              <label htmlFor="workshopLink">{tLevel('form.labels.workshopLink')}</label>
              <input
                type="text"
                id="workshopLink"
                name="workshopLink"
                value={formData.workshopLink}
                onChange={handleInputChange}
                disabled={!isFieldAllowed('workshopLink')}
              />
            </div>

            <div className={`form-group ${isSuperAdmin ? 'field-enabled' : ''}`}>
              <label htmlFor="publicComments">{tLevel('form.labels.publicComments')}</label>
              <textarea
                id="publicComments"
                name="publicComments"
                value={formData.publicComments}
                onChange={handleInputChange}
                disabled={!isSuperAdmin}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            
            <div className="button-group">
              <button type="submit" disabled={isSaving} className="save-button">
                {isSaving ? tLevel('form.buttons.save.saving') : tLevel('form.buttons.save.default')}
              </button>
              {level.isDeleted ? (
                <button 
                  type="button"
                  className="restore-button"
                  onClick={handleRestore}
                  disabled={isSaving}
                >
                  {isSaving ? tLevel('form.buttons.restore.restoring') : tLevel('form.buttons.restore.default')}
                </button>
              ) : level.isHidden ? (
                <button 
                  type="button"
                  className="restore-button"
                  onClick={handleToggleHidden}
                  disabled={isSaving}
                >
                  {isSaving ? tLevel('form.buttons.restore.restoring') : tLevel('form.buttons.restore.default')}
                </button>
              ) : (
                <>
                  {isSuperAdmin ? (
                    <button 
                      type="button" 
                      className={`delete-button ${isHideMode ? 'hide-mode' : ''}`}
                      onClick={handleDelete}
                      disabled={isSaving}
                    >
                      {isSaving ? 
                        (isHideMode ? tLevel('form.buttons.delete.processing') : tLevel('form.buttons.delete.deleting')) : 
                        (isHideMode ? 
                          (level.isHidden ? tLevel('form.buttons.delete.unhide') : tLevel('form.buttons.delete.hide')) : 
                          tLevel('form.buttons.delete.default'))}
                      <div className="toggle-arrow" onClick={toggleMode}></div>
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="delete-button hide-mode"
                      onClick={handleToggleHidden}
                      disabled={isSaving}
                    >
                      {isSaving ? 
                        tLevel('form.buttons.delete.processing') : 
                        (level.isHidden ? tLevel('form.buttons.delete.unhide') : tLevel('form.buttons.delete.hide'))}
                    </button>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      {showAliasManagement && (
        <AliasManagementPopup
          levelId={level.id}
          onClose={() => setShowAliasManagement(false)}
          onAliasesUpdate={(updatedLevel) => {
            if (onUpdate) {
              onUpdate(updatedLevel);
            }
          }}
        />
      )}

      {showUploadManagement && (
        <LevelUploadManagementPopup
          level={level}
          setLevel={onUpdate}
          onClose={() => setShowUploadManagement(false)}
          setFormData={setFormData}
          formData={formData}
        />
      )}

      {showTagManagement && (
        <TagManagementPopup
          levelId={level.id}
          currentTags={levelTags}
          onClose={() => setShowTagManagement(false)}
          onSave={handleTagSave}
        />
      )}
    </div>
  );

  // Use portal to render popup at document.body level to escape stacking context
  return createPortal(popupContent, document.body);
}; 
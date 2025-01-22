import { useState, useEffect, useCallback } from 'react';
import './editlevelpopup.css';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { RatingInput } from '../RatingComponents/RatingInput';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { useTranslation } from 'react-i18next';
import AliasManagementPopup from './AliasManagementPopup';

export const EditLevelPopup = ({ level, onClose, onUpdate, isFromAnnouncementPage = false }) => {
  const { t } = useTranslation('components');
  const tLevel = (key) => t(`levelPopups.edit.${key}`);

  const [formData, setFormData] = useState({
    song: '',
    artist: '',
    creator: '',
    charter: '',
    vfxer: '',
    team: '',
    diffId: '',
    previousDiffId: null,
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
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isHideMode, setIsHideMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const navigate = useNavigate();
  const { difficulties } = useDifficultyContext();
  const [showAliasManagement, setShowAliasManagement] = useState(false);

  useEffect(() => {
    if (level) {
      setFormData({
        song: level.song || '',
        artist: level.artist || '',
        creator: level.creator || '',
        charter: level.charter || '',
        vfxer: level.vfxer || '',
        team: level.team || '',
        diffId: level.diffId !== null ? level.diffId : 0,
        baseScore: level.baseScore || 0,
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
      });
      setHasUnsavedChanges(false);
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

  const handleInputChange = (e) => {
    const { name, type, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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
      if (!isFromAnnouncementPage) {
        formData.previousDiffId = null;
      }
      const response = await api.put(
        `${import.meta.env.VITE_LEVELS}/${level.id}`,
        formData
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
        if (onUpdate) {
          await onUpdate(response.data);
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
        if (onUpdate) {
          const updatedLevel = { ...level, isHidden: response.data.isHidden };
          await onUpdate(updatedLevel);
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
        if (onUpdate) {
          await onUpdate(response.data);
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

  const getBaseScoreDisplay = useCallback(() => {
    if (formData.baseScore === null) {
      return "";
    }
    const baseScore = parseFloat(formData.baseScore);
    const matchingDiff = difficulties.find(d => d.baseScore === baseScore);
    return matchingDiff ? matchingDiff.name : formData.baseScore.toString();
  }, [formData.baseScore, difficulties]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="edit-level-popup-overlay" onClick={handleOverlayClick}>
      <div className="edit-level-popup" onClick={handleContentClick}>
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
              <div className="form-group">
                <label htmlFor="song">{tLevel('form.labels.song')}</label>
                <input
                  type="text"
                  id="song"
                  name="song"
                  value={formData.song}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="artist">{tLevel('form.labels.artist')}</label>
                <input
                  type="text"
                  id="artist"
                  name="artist"
                  value={formData.artist}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="creator">{tLevel('form.labels.creator')}</label>
                <input
                  type="text"
                  id="creator"
                  name="creator"
                  value={formData.creator}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="charter">{tLevel('form.labels.charter')}</label>
                <input
                  type="text"
                  id="charter"
                  name="charter"
                  value={formData.charter}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vfxer">{tLevel('form.labels.vfxer')}</label>
                <input
                  type="text"
                  id="vfxer"
                  name="vfxer"
                  value={formData.vfxer}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="team">{tLevel('form.labels.team')}</label>
                <input
                  type="text"
                  id="team"
                  name="team"
                  value={formData.team}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
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
                />
                {getBaseScoreDisplay() !== "" && (
                  <div className="base-score-display">
                    Equal to {getBaseScoreDisplay()}
                  </div>
                )}
              </div>

              <div className="form-group">
                <RatingInput
                  value={getDifficultyName(formData.diffId)}
                  diffId={parseInt(formData.diffId)}
                  onChange={(value) => handleDifficultyChange(value, 'diffId')}
                  difficulties={difficulties}
                  showDiff={true}
                />
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
                </div>
              ) : (
                <div className="to-rate-checkbox-container">
                  <div className="to-rate-group">
                    <label className="to-rate-checkbox">
                      <input
                        type="checkbox"
                        name="toRate"
                        checked={formData.toRate}
                        onChange={handleInputChange}
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
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="videoLink">{tLevel('form.labels.videoLink')}</label>
              <input
                type="text"
                id="videoLink"
                name="videoLink"
                value={formData.videoLink}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dlLink">{tLevel('form.labels.dlLink')}</label>
              <input
                type="text"
                id="dlLink"
                name="dlLink"
                value={formData.dlLink}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="workshopLink">{tLevel('form.labels.workshopLink')}</label>
              <input
                type="text"
                id="workshopLink"
                name="workshopLink"
                value={formData.workshopLink}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="publicComments">{tLevel('form.labels.publicComments')}</label>
              <textarea
                id="publicComments"
                name="publicComments"
                value={formData.publicComments}
                onChange={handleInputChange}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            
            <div className="button-group">
              <button type="submit" disabled={isSaving} className="save-button">
                {isSaving ? tLevel('form.buttons.save.saving') : tLevel('form.buttons.save.default')}
              </button>
              {level.isDeleted || level.isHidden ? (
                <button 
                  type="button"
                  className="restore-button"
                  onClick={handleRestore}
                  disabled={isSaving}
                >
                  {isSaving ? tLevel('form.buttons.restore.restoring') : tLevel('form.buttons.restore.default')}
                </button>
              ) : (
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
    </div>
  );
}; 
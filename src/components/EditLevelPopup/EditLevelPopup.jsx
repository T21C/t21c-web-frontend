import { useState, useEffect, useCallback } from 'react';
import './editlevelpopup.css';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { RatingInput } from '../RatingComponents/RatingInput';
import { useDifficultyContext } from '@/context/DifficultyContext';

export const EditLevelPopup = ({ level, onClose, onUpdate, isFromAnnouncementPage = false }) => {
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
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { difficulties } = useDifficultyContext();

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
        previousDiffId: level.previousDiffId !== null ? level.previousDiffId : null,
        baseScore: level.baseScore || '',
        videoLink: level.videoLink || '',
        dlLink: level.dlLink || '',
        workshopLink: level.workshopLink || '',
        publicComments: level.publicComments || '',
        rerateNum: level.rerateNum || '',
        toRate: level.toRate || false,
        rerateReason: level.rerateReason || '',
        isDeleted: level.isDeleted || false,
      });
      
    }
  }, [level]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      const response = await api.put(
        `${import.meta.env.VITE_LEVELS}/${level.id}`,
        formData
      );

      if (response.data) {
        onUpdate(response.data);
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update level');
    } finally {
      setIsSaving(false);
    }
  };

  const getDifficultyName = useCallback((diffId) => {
    if (!difficulties) return '';
    const diff = difficulties.find(d => d.id === parseInt(diffId));
    return diff ? diff.name : '';
  }, [difficulties]);

  return (
    <div className="edit-level-popup-overlay">
      <div className="edit-level-popup">
        <button className="close-popup-btn" onClick={onClose}>×</button>
        <div className="popup-content">
          <h2>Edit Level Details</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="song">Song</label>
                <input
                  type="text"
                  id="song"
                  name="song"
                  value={formData.song}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="artist">Artist</label>
                <input
                  type="text"
                  id="artist"
                  name="artist"
                  value={formData.artist}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="creator">Creator</label>
                <input
                  type="text"
                  id="creator"
                  name="creator"
                  value={formData.creator}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="charter">Charter</label>
                <input
                  type="text"
                  id="charter"
                  name="charter"
                  value={formData.charter}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vfxer">VFXer</label>
                <input
                  type="text"
                  id="vfxer"
                  name="vfxer"
                  value={formData.vfxer}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="team">Team</label>
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
                    const baseScore = parseFloat(formData.baseScore);
                    const matchingDiff = difficulties.find(d => d.baseScore === baseScore);
                    return matchingDiff ? matchingDiff.name : formData.baseScore.toString();
                  })()}
                  onChange={handleBaseScoreChange}
                  difficulties={difficulties}
                  allowCustomInput={true}
                  placeholder="Base Score"
                />
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
                    placeholder="Previous Difficulty"
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
                      To Rate
                    </label>
                    <div className={`rerate-num ${formData.toRate ? 'show' : ''}`}>
                      <input
                        type="text"
                        name="rerateNum"
                        value={formData.rerateNum}
                        onChange={handleInputChange}
                        placeholder="Rerate #"
                      />
                    </div>
                  </div>
                  <div className={`rerate-reason ${formData.toRate ? 'show' : ''}`}>
                    <input
                      type="text"
                      name="rerateReason"
                      value={formData.rerateReason}
                      onChange={handleInputChange}
                      placeholder="Rerate Reason"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="videoLink">Video Link</label>
              <input
                type="text"
                id="videoLink"
                name="videoLink"
                value={formData.videoLink}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dlLink">Download Link</label>
              <input
                type="text"
                id="dlLink"
                name="dlLink"
                value={formData.dlLink}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="workshopLink">Workshop Link</label>
              <input
                type="text"
                id="workshopLink"
                name="workshopLink"
                value={formData.workshopLink}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="publicComments">Public Comments</label>
              <textarea
                id="publicComments"
                name="publicComments"
                value={formData.publicComments}
                onChange={handleInputChange}
              />
            </div>

            {error && <div className="error-message">{error}</div>}
            
            <div className="button-group">
              <button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="delete-button"
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 
import { useState, useEffect, useCallback } from 'react';
import './editlevelpopup.css';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import { RatingInput } from '../RatingComponents/RatingInput';

export const EditLevelPopup = ({ level, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    song: '',
    artist: '',
    creator: '',
    charter: '',
    vfxer: '',
    team: '',
    diffId: '',
    baseScore: '',
    vidLink: '',
    dlLink: '',
    workshopLink: '',
    publicComments: '',
    rerateNum: '',
    toRate: false,
    rerateReason: '',
    isDeleted: false,
  });

  const [difficulties, setDifficulties] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDifficulties = async () => {
      try {
        const response = await api.get('/v2/data/diffs');
        setDifficulties(response.data);
      } catch (err) {
        console.error('Failed to fetch difficulties:', err);
        setError('Failed to load difficulties');
      }
    };
    fetchDifficulties();
  }, []);

  useEffect(() => {
    if (level) {
      setFormData({
        song: level.song || '',
        artist: level.artist || '',
        creator: level.creator || '',
        charter: level.charter || '',
        vfxer: level.vfxer || '',
        team: level.team || '',
        diffId: level.diffId || '',
        baseScore: level.baseScore || '',
        vidLink: level.vidLink || '',
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

  const handleDifficultyChange = (e) => {
    const newDiffId = e.target.value;
    const newDiff = difficulties.filter(diff => diff.id === newDiffId)[0];
    const currentDiff = difficulties.filter(diff => diff.id === formData.diffId)[0];
    console.log(difficulties);
    
    console.log(newDiff, currentDiff);
    setFormData(prev => ({
      ...prev,
      diffId: newDiffId,
      baseScore: (prev.baseScore === currentDiff?.baseScore) 
        ? newDiff?.baseScore || ''
        : prev.baseScore
    }));
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
                <input
                  id="baseScore"
                  name="baseScore"
                  value={formData.baseScore}
                  onChange={handleInputChange}
                  placeholder="Base Score"
                />
              </div>

              <div className="form-group">
                <RatingInput
                  value={difficulties.find(d => d.id === formData.diffId)?.name || ''}
                  onChange={(value) => {
                    const selectedDiff = difficulties.find(d => d.name === value);
                    if (selectedDiff) {
                      const newDiffId = selectedDiff.id;
                      const currentDiff = difficulties.find(diff => diff.id === formData.diffId);
                      
                      setFormData(prev => ({
                        ...prev,
                        diffId: newDiffId,
                        baseScore: (prev.baseScore === currentDiff?.baseScore) 
                          ? selectedDiff?.baseScore || ''
                          : prev.baseScore
                      }));
                    }
                  }}
                  difficulties={difficulties}
                  showDiff={true}
                />
              </div>

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
            </div>

            <div className="form-group">
              <label htmlFor="vidLink">Video Link</label>
              <input
                type="text"
                id="vidLink"
                name="vidLink"
                value={formData.vidLink}
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
              <button 
                type="submit" 
                className="save-button"
                disabled={isSaving}
              >
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
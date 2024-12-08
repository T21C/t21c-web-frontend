import { useState, useEffect, useCallback } from 'react';
import './editchartpopup.css';
import { RatingInput } from '../RatingComponents/RatingInput';
import { parseBaseScore } from '../../Repository/RemoteRepository';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

export const EditChartPopup = ({ chart, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    song: '',
    artist: '',
    creator: '',
    charter: '',
    vfxer: '',
    team: '',
    diff: '',
    pguDiff: '',
    newDiff: '',
    baseScore: '',
    baseScoreDiff: '',
    dlLink: '',
    workshopLink: '',
    vidLink: '',
    publicComments: '',
    rerateNum: "",
    toRate: false,
    rerateReason: '',
    isDeleted: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (chart) {
      console.log("chart", chart);
      setFormData({
        song: chart.song || '',
        artist: chart.artist || '',
        creator: chart.creator || '',
        charter: chart.charter || '',
        vfxer: chart.vfxer || '',
        team: chart.team || '',
        diff: chart.diff || '',
        pguDiff: chart.pguDiff || '',
        newDiff: chart.newDiff || '',
        baseScore: chart.baseScore || '',
        baseScoreDiff: chart.baseScoreDiff || '',
        dlLink: chart.dlLink || '',
        workshopLink: chart.workshopLink || '',
        vidLink: chart.vidLink || '',
        publicComments: chart.publicComments || '',
        rerateNum: chart.rerateNum || '',
        toRate: chart.toRate || false,
        rerateReason: chart.rerateReason || '',
        isDeleted: chart.isDeleted || false
      });
    }
  }, [chart]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePguDiffChange = (value) => {
    setFormData(prev => {
      const shouldSyncBaseScore = !prev.baseScoreDiff || 
        prev.baseScoreDiff === prev.pguDiff;

      return {
        ...prev,
        pguDiff: value,
        baseScoreDiff: shouldSyncBaseScore ? value : prev.baseScoreDiff
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await api.put(
        `${import.meta.env.VITE_INDIVIDUAL_LEVEL}${chart.id}`,
        formData
      );

      if (response.data) {
        onUpdate(response.data);
        onClose();
      }
    } catch (err) {
      console.log(err)
      setError(err.response?.data?.message || 'Failed to update chart');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this chart? This can be undone later.')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await api.patch(
        `${import.meta.env.VITE_INDIVIDUAL_LEVEL}${chart.id}/soft-delete`
      );
      if (response.data) {
        if (onUpdate) {
          await onUpdate(response.data.deletedChart);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to delete chart');
    } finally {
      setIsSaving(false);
    }
  }, [chart.id, onClose, onUpdate]);

  const handleRestore = useCallback(async () => {
    if (!window.confirm('Are you sure you want to restore this chart?')) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await api.patch(
        `${import.meta.env.VITE_INDIVIDUAL_LEVEL}${chart.id}/restore`
      );
      if (response.data) {
        if (onUpdate) {
          await onUpdate(response.data.restoredChart);
        }
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to restore chart');
    } finally {
      setIsSaving(false);
    }
  }, [chart.id, onClose, onUpdate]);

  return (
    <div className="edit-popup-overlay">
      <div className="edit-popup">
        <button 
          className="close-popup-btn"
          onClick={onClose}
          aria-label="Close popup"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="popup-content">
          <h2>Edit Chart Details</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="song">Song Name</label>
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
                <label htmlFor="baseScore">Base Score</label>
                <RatingInput
                  value={formData.baseScoreDiff.toString()}
                  onChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      baseScoreDiff: value
                    }));
                  }}
                />
                <div className="calculated-score">
                  Calculated Score: {parseBaseScore(formData.baseScoreDiff)}
                </div>
              </div>
              {/*
              <div className="form-group">
                <label htmlFor="diff">Legacy Difficulty</label>
                <RatingInput
                  value={formData.diff.toString()}
                  onChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      diff: value
                    }));
                  }}
                  isLegacy={true}
                />
              </div>
              */}

              <div className="form-group">
                <label htmlFor="pguDiff">PGU Difficulty</label>
                <div className="difficulty-row">
                  <RatingInput
                    value={formData.pguDiff.toString()}
                    onChange={handlePguDiffChange}
                  />
                  
                </div>
              </div>
              <div className="form-group to-rate-checkbox-container">
                <div className="to-rate-top-row">
                  <div className="to-rate-group">
                    <div 
                      className="to-rate-checkbox"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          toRate: !prev.toRate
                        }));
                      }}
                    >
                      <input
                        type="checkbox"
                        name="toRate"
                        checked={formData.toRate}
                        onChange={handleInputChange}
                        onClick={(e) => e.stopPropagation()}
                      />
                      To Rate
                    </div>
                    <div className={`rerate-num ${formData.toRate ? 'show' : ''}`}>
                      <input
                        type="text"
                        id="rerateNum"
                        name="rerateNum"
                        value={formData.rerateNum}
                        onChange={handleInputChange}
                        placeholder="Rerate Number..."
                      />
                    </div>
                  </div>
                </div>
                <div className={`rerate-reason ${formData.toRate ? 'show' : ''}`}>
                  <input
                    type="text"
                    id="rerateReason"
                    name="rerateReason"
                    value={formData.rerateReason}
                    onChange={handleInputChange}
                    placeholder="Reason for rerating..."
                  />
                </div>
              </div>
            </div>

            <div className="form-links">
              <div className="form-group">
                <label htmlFor="dlLink">Download Link</label>
                <input
                  type="url"
                  id="dlLink"
                  name="dlLink"
                  value={formData.dlLink}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="workshopLink">Workshop Link</label>
                <input
                  type="url"
                  id="workshopLink"
                  name="workshopLink"
                  value={formData.workshopLink}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="vidLink">Video Link</label>
                <input
                  type="url"
                  id="vidLink"
                  name="vidLink"
                  value={formData.vidLink}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="publicComments">Public Comments</label>
              <input
                type="text"
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
              
              {formData.isDeleted ? (
                <button 
                  type="button"
                  className="delete-button"
                  onClick={handleRestore}
                  disabled={isSaving}
                  style={{backgroundColor: "#28a745"}}
                >
                  {isSaving ? 'Restoring...' : 'Restore Chart'}
                </button>
              ) : (
                <button 
                  type="button"
                  className="delete-button"
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  {isSaving ? 'Deleting...' : 'Delete Chart'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}; 
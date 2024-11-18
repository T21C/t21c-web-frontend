import { useState, useEffect } from 'react';
import './editchartpopup.css';
import axios from 'axios';
import { RatingInput } from '../RatingComponents/RatingInput';

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
    dlLink: '',
    workshopLink: '',
    vidLink: '',
    publicComments: '',
    toRate: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (chart) {
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
        dlLink: chart.dlLink || '',
        workshopLink: chart.workshopLink || '',
        vidLink: chart.vidLink || '',
        publicComments: chart.publicComments || '',
        toRate: chart.toRate || false
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await axios.put(
        `${import.meta.env.VITE_INDIVIDUAL_LEVEL}${chart._id}`,
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

              <div className="form-group">
                <label htmlFor="pguDiff">PGU Difficulty</label>
                <RatingInput
                  value={formData.pguDiff.toString()}
                  onChange={(value) => {
                    setFormData(prev => ({
                      ...prev,
                      pguDiff: value
                    }));
                  }}
                />
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
              <textarea
                id="publicComments"
                name="publicComments"
                value={formData.publicComments}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  name="toRate"
                  checked={formData.toRate}
                  onChange={handleInputChange}
                />
                To Rate
              </label>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button 
              type="submit" 
              className="save-button"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}; 
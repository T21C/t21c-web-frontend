import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { ProfileSelector } from '../ProfileSelector/ProfileSelector';
import './submissionform.css';

const SubmissionForm = ({
  type, // 'level' or 'pass'
  onSubmit,
  initialValues = {},
  disabled = false

}) => {
  const { t } = useTranslation('components');
  const tForm = (key) => t(`submissionForm.${key}`);

  const [form, setForm] = useState({
    // Common fields
    videoLink: initialValues.videoLink || '',
    
    // Level submission fields
    artist: initialValues.artist || '',
    song: initialValues.song || '',
    charter: initialValues.charter || null,
    vfxer: initialValues.vfxer || null,
    team: initialValues.team || null,
    diff: initialValues.diff || '',
    dlLink: initialValues.dlLink || '',
    workshopLink: initialValues.workshopLink || '',
    
    // Pass submission fields
    levelId: initialValues.levelId || '',
    speed: initialValues.speed || '',
    feelingRating: initialValues.feelingRating || '',
    ePerfect: initialValues.ePerfect || '',
    perfect: initialValues.perfect || '',
    lPerfect: initialValues.lPerfect || '',
    tooEarly: initialValues.tooEarly || '',
    early: initialValues.early || '',
    late: initialValues.late || '',
    isNoHold: initialValues.isNoHold || false,
    is12K: initialValues.is12K || false,
    is16K: initialValues.is16K || false
  });

  const [errors, setErrors] = useState({});
  const [pendingProfiles, setPendingProfiles] = useState([]);

  // Validate form based on type
  const validateForm = () => {
    const newErrors = {};
    
    // Common validation
    if (!form.videoLink) {
      newErrors.videoLink = tForm('errors.required');
    }

    if (type === 'level') {
      // Level submission validation
      if (!form.artist) newErrors.artist = tForm('errors.required');
      if (!form.song) newErrors.song = tForm('errors.required');
      if (!form.diff) newErrors.diff = tForm('errors.required');
      if (!form.dlLink && !form.workshopLink) {
        newErrors.dlLink = tForm('errors.requiredEither');
        newErrors.workshopLink = tForm('errors.requiredEither');
      }
      
      // Profile validations
      if (!form.charter) newErrors.charter = tForm('errors.required');
      if (form.charter?.isNewRequest) {
        setPendingProfiles(prev => [...prev.filter(p => p.type !== 'charter'), form.charter]);
      }
      if (form.vfxer?.isNewRequest) {
        setPendingProfiles(prev => [...prev.filter(p => p.type !== 'vfx'), form.vfxer]);
      }
      if (form.team?.isNewRequest) {
        setPendingProfiles(prev => [...prev.filter(p => p.type !== 'team'), form.team]);
      }
    } else {
      // Pass submission validation
      if (!form.levelId) newErrors.levelId = tForm('errors.required');
      if (!form.speed) newErrors.speed = tForm('errors.required');
      if (!form.feelingRating) newErrors.feelingRating = tForm('errors.required');
      
      // Judgement validation
      ['ePerfect', 'perfect', 'lPerfect', 'tooEarly', 'early', 'late'].forEach(field => {
        if (!form[field]) newErrors[field] = tForm('errors.required');
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Check for pending profiles
    if (pendingProfiles.length > 0) {
      setErrors({
        submit: tForm('errors.pendingProfiles')
      });
      return;
    }

    try {
      await onSubmit(form);
      // Reset form after successful submission
      setForm({
        videoLink: '',
        artist: '',
        song: '',
        charter: null,
        vfxer: null,
        team: null,
        diff: '',
        dlLink: '',
        workshopLink: '',
        levelId: '',
        speed: '',
        feelingRating: '',
        ePerfect: '',
        perfect: '',
        lPerfect: '',
        tooEarly: '',
        early: '',
        late: '',
        isNoHold: false,
        is12K: false,
        is16K: false
      });
      setPendingProfiles([]);
    } catch (error) {
      setErrors({
        submit: error.message || tForm('errors.submitFailed')
      });
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle profile selection
  const handleProfileChange = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="submission-form">
      {/* Common Fields */}
      <div className="form-section">
        <h3>{tForm('sections.common')}</h3>
        <div className="form-group">
          <label htmlFor="videoLink">{tForm('fields.videoLink')}</label>
          <input
            type="text"
            id="videoLink"
            name="videoLink"
            value={form.videoLink}
            onChange={handleChange}
            disabled={disabled}
            className={errors.videoLink ? 'error' : ''}
          />
          {errors.videoLink && <span className="error-message">{errors.videoLink}</span>}
        </div>
      </div>

      {type === 'level' ? (
        <>
          {/* Level Submission Fields */}
          <div className="form-section">
            <h3>{tForm('sections.levelDetails')}</h3>
            
            <div className="form-group">
              <label htmlFor="song">{tForm('fields.song')}</label>
              <input
                type="text"
                id="song"
                name="song"
                value={form.song}
                onChange={handleChange}
                disabled={disabled}
                className={errors.song ? 'error' : ''}
              />
              {errors.song && <span className="error-message">{errors.song}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="artist">{tForm('fields.artist')}</label>
              <input
                type="text"
                id="artist"
                name="artist"
                value={form.artist}
                onChange={handleChange}
                disabled={disabled}
                className={errors.artist ? 'error' : ''}
              />
              {errors.artist && <span className="error-message">{errors.artist}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="charter">{tForm('fields.charter')}</label>
              <ProfileSelector
                type="charter"
                value={form.charter}
                onChange={(value) => handleProfileChange('charter', value)}
                disabled={disabled}
                required
                className={errors.charter ? 'error' : ''}
              />
              {errors.charter && <span className="error-message">{errors.charter}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="vfxer">{tForm('fields.vfxer')}</label>
              <ProfileSelector
                type="vfx"
                value={form.vfxer}
                onChange={(value) => handleProfileChange('vfxer', value)}
                disabled={disabled}
              />
            </div>

            <div className="form-group">
              <label htmlFor="team">{tForm('fields.team')}</label>
              <ProfileSelector
                type="team"
                value={form.team}
                onChange={(value) => handleProfileChange('team', value)}
                disabled={disabled}
              />
            </div>

            <div className="form-group">
              <label htmlFor="diff">{tForm('fields.diff')}</label>
              <input
                type="text"
                id="diff"
                name="diff"
                value={form.diff}
                onChange={handleChange}
                disabled={disabled}
                className={errors.diff ? 'error' : ''}
              />
              {errors.diff && <span className="error-message">{errors.diff}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="dlLink">{tForm('fields.dlLink')}</label>
              <input
                type="text"
                id="dlLink"
                name="dlLink"
                value={form.dlLink}
                onChange={handleChange}
                disabled={disabled}
                className={errors.dlLink ? 'error' : ''}
              />
              {errors.dlLink && <span className="error-message">{errors.dlLink}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="workshopLink">{tForm('fields.workshopLink')}</label>
              <input
                type="text"
                id="workshopLink"
                name="workshopLink"
                value={form.workshopLink}
                onChange={handleChange}
                disabled={disabled}
                className={errors.workshopLink ? 'error' : ''}
              />
              {errors.workshopLink && <span className="error-message">{errors.workshopLink}</span>}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Pass Submission Fields */}
          <div className="form-section">
            <h3>{tForm('sections.passDetails')}</h3>
            
            <div className="form-group">
              <label htmlFor="levelId">{tForm('fields.levelId')}</label>
              <input
                type="text"
                id="levelId"
                name="levelId"
                value={form.levelId}
                onChange={handleChange}
                disabled={disabled}
                className={errors.levelId ? 'error' : ''}
              />
              {errors.levelId && <span className="error-message">{errors.levelId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="speed">{tForm('fields.speed')}</label>
              <input
                type="text"
                id="speed"
                name="speed"
                value={form.speed}
                onChange={handleChange}
                disabled={disabled}
                className={errors.speed ? 'error' : ''}
              />
              {errors.speed && <span className="error-message">{errors.speed}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="feelingRating">{tForm('fields.feelingRating')}</label>
              <input
                type="text"
                id="feelingRating"
                name="feelingRating"
                value={form.feelingRating}
                onChange={handleChange}
                disabled={disabled}
                className={errors.feelingRating ? 'error' : ''}
              />
              {errors.feelingRating && <span className="error-message">{errors.feelingRating}</span>}
            </div>

            <div className="form-section">
              <h4>{tForm('sections.judgements')}</h4>
              <div className="judgements-grid">
                {['ePerfect', 'perfect', 'lPerfect', 'tooEarly', 'early', 'late'].map(field => (
                  <div key={field} className="form-group">
                    <label htmlFor={field}>{tForm(`fields.${field}`)}</label>
                    <input
                      type="text"
                      id={field}
                      name={field}
                      value={form[field]}
                      onChange={handleChange}
                      disabled={disabled}
                      className={errors[field] ? 'error' : ''}
                    />
                    {errors[field] && <span className="error-message">{errors[field]}</span>}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group checkboxes">
              <label>
                <input
                  type="checkbox"
                  name="isNoHold"
                  checked={form.isNoHold}
                  onChange={handleChange}
                  disabled={disabled}
                />
                {tForm('fields.isNoHold')}
              </label>
              
              <label>
                <input
                  type="checkbox"
                  name="is12K"
                  checked={form.is12K}
                  onChange={handleChange}
                  disabled={disabled || form.is16K}
                />
                {tForm('fields.is12K')}
              </label>
              
              <label>
                <input
                  type="checkbox"
                  name="is16K"
                  checked={form.is16K}
                  onChange={handleChange}
                  disabled={disabled || form.is12K}
                />
                {tForm('fields.is16K')}
              </label>
            </div>
          </div>
        </>
      )}

      {/* Submit Button */}
      <div className="form-actions">
        {errors.submit && <div className="error-message submit-error">{errors.submit}</div>}
        {pendingProfiles.length > 0 && (
          <div className="pending-profiles-warning">
            {tForm('warnings.pendingProfiles')}
            <ul>
              {pendingProfiles.map((profile, index) => (
                <li key={index}>
                  {profile.type}: {profile.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button 
          type="submit" 
          disabled={disabled || pendingProfiles.length > 0}
          className="submit-button"
        >
          {tForm('submit')}
        </button>
      </div>
    </form>
  );
};

SubmissionForm.propTypes = {
  type: PropTypes.oneOf(['level', 'pass']).isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialValues: PropTypes.object,
  disabled: PropTypes.bool
};

export default SubmissionForm; 
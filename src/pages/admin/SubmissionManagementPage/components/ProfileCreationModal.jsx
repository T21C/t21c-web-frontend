import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import './profilecreationmodal.css';

export const ProfileCreationModal = ({ profiles, onComplete, onCancel }) => {
  const { t } = useTranslation(['components', 'common']);

  const [createdProfiles, setCreatedProfiles] = useState([]);
  const [currentProfile, setCurrentProfile] = useState(0);
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getEndpoint = (type) => {
    switch (type) {
      case 'charter':
        return `${import.meta.env.VITE_API}/players`;
      case 'vfx':
        return `${import.meta.env.VITE_API}/players`;
      case 'team':
        return `${import.meta.env.VITE_API}/teams`;
      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const profile = profiles[currentProfile];
      const endpoint = getEndpoint(profile.type);
      
      if (!endpoint) {
        throw new Error('Invalid profile type');
      }

      const response = await api.post(endpoint, {
        ...formData,
        name: profile.name,
        // Add role for players if they're charters or VFX artists
        ...(profile.type === 'charter' ? { roles: ['charter'] } : {}),
        ...(profile.type === 'vfx' ? { roles: ['vfx'] } : {})
      });

      const newProfile = {
        type: profile.type,
        id: response.data.id,
        name: profile.name
      };

      setCreatedProfiles(prev => [...prev, newProfile]);

      // Move to next profile or complete
      if (currentProfile < profiles.length - 1) {
        setCurrentProfile(prev => prev + 1);
        setFormData({});
      } else {
        onComplete([...createdProfiles, newProfile]);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Error creating profile');
    } finally {
      setIsLoading(false);
    }
  };

  const profile = profiles[currentProfile];
  const isLastProfile = currentProfile === profiles.length - 1;

  return (
    <div className="profile-creation-modal">
      <div className="modal-content">
        <h2>{t('profileCreationModal.title')}</h2>
        <p className="progress">
          {t('profileCreationModal.progress', { current: currentProfile + 1, total: profiles.length })}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="profile-info">
            <h3>{t('profileCreationModal.profileTypes.' + profile.type)}</h3>
            <p className="profile-name">{profile.name}</p>
          </div>

          {(profile.type === 'charter' || profile.type === 'vfx') && (
            <>
              <div className="form-group">
                <label htmlFor="discordId">{t('profileCreationModal.fields.discordId')}</label>
                <input
                  type="text"
                  id="discordId"
                  name="discordId"
                  value={formData.discordId || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="country">{t('profileCreationModal.fields.country')}</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.country || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </>
          )}

          {profile.type === 'team' && (
            <div className="form-group">
              <label htmlFor="description">{t('profileCreationModal.fields.description')}</label>
              <textarea
                id="description"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                required
              />
            </div>
          )}

          {error && <p className="error-message">{error}</p>}

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onCancel}
              className="cancel-btn"
              disabled={isLoading}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button 
              type="submit"
              className="submit-btn"
              disabled={isLoading}
            >
              {isLoading ? t('loading.creating', { ns: 'common' }) : 
               isLastProfile ? t('profileCreationModal.buttons.finish') : t('profileCreationModal.buttons.next')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

ProfileCreationModal.propTypes = {
  profiles: PropTypes.arrayOf(PropTypes.shape({
    type: PropTypes.oneOf(['charter', 'vfx', 'team']).isRequired,
    name: PropTypes.string.isRequired
  })).isRequired,
  onComplete: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
}; 
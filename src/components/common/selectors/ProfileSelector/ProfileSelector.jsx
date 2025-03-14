import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import api from '../../../../utils/api';
import './profileselector.css';
import { useTranslation } from 'react-i18next';

export const ProfileSelector = ({
  type, // 'player', 'charter', 'vfx', 'team'
  value,
  onChange,
  required,
  placeholder,
  className,
  disabled
}) => {
  const { t } = useTranslation('components');
  const tSelector = (key) => t(`profileSelector.${key}`) || key;
  const selectorRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isRequestingNew, setIsRequestingNew] = useState(false);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync searchTerm with external value changes
  useEffect(() => {
    if (value?.name) {
      setSearchTerm(value.name);
      setIsRequestingNew(value.isNewRequest || false);
    }
  }, [value]);

  // Get API endpoint based on type
  const getEndpoint = () => {
    switch (type) {
      case 'player':
        return import.meta.env.VITE_PLAYERS;
      case 'charter':
        return import.meta.env.VITE_CREATORS;
      case 'vfx':
        return import.meta.env.VITE_CREATORS;
      case 'team':
        return import.meta.env.VITE_TEAMS;
      default:
        return '';
    }
  };

  // Search profiles
  useEffect(() => {
    const searchProfiles = async () => {
      if (!searchTerm || searchTerm.length < 2) {
        setProfiles([]);
        return;
      }

      setLoading(true);
      try {
        const endpoint = getEndpoint();
        const encodedSearchTerm = encodeURIComponent(searchTerm);
        const response = await api.get(`${endpoint}/search/${encodedSearchTerm}`);
        setProfiles(response.data);
      } catch (error) {
        console.error('Error searching profiles:', error);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProfiles, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, type]);

  // Handle profile selection
  const handleSelect = (profile) => {
    setSelectedProfile(profile);
    setSearchTerm(profile.name);
    setShowDropdown(false);
    setIsRequestingNew(false);
    onChange({
      id: profile.id,
      name: profile.name,
      type: profile.type || type,
      isNewRequest: false
    });
  };

  // Handle new profile request
  const handleRequestNew = () => {
    setIsRequestingNew(true);
    setShowDropdown(false);
    setSelectedProfile(null);
    onChange({
      id: null,
      name: searchTerm,
      type: type,
      isNewRequest: true
    });
  };

  return (
    <div className={`profile-selector ${className || ''}`} ref={selectorRef}>
      <div className="profile-selector-input-container">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
            setIsRequestingNew(false);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder || tSelector('placeholder')}
          disabled={disabled}
          required={required}
          className={`profile-selector-input ${isRequestingNew ? 'requesting-new' : ''}`}
        />
        {isRequestingNew && (
          <span className="profile-selector-new-badge">
            {type === 'team' ? tSelector('newTeamRequest') : tSelector('newRequest')}
          </span>
        )}
      </div>

      {showDropdown && searchTerm.length >= 1 && !disabled && (
        <div className="profile-selector-dropdown">
          {loading ? (
            <div className="profile-selector-loading">
              {tSelector('loading')}
            </div>
          ) : (
            <>
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="profile-selector-option"
                  onClick={() => handleSelect(profile)}
                >
                  {profile.name}
                  {profile.type && <span className="profile-type">{profile.type}</span>}
                </div>
              ))}
              {searchTerm.length >= 2 && (
                <div className="profile-selector-request">
                  {profiles.length === 0 && (
                    <div className="profile-selector-no-results">
                      {type === 'team' ? tSelector('noTeamsResults') : tSelector('noResults')}
                    </div>
                  )}
                  <button
                    className="profile-selector-request-new"
                    onClick={handleRequestNew}
                  >
                    {type === 'team' ? tSelector('requestNewTeam') : tSelector('requestNew')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

ProfileSelector.propTypes = {
  type: PropTypes.oneOf(['player', 'charter', 'vfx', 'team']).isRequired,
  value: PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    type: PropTypes.string,
    isNewRequest: PropTypes.bool
  }),
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  placeholder: PropTypes.string,
  className: PropTypes.string,
  disabled: PropTypes.bool
};

import { routes } from '@/api/routes';
// tuf-search: #ProfileSelector #profileSelector #selectors
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import api from '@/utils/api';
import './profileselector.css';
import { useTranslation } from 'react-i18next';
import { userAvatarDisplayUrl } from '@/utils/playerAvatarDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { isTufStellarEnabledForUser } from '@/utils/tufStellarFeature';

export const ProfileSelector = ({
  type, // 'player', 'charter', 'vfx', 'team', 'user'
  value,
  onChange,
  required,
  placeholder,
  className,
  disabled
}) => {
  const { t } = useTranslation('components');
  const { user } = useAuth();
  const selectorRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
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
    if (value?.name != null && String(value.name).trim() !== '') {
      setSearchTerm(value.name);
      setIsRequestingNew(Boolean(value.isNewRequest));
    } else {
      setSearchTerm('');
      setIsRequestingNew(false);
    }
  }, [value]);

  // Get API endpoint based on type
  // Players use the v3 Elasticsearch-backed endpoint; other profile types keep their v2 paths.
  const getEndpoint = () => {
    switch (type) {
      case 'player':
        return routes.playersV3.root();
      case 'charter':
        return routes.database.creators.root();
      case 'vfx':
        return routes.database.creators.root();
      case 'team':
        return routes.database.creators.teams.root();
      case 'user':
        return null;
      default:
        return '';
    }
  };

  // Search profiles
  useEffect(() => {
    const searchProfiles = async () => {
      const trimmed = searchTerm.trim();
      if (type === 'user') {
        if (!isTufStellarEnabledForUser(user)) {
          setProfiles([]);
          setLoading(false);
          return;
        }
        if (!trimmed || trimmed.length < 2) {
          setProfiles([]);
          return;
        }
      } else if (!searchTerm || searchTerm.length < 1) {
        setProfiles([]);
        return;
      }

      setLoading(true);
      try {
        if (type === 'user') {
          const response = await api.get(routes.billingV3.recipientSearch(), {
            params: { q: trimmed },
          });
          const rows = Array.isArray(response.data?.users) ? response.data.users : [];
          setProfiles(rows);
        } else {
          const endpoint = getEndpoint();
          if (!endpoint) {
            setProfiles([]);
            return;
          }
          const encodedSearchTerm = encodeURIComponent(searchTerm);
          // v3 player search uses `/search?query=`; other endpoints keep `/search/:name`.
          const url = type === 'player'
            ? `${endpoint}/search?query=${encodedSearchTerm}`
            : `${endpoint}/search/${encodedSearchTerm}`;
          const response = await api.get(url);
          if (type === 'player') {
            const body = response.data;
            const rows = Array.isArray(body) ? body : (body?.results ?? []);
            // v3 returns flat player docs directly — no `player` wrapper.
            setProfiles(rows);
          } else {
            setProfiles(response.data);
          }
        }
      } catch (error) {
        console.error('Error searching profiles:', error);
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProfiles, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, type, user]);

  // Handle profile selection
  const handleSelect = (profile) => {
    if (type === 'user') {
      const primary = profile.username || profile.nickname || profile.id;
      setSearchTerm(primary);
      setShowDropdown(false);
      setIsRequestingNew(false);
      onChange({
        id: profile.id,
        name: primary,
        type: 'user',
        isNewRequest: false,
        playerId: profile.playerId ?? null,
        username: profile.username ?? null,
        nickname: profile.nickname ?? null,
        avatarUrl: profile.avatarUrl ?? null,
      });
      return;
    }
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
    if (type === 'user') return;
    setIsRequestingNew(true);
    setShowDropdown(false);
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
          autoComplete='profile-selector'
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
            setIsRequestingNew(false);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder || t('profileSelector.placeholder')}
          disabled={disabled}
          required={required}
          className={`profile-selector-input ${isRequestingNew ? 'requesting-new' : ''}`}
        />
        {isRequestingNew && (
          <span className="profile-selector-new-badge">
            {type === 'team' ? t('profileSelector.newTeamRequest') : t('profileSelector.newRequest')}
          </span>
        )}
      </div>

      {showDropdown && !disabled && (type === 'user' ? searchTerm.trim().length >= 2 : searchTerm.length >= 1) ? (
        <div className="profile-selector-dropdown">
          {loading ? (
            <div className="profile-selector-loading">
              {t('profileSelector.loading')}
            </div>
          ) : (
            <>
              {type === 'user'
                ? profiles.map((profile) => {
                    const avatarSrc = userAvatarDisplayUrl(profile);
                    const primary = profile.username || profile.nickname || profile.id;
                    const showSecondary = profile.nickname && profile.username && profile.nickname !== profile.username;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        className="profile-selector-option profile-selector-option--user"
                        onClick={() => handleSelect(profile)}
                      >
                        <span className="profile-selector-user-row">
                          {avatarSrc ? (
                            <img
                              className="profile-selector-user-avatar"
                              src={avatarSrc}
                              alt=""
                            />
                          ) : (
                            <span className="profile-selector-user-avatar profile-selector-user-avatar--placeholder" aria-hidden />
                          )}
                          <span className="profile-selector-user-text">
                            <span className="profile-selector-user-primary">{primary}</span>
                            {showSecondary ? (
                              <span className="profile-selector-user-secondary">{profile.nickname}</span>
                            ) : null}
                          </span>
                        </span>
                      </button>
                    );
                  })
                : profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="profile-selector-option"
                      onClick={() => handleSelect(profile)}
                    >
                      {profile.name}
                      {profile.type && <span className="profile-type">{profile.type}</span>}
                    </div>
                  ))}
              {type !== 'user' && searchTerm.length >= 1 ? (
                <div className="profile-selector-request">
                  {profiles.length === 0 && (
                    <div className="profile-selector-no-results">
                      {type === 'team' ? t('profileSelector.noTeamsResults') : t('profileSelector.noResults')}
                    </div>
                  )}
                  <button
                    type="button"
                    className="profile-selector-request-new"
                    onClick={handleRequestNew}
                  >
                    {type === 'team' ? t('profileSelector.requestNewTeam') : t('profileSelector.requestNew')}
                  </button>
                </div>
              ) : null}
              {type === 'user' && !loading && profiles.length === 0 && searchTerm.trim().length >= 2 ? (
                <div className="profile-selector-no-results profile-selector-no-results--standalone">
                  {t('profileSelector.noResults')}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

ProfileSelector.propTypes = {
  type: PropTypes.oneOf(['player', 'charter', 'vfx', 'team', 'user']).isRequired,
  value: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
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

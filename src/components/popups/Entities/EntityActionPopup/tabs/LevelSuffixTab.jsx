import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import { toast } from 'react-hot-toast';


const getErrorMessage = (error, defaultMessage) => {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.message) {
    return error.message;
  }
  return defaultMessage;
};

export const LevelSuffixTab = ({
  song,
  onUpdate,
  isLoading,
  tEntity
}) => {
  const { t } = useTranslation(['components', 'common']);
  const [newSuffix, setNewSuffix] = useState('');
  const [levelCount, setLevelCount] = useState(0);
  const [currentSuffix, setCurrentSuffix] = useState(null);
  const [hasDifferentSuffixes, setHasDifferentSuffixes] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchLevelInfo = async () => {
      if (!song?.id) return;
      
      setIsLoadingData(true);
      try {
        // Fetch levels for this song
        const response = await api.get(`/v2/database/songs/${song.id}/levels/info`);

        const levels = response.data.levels || [];
        setLevelCount(levels.length);

        if (levels.length > 0) {
          // Check if all levels have the same suffix
          const suffixes = levels.map(level => level.suffix || null);
          const uniqueSuffixes = [...new Set(suffixes)];
          
          if (uniqueSuffixes.length === 1) {
            setCurrentSuffix(uniqueSuffixes[0]);
            setHasDifferentSuffixes(false);
            setNewSuffix(uniqueSuffixes[0] || '');
          } else {
            setCurrentSuffix(null);
            setHasDifferentSuffixes(true);
            setNewSuffix('');
          }
        } else {
          setCurrentSuffix(null);
          setHasDifferentSuffixes(false);
          setNewSuffix('');
        }
      } catch (error) {
        console.error('Error fetching level info:', error);
        setLevelCount(0);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchLevelInfo();
  }, [song]);

  const handleUpdateSuffix = async () => {
    if (!song?.id) return;

    try {
      const normalizedSuffix = newSuffix.trim() || null;
      
      await api.post(`/v2/database/songs/${song.id}/levels/suffix`, {
        suffix: normalizedSuffix
      });

      setCurrentSuffix(normalizedSuffix);
      setHasDifferentSuffixes(false);
      setSuccess(tEntity('messages.suffixUpdated'));
      setError('');
      toast.success(tEntity('messages.suffixUpdated'));
      
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err) {
      const errorMessage = getErrorMessage(err, tEntity('errors.suffixUpdateFailed'));
      setError(errorMessage);
      setSuccess('');
      toast.error(errorMessage);
    }
  };

  const handleClearSuffix = async () => {
    const emptySuffix = '';
    setNewSuffix(emptySuffix);
    
    try {
      const normalizedSuffix = emptySuffix.trim() || null;
      
      await api.post(`/v2/database/songs/${song.id}/levels/suffix`, {
        suffix: normalizedSuffix
      });

      setCurrentSuffix(normalizedSuffix);
      setHasDifferentSuffixes(false);
      setSuccess(tEntity('messages.suffixUpdated'));
      setError('');
      toast.success(tEntity('messages.suffixUpdated'));
      
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (err) {
      const errorMessage = getErrorMessage(err, tEntity('errors.suffixUpdateFailed'));
      setError(errorMessage);
      setSuccess('');
      toast.error(errorMessage);
    }
  };

  if (isLoadingData) {
    return (
      <div className="form-section">
        <div className="info-text">{tEntity('levelSuffix.loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div className="form-section">
      <p className="info-text">{tEntity('levelSuffix.description')}</p>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {success && (
        <div className="success-message">{success}</div>
      )}

      {levelCount === 0 ? (
        <div className="info-text">{tEntity('levelSuffix.noLevels')}</div>
      ) : (
        <>
          {hasDifferentSuffixes && (
            <div className="info-text warning">
              {tEntity('levelSuffix.differentSuffixes')}
            </div>
          )}

          {currentSuffix !== null && !hasDifferentSuffixes && (
            <div className="form-group">
              <label>{tEntity('levelSuffix.currentSuffix')}</label>
              <div className="info-text">
                {currentSuffix || <em>(No suffix)</em>}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>{tEntity('levelSuffix.newSuffix')}</label>
            <div className="entity-input-group">
              <input
                type="text"
                value={newSuffix}
                onChange={(e) => setNewSuffix(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUpdateSuffix();
                  }
                }}
                placeholder={tEntity('levelSuffix.placeholder')}
              />
              {newSuffix.trim() && (
                <button onClick={handleClearSuffix}>
                  {tEntity('levelSuffix.clearSuffix')}
                </button>
              )}
            </div>
          </div>

          <div className="info-text">
            {tEntity('levelSuffix.levelsAffected', { count: levelCount })}
          </div>

          <div className="form-actions">
            <button
              className="submit-button"
              onClick={handleUpdateSuffix}
              disabled={isLoading}
            >
              {isLoading ? t('loading.saving', { ns: 'common' }) : tEntity('levelSuffix.applyToAll')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LevelSuffixTab;

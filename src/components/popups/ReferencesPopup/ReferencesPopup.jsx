import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './referencespopup.css';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { useTranslation } from 'react-i18next';

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const getBrightness = (color) => {
  const rgb = hexToRgb(color);
  if (!rgb) return 255; // Default to light text if color parsing fails
  // Using relative luminance formula
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
};

const getContrastColor = (backgroundColor) => {
  const brightness = getBrightness(backgroundColor);
  // If background is dark, adjust brightness proportionally
  if (brightness < 128) {
    const rgb = hexToRgb(backgroundColor);
    // Calculate boost based on how dark the background is
    const brightnessBoost = Math.round((128 - brightness) * 2);
    const r = Math.min(255, rgb.r + brightnessBoost);
    const g = Math.min(255, rgb.g + brightnessBoost);
    const b = Math.min(255, rgb.b + brightnessBoost);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
  return backgroundColor;
};

const ReferencesPopup = ({ onClose }) => {
  const { t } = useTranslation('components');
  const tRef = (key, params = {}) => t(`references.popup.${key}`, params);

  const { user } = useAuth();
  const { difficultyDict } = useDifficultyContext();
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('P');
  const [expandedDiffs, setExpandedDiffs] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedLevelIds, setEditedLevelIds] = useState({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const navigate = useNavigate();
  const popupRef = useRef(null);

  const fetchReferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/database/references`);
      setReferences(response.data);
    } catch (err) {
      console.error('Error fetching references:', err);
      setError(tRef('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferences();
  }, []);

  useEffect(() => {
    if (references.length > 0) {
      // Initialize editedLevelIds with current references
      const initialIds = {};
      references.forEach(ref => {
        initialIds[ref.difficulty.id] = ref.levels.map(level => level.id.toString()).join(', ');
      });
      setEditedLevelIds(initialIds);
    }
  }, [references]);

  const toggleDifficulty = (diffId) => {
    setExpandedDiffs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(diffId)) {
        newSet.delete(diffId);
      } else {
        newSet.add(diffId);
      }
      return newSet;
    });
  };

  const handleTabChange = (direction) => {
    const tabs = ['P', 'G', 'U'];
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = (currentIndex + direction + 3) % 3;
    setActiveTab(tabs[newIndex]);
  };

  const toggleAllDifficulties = () => {
    const currentTabRefs = references
      .filter(ref => ref.difficulty.name.startsWith(activeTab))
      .map(ref => ref.difficulty.id);
    
    setExpandedDiffs(prev => {
      const newSet = new Set(prev);
      currentTabRefs.forEach(id => {
        if (!isAllExpanded) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return newSet;
    });
    setIsAllExpanded(!isAllExpanded);
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      for (const diffId in editedLevelIds) {
        const originalLevels = new Set(
          references
            .find(ref => ref.difficulty.id === parseInt(diffId))
            ?.levels.map(l => l.id) || []
        );
        
        const newLevels = new Set(
          editedLevelIds[diffId]
            .split(',')
            .map(id => parseInt(id.trim()))
            .filter(id => !isNaN(id))
        );

        // Find levels to add and remove
        const toAdd = [...newLevels].filter(id => !originalLevels.has(id));
        const toRemove = [...originalLevels].filter(id => !newLevels.has(id));

        // Handle additions
        for (const levelId of toAdd) {
          await api.post(`${import.meta.env.VITE_API_URL}/v2/database/references`, {
            difficultyId: parseInt(diffId),
            levelId
          });
        }

        // Handle removals
        for (const levelId of toRemove) {
          const response = await api.get(
            `${import.meta.env.VITE_API_URL}/v2/database/references/level/${levelId}`
          );
          const refId = response.data.find(r => r.difficultyId === parseInt(diffId))?.id;
          if (refId) {
            await api.delete(`${import.meta.env.VITE_API_URL}/v2/database/references/${refId}`);
          }
        }
      }

      await fetchReferences();
      setIsEditMode(false);
    } catch (err) {
      setError(tRef('errors.saveFailed'));
      console.error('Error saving references:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditModeToggle = () => {
    if (isEditMode) {
      // If leaving edit mode, reset changes
      setIsEditMode(false);
      setEditedLevelIds({});
    } else {
      // If entering edit mode, initialize editable data
      setIsEditMode(true);
      // Initialize editedLevelIds with current references
      const initialIds = {};
      references.forEach(ref => {
        initialIds[ref.difficulty.id] = ref.levels.map(level => level.id.toString()).join(', ');
      });
      setEditedLevelIds(initialIds);
    }
  };

  const renderTabContent = (tabPrefix) => (
    <div className="tab-content">
      {references
        .filter(ref => ref.difficulty.name.startsWith(tabPrefix))
        .map((ref) => {
          const difficultyInfo = difficultyDict[ref.difficulty.id] || ref.difficulty;
          return (
            <div 
              key={ref.difficulty.id} 
              className={`difficulty-section ${expandedDiffs.has(ref.difficulty.id) ? 'expanded' : ''}`}
              style={{ 
                backgroundColor: `${difficultyInfo.color}1a`,
                borderLeft: `4px solid ${difficultyInfo.color}`
              }}
            >
              <div 
                className="difficulty-header"
                onClick={() => toggleDifficulty(ref.difficulty.id)}
              >
                <div className="difficulty-info">
                  <img 
                    src={difficultyInfo.icon} 
                    alt={difficultyInfo.name}
                    className="difficulty-icon"
                  />
                  <h3 
                    className="difficulty-name" 
                    style={{ 
                      color: getContrastColor(difficultyInfo.color),
                      textShadow: getBrightness(difficultyInfo.color) < 128 
                        ? '0 1px 2px rgba(0, 0, 0, 0.5)'
                        : 'none'
                    }}
                  >
                    {difficultyInfo.name}
                  </h3>
                  <h4>
                    {difficultyInfo.id < 53 ? `${difficultyInfo.baseScore}PP` : ''}
                  </h4>
                </div>
                <div className="header-right">
                  <span className="level-count">
                    {ref.levels.length === 1 
                      ? tRef('levelCount.singular')
                      : tRef('levelCount.plural', { count: ref.levels.length })}
                  </span>
                  <span className="expand-icon">
                    {expandedDiffs.has(ref.difficulty.id) ? '▼' : '▶'}
                  </span>
                </div>
              </div>
              
              {expandedDiffs.has(ref.difficulty.id) && (
                <div className="levels-list">
                  {ref.levels.map((level) => (
                    <div key={level.id} className="level-row">
                      <span className="level-id">#{level.id}</span>
                      <a 
                        href={`/levels/${level.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/levels/${level.id}`);
                        }}
                        className="level-song"
                      >
                        {level.song}
                        <svg className="external-link-icon" viewBox="0 0 24 24" width="12" height="12">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" fill="none" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </a>
                      <span className="level-artist">{level.artist}</span>
                      <span className="level-creator">{level.creator}</span>
                      {level.videoLink && (
                        <a 
                          href={level.videoLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="video-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <svg className="youtube-icon" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );

  const renderEditModeContent = (tabPrefix) => (
    <div className="edit-mode-content">
      {references
        .filter(ref => ref.difficulty.name.startsWith(tabPrefix))
        .map((ref) => {
          const difficultyInfo = difficultyDict[ref.difficulty.id] || ref.difficulty;
          return (
            <div key={ref.difficulty.id} className="edit-difficulty-row">
              <div 
                className="edit-difficulty-name"
                style={{ 
                  color: getContrastColor(difficultyInfo.color),
                  backgroundColor: `${difficultyInfo.color}1a`,
                  borderLeft: `4px solid ${difficultyInfo.color}`
                }}
              >
                <img 
                  src={difficultyInfo.icon} 
                  alt={difficultyInfo.name} 
                  className="difficulty-icon"
                />
                {difficultyInfo.name}
              </div>
              <div className="edit-level-ids">
                <input
                  type="text"
                  value={editedLevelIds[ref.difficulty.id] || ''}
                  onChange={(e) => setEditedLevelIds(prev => ({
                    ...prev,
                    [ref.difficulty.id]: e.target.value
                  }))}
                  placeholder={tRef('editMode.placeholder')}
                />
              </div>
            </div>
          );
        })}
    </div>
  );

  // Add useEffect for keyboard listeners
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
          handleTabChange(-1);
          break;
        case 'ArrowRight':
          handleTabChange(1);
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };

    // Add event listener when component mounts
    window.addEventListener('keydown', handleKeyPress);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onClose, activeTab, handleTabChange]); // Add activeTab and handleTabChange to dependencies

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);

    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="references-popup-overlay">
      <div 
        ref={popupRef} 
        className="references-popup"
      >
        <div className="popup-header">
          <button className="close-popup-btn" onClick={onClose}>×</button>
          
          <div className="tab-navigation">
            <button className="nav-arrow left" onClick={() => handleTabChange(-1)}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M15 6L9 12L15 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h2>{tRef('title', { tab: activeTab })}</h2>
            <button className="nav-arrow right" onClick={() => handleTabChange(1)}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M9 6L15 12L9 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {!isEditMode && (
            <button 
              className="toggle-all-btn"
              onClick={toggleAllDifficulties}
            >
              {isAllExpanded ? tRef('buttons.collapseAll') : tRef('buttons.expandAll')}
            </button>
          )}

          {user?.isSuperAdmin && (
            <button 
              className="edit-mode-btn"
              onClick={handleEditModeToggle}
              disabled={saving}
            >
              {isEditMode ? tRef('buttons.viewMode') : tRef('buttons.editMode')}
            </button>
          )}

          {isEditMode && (
            <div className="edit-actions">
              <button 
                className={`save-changes-btn ${saving ? 'saving' : ''}`}
                onClick={handleSaveChanges}
                disabled={saving}
              >
                {saving ? tRef('buttons.saving') : tRef('buttons.saveChanges')}
              </button>
              <button 
                className="cancel-edit-btn"
                onClick={() => {
                  setIsEditMode(false);
                  setEditedLevelIds({});
                }}
                disabled={saving}
              >
                {tRef('buttons.cancel')}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">{tRef('loading')}</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <div className="tabs-container">
            <div 
              className="tabs-slider" 
              style={{ 
                transform: `translateX(${activeTab === 'P' ? '0' : activeTab === 'G' ? '-125%' : '-250%'})` 
              }}
            >
              {!isEditMode ? (
                <>
                  <div className="tab-content">{renderTabContent('P')}</div>
                  <div className="tab-content">{renderTabContent('G')}</div>
                  <div className="tab-content">{renderTabContent('U')}</div>
                </>
              ) : (
                <>
                  <div className="tab-content edit-mode">{renderEditModeContent('P')}</div>
                  <div className="tab-content edit-mode">{renderEditModeContent('G')}</div>
                  <div className="tab-content edit-mode">{renderEditModeContent('U')}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 

export default ReferencesPopup;
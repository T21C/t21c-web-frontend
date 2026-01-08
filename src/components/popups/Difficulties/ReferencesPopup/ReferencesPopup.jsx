import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './referencespopup.css';
import api from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDifficultyContext } from '@/contexts/DifficultyContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import rollingIcon from '@/assets/icons/Rolling RITK.png';
import indexingIcon from '@/assets/icons/Indexing RITK.png';
import techIcon from '@/assets/icons/Tech RITK.png';
import keycountIcon from '@/assets/icons/Keycount RITK.png';
import pseudoIcon from '@/assets/icons/Pseudo.png';
import keycountPlusIcon from '@/assets/icons/Kplus RITK.png';
import hideIcons from '@/assets/icons/RITK hidden.png'
import showIcons from '@/assets/icons/RITK visible.png'
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { formatCreatorDisplay } from '@/utils/Utility';

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

// Define unique identifiers for each type
const TYPE_IDENTIFIERS = {
  'R': 'ROLLING',
  'I': 'INDEXING',
  'T': 'TECH',
  'K': 'KEYCOUNT',
  'K+': 'KEYCOUNT_PLUS',
  'P': 'PSEUDO'
};

// Reverse mapping for display
const TYPE_DISPLAY = {
  'ROLLING': 'R',
  'INDEXING': 'I',
  'TECH': 'T',
  'KEYCOUNT': 'K',
  'KEYCOUNT_PLUS': 'K+',
  'PSEUDO': 'P'
};


// Helper functions for type validation and conversion
const isValidTypeFormat = (type) => {
  if (!type) return true; // Empty type is valid
  
  // Check if the type contains only valid characters (including K+ as a single unit)
  const validChars = /^[RITKP]+$|^[RITKP]*K\+[RITKP]*$/;
  return validChars.test(type);
};

const toInternalType = (type) => {
  if (!type) return '';
  
  // Handle K+ as a special case first
  if (type === 'K+') return 'KEYCOUNT_PLUS';
  
  // Split into individual characters, but keep K+ as a unit
  const types = [];
  let i = 0;
  while (i < type.length) {
    if (type[i] === 'K' && type[i + 1] === '+') {
      types.push('K+');
      i += 2;
    } else {
      types.push(type[i]);
      i++;
    }
  }
  
  // Convert each character to internal format
  const internalTypes = types.map(t => {
    const internal = TYPE_IDENTIFIERS[t];
    if (!internal) {
      throw new Error(`Invalid reference type character: ${t}`);
    }
    return internal;
  });
  
  // Sort by type order
  return internalTypes.sort((a, b) => TYPE_ORDER[a] - TYPE_ORDER[b]).join('+');
};

const toDisplayType = (type) => {
  if (!type) return '';
  
  // Handle KEYCOUNT_PLUS as a special case
  if (type === 'KEYCOUNT_PLUS') return 'K+';
  
  // Split by + and convert each part
  return type.split('+')
    .map(part => TYPE_DISPLAY[part] || part)
    .join('');
};

const TYPE_ORDER = { 
  'ROLLING': 0, 
  'INDEXING': 1, 
  'TECH': 2, 
  'KEYCOUNT': 3, 
  'KEYCOUNT_PLUS': 4,
  'PSEUDO': 5,
};
const TYPE_LABELS = {
  'ROLLING': 'Rolling',
  'INDEXING': 'Indexing',
  'TECH': 'Tech',
  'KEYCOUNT': 'Keycount',
  'KEYCOUNT_PLUS': 'Keycount+',
  'PSEUDO': 'Pseudo'
};
const DEFAULT_TYPE_ICONS = {
  'ROLLING': rollingIcon,
  'INDEXING': indexingIcon,
  'TECH': techIcon,
  'KEYCOUNT': keycountIcon,
  'KEYCOUNT_PLUS': keycountPlusIcon,
  'PSEUDO': pseudoIcon
};

// Define type priority for sorting
const TYPE_PRIORITY = {
  'ROLLING': 0,
  'INDEXING': 1,
  'TECH': 2,
  'KEYCOUNT': 3,
  'KEYCOUNT_PLUS': 4,
  'PSEUDO': 5,
};

// Helper function to sort types by priority
const sortTypesByPriority = (types) => {
  return [...types].sort((a, b) => TYPE_PRIORITY[a] - TYPE_PRIORITY[b]);
};

// Helper function to generate combinations of a specific size
const generateCombinationsOfSize = (types, size) => {
  if (size === 1) return types.map(type => [type]);
  
  const combinations = [];
  for (let i = 0; i <= types.length - size; i++) {
    const head = types[i];
    const tailCombos = generateCombinationsOfSize(types.slice(i + 1), size - 1);
    combinations.push(...tailCombos.map(combo => [head, ...combo]));
  }
  return combinations;
};

// Generate all possible combinations of reference types
const generateTypeCombinations = () => {
  const baseTypes = ['ROLLING', 'INDEXING', 'TECH', 'KEYCOUNT', 'KEYCOUNT_PLUS', 'PSEUDO'];
  const combinations = new Set();
  
  // Add single types
  baseTypes.forEach(type => combinations.add(type));
  
  // Generate combinations of size 2-4
  for (let size = 2; size <= 5; size++) {
    const sizeCombos = generateCombinationsOfSize(baseTypes, size);
    sizeCombos.forEach(combo => {
      // Sort the combination by priority and join
      const sortedCombo = sortTypesByPriority(combo);
      combinations.add(sortedCombo.join('+'));
    });
  }
  
  // Convert to array and sort by length (descending) and first type priority
  return Array.from(combinations).sort((a, b) => {
    const typesA = a.split('+');
    const typesB = b.split('+');
    
    // Compare lengths first (longer combinations come first)
    if (typesA.length !== typesB.length) {
      return typesB.length - typesA.length;
    }
    
    // If lengths are equal, compare by priority of first type
    return TYPE_PRIORITY[typesA[0]] - TYPE_PRIORITY[typesB[0]];
  });
};

const REFERENCE_TYPE_COMBINATIONS = generateTypeCombinations();

// Update compareTypes function to use the new priority system
const compareTypes = (a, b) => {
  // Handle empty types (put them at the end)
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  
  // Split and sort both types by priority
  const typesA = a.split('+').sort((x, y) => TYPE_PRIORITY[x] - TYPE_PRIORITY[y]);
  const typesB = b.split('+').sort((x, y) => TYPE_PRIORITY[x] - TYPE_PRIORITY[y]);
  
  // Compare lengths first (longer combinations come first)
  if (typesA.length !== typesB.length) {
    return typesB.length - typesA.length;
  }
  
  // If lengths are equal, compare each type in order
  for (let i = 0; i < typesA.length; i++) {
    const diff = TYPE_PRIORITY[typesA[i]] - TYPE_PRIORITY[typesB[i]];
    if (diff !== 0) return diff;
  }
  
  return 0;
};

const parseReferenceString = (str) => {
  const lines = str.split('\n').map(line => line.trim()).filter(Boolean);
  const references = [];

  for (const line of lines) {
    // Check if line contains a type (has a colon)
    if (line.includes(':')) {
      const [typePart, ...levelParts] = line.split(':').map(part => part.trim());
      if (!typePart || !levelParts.length) continue;


      // First validate the type format
      if (!isValidTypeFormat(typePart.toUpperCase())) {
        throw new Error(`Invalid reference type format: ${typePart}`);
      }

      // Then convert to internal format
      const type = toInternalType(typePart.toUpperCase());


      // Finally validate against allowed combinations
      if (!REFERENCE_TYPE_COMBINATIONS.includes(type)) {
        throw new Error(`Invalid reference type combination: ${typePart}`);
      }

      // Parse level IDs
      const levelIds = levelParts[0].split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

      // Add each level ID with the type
      levelIds.forEach(levelId => {
        references.push({ type, levelId });
      });
    } else {
      // Handle untyped references (no colon)
      const levelIds = line.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      levelIds.forEach(levelId => {
        references.push({ type: '', levelId });
      });
    }
  }
  return references;
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
  const [initialLevelIds, setInitialLevelIds] = useState({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const navigate = useNavigate();
  const popupRef = useRef(null);
  const [changedDifficulties, setChangedDifficulties] = useState(new Set());
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef(null);
  const [viewFormat, setViewFormat] = useState('extended'); // 'extended' or 'compact'

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
        // Group levels by type
        const groupedByType = ref.levels.reduce((acc, level) => {
          const type = level.type || '';
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(level.id);
          return acc;
        }, {});

        // Sort types alphabetically, putting empty type at the end
        const sortedTypes = Object.keys(groupedByType).sort(compareTypes);

        // Format each group
        initialIds[ref.difficulty.id] = sortedTypes
          .map(type => {
            const levelIds = groupedByType[type].sort((a, b) => a - b);
            // Convert internal type back to display format for edit mode
            const displayType = toDisplayType(type);
            return displayType ? `${displayType}: ${levelIds.join(', ')}` : levelIds.join(', ');
          })
          .join('\n');
      });
      setEditedLevelIds(initialIds);
      setInitialLevelIds(initialIds);
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

  const handleEditModeToggle = () => {
    if (isEditMode) {
      setIsEditMode(false);
      setEditedLevelIds({});
      setInitialLevelIds({});
      setChangedDifficulties(new Set());
    } else {
      setIsEditMode(true);
      const initialIds = {};
      references.forEach(ref => {

        // Group levels by type
        const groupedByType = ref.levels.reduce((acc, level) => {
          const type = level.type || '';
          if (!acc[type]) {
            acc[type] = [];
          }
          acc[type].push(level.id);
          return acc;
        }, {});
        

        // Sort types alphabetically, putting empty type at the end
        const sortedTypes = Object.keys(groupedByType).sort(compareTypes);
        
        // Format each group
        initialIds[ref.difficulty.id] = sortedTypes
          .map(type => {
            const levelIds = groupedByType[type].sort((a, b) => a - b);
            // Convert internal type back to display format for edit mode
            const displayType = toDisplayType(type);

            return displayType ? `${displayType}: ${levelIds.join(', ')}` : levelIds.join(', ');
          })
          .join('\n');


      });
      setEditedLevelIds(initialIds);
      setInitialLevelIds(initialIds);
      setChangedDifficulties(new Set());
    }
  };

  const handleLevelIdsChange = (diffId, value) => {
    setEditedLevelIds(prev => ({
      ...prev,
      [diffId]: value
    }));
    setChangedDifficulties(prev => {
      const newSet = new Set(prev);
      newSet.add(diffId);
      return newSet;
    });
  };

  const handleSaveChanges = async (diffId) => {
    setSaving(true);
    try {
      try {
        const newReferences = parseReferenceString(editedLevelIds[diffId]);
        
        // Send bulk update request
        await api.put(`${import.meta.env.VITE_API_URL}/v2/database/references/bulk/${diffId}`, {
          references: newReferences
        });

        // Update changedDifficulties
        setChangedDifficulties(prev => {
          const newSet = new Set(prev);
          newSet.delete(diffId);
          return newSet;
        });

        await fetchReferences();
        toast.success(tRef('messages.saveSuccess'));
      } catch (error) {
        console.error('Error saving references:', error);
        toast.error(tRef('errors.saveFailed'));
        throw error;
      }
    } catch (err) {
      console.error('Error in handleSaveChanges:', err);
      toast.error(tRef('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const renderLevelRow = (level, type) => (
    <div key={level.id} className="level-row">
      <span className="level-id">#{level.id}</span>
      <div className="level-info">
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
        {type && (
          <div className="level-type-badges">
            {type.split('+').map((t, index) => (
              <span key={t} className="level-type-badge" style={{ backgroundColor: getTypeColor(t) }}>
                {TYPE_LABELS[t]}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="level-artist">{level.artist}</span>
      <span className="level-creator">{formatCreatorDisplay(level)}</span>
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
  );

  const renderReferenceTypeSection = (type, levels) => {
    if (!levels || levels.length === 0) return null;


    return (
      <div className="reference-type-section">
        <div className="reference-type-header" style={{ paddingBottom: type.length > 0 ? '' : '0.5rem' }}>
          {type ? (
            <div className="reference-type-icons">
              {type.split('+').map((t, index, array) => {
                return (
                  <div key={t} className="reference-type-icon-container">
                    <img 
                      src={DEFAULT_TYPE_ICONS[t]} 
                      alt={t}
                      className="reference-type-icon"
                    />
                    <div className="reference-type-icon-label-container">
                      <span className="reference-type-icon-label">{TYPE_LABELS[t]}</span>
                    </div>
                    {index < array.length - 1 && (
                      <span className="reference-type-separator">+</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="no-type-label">{tRef('noType')}</span>
          )}
          <span className="reference-type-count">
            {levels.length === 1 
              ? tRef('levelCount.singular')
              : tRef('levelCount.plural', { count: levels.length })}
          </span>
        </div>
        <div className="reference-type-levels">
          {levels.map(level => renderLevelRow(level, type))}
        </div>
      </div>
    );
  };

  const renderTabContent = (tabPrefix) => (
    <div className="tab-content">
      {references
        .filter(ref => ref.difficulty.name.startsWith(tabPrefix))
        .map((ref) => {
          const difficultyInfo = difficultyDict[ref.difficulty.id] || ref.difficulty;
          
          // Group levels by reference type
          const levelsByType = ref.levels.reduce((acc, level) => {
            const type = level.type || ''; // Empty string for no type
            if (!acc[type]) {
              acc[type] = [];
            }
            acc[type].push(level);
            return acc;
          }, {});

          // Sort types, placing untyped references last
          const sortedTypes = Object.keys(levelsByType).sort(compareTypes);

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
                    src={difficultyDict[difficultyInfo.id]?.icon} 
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
                  {viewFormat === 'compact' ? (
                    // In compact view, show all levels in a single list
                    sortedTypes.map(type => 
                      levelsByType[type] && levelsByType[type].map(level => renderLevelRow(level, level.type))
                    )
                  ) : (
                    // In extended view, group by type
                    <>
                      {sortedTypes.map(type => 
                        levelsByType[type] && renderReferenceTypeSection(type, levelsByType[type])
                      )}
                    </>
                  )}
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
          const hasChanges = changedDifficulties.has(ref.difficulty.id);
          
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
                  src={difficultyDict[difficultyInfo.id]?.icon} 
                  alt={difficultyInfo.name} 
                  className="difficulty-icon"
                />
                {difficultyInfo.name}
              </div>
              <div className="edit-level-ids">
                <textarea
                  value={editedLevelIds[ref.difficulty.id] || ''}
                  onChange={(e) => handleLevelIdsChange(ref.difficulty.id, e.target.value)}
                  placeholder={tRef('editMode.placeholder')}
                />
                {hasChanges && (
                  <div className="difficulty-actions">
                    <button 
                      className={`save-changes-btn ${saving ? 'saving' : ''}`}
                      onClick={() => handleSaveChanges(ref.difficulty.id)}
                      disabled={saving}
                    >
                      {saving ? tRef('buttons.saving') : tRef('buttons.saveChanges')}
                    </button>
                    <button 
                      className="cancel-edit-btn"
                      onClick={() => {
                        setEditedLevelIds(prev => ({
                          ...prev,
                          [ref.difficulty.id]: initialLevelIds[ref.difficulty.id]
                        }));
                        setChangedDifficulties(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(ref.difficulty.id);
                          return newSet;
                        });
                      }}
                      disabled={saving}
                    >
                      {tRef('buttons.cancel')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );

  // Add useEffect for keyboard listeners
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't handle keyboard events when in edit mode
      if (isEditMode) return;

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
  }, [onClose, activeTab, handleTabChange, isEditMode]); // Add isEditMode to dependencies

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

  // Add click outside handler for help popup
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        setShowHelp(false);
      }
    };

    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelp]);

  // Add helper function for type colors
  const getTypeColor = (type) => {
    switch (type) {
      case 'ROLLING': return '#ff4444';
      case 'INDEXING': return '#44ff44';
      case 'TECH': return '#4444ff';
      case 'KEYCOUNT': return '#ffff44';
      case 'KEYCOUNT_PLUS': return '#ff8844';
      case 'PSEUDO': return '#ccc';
      default: return '#888888';
    }
  };

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

          <div className="header-buttons">
            <button 
              className="help-button"
              onClick={() => setShowHelp(!showHelp)}
              title={tRef('buttons.help')}
            >
              ?
            </button>
            {!isEditMode && (
              <>
                <button 
                  className="toggle-all-btn"
                  onClick={toggleAllDifficulties}
                >
                  {isAllExpanded ? tRef('buttons.collapseAll') : tRef('buttons.expandAll')}
                </button>
                <button 
                  className="view-format-btn"
                  onClick={() => setViewFormat(prev => prev === 'extended' ? 'compact' : 'extended')}
                  title={viewFormat === 'extended' ? tRef('buttons.switchToCompact') : tRef('buttons.switchToExtended')}
                >
                  <img 
                    src={viewFormat === 'extended' ? showIcons : hideIcons} 
                    alt={viewFormat === 'extended' ? 'Switch to compact view' : 'Switch to extended view'}
                  />
                </button>
              </>
            )}
          {hasFlag(user, permissionFlags.SUPER_ADMIN) && (
            <button 
              className="edit-mode-btn"
              onClick={handleEditModeToggle}
              disabled={saving}
            >
              {isEditMode ? tRef('buttons.viewMode') : tRef('buttons.editMode')}
            </button>
          )}
          </div>


        </div>

        {loading ? (
          <div className="loading">{tRef('loading')}</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          <>
            {showHelp && (
              <div className="help-popup" ref={helpRef}>
                <div className="help-content">
                  <h3>{tRef(isEditMode ? 'editMode.help.title' : 'help.title')}</h3>
                  <p>{tRef(isEditMode ? 'editMode.help.description' : 'help.description')}</p>
                  
                  <h4>{tRef(isEditMode ? 'editMode.help.types.title' : 'help.types.title')}</h4>
                  <ul>
                    <li><strong>R:</strong> {tRef(isEditMode ? 'editMode.help.types.R' : 'help.types.R')}</li>
                    <li><strong>I:</strong> {tRef(isEditMode ? 'editMode.help.types.I' : 'help.types.I')}</li>
                    <li><strong>T:</strong> {tRef(isEditMode ? 'editMode.help.types.T' : 'help.types.T')}</li>
                    <li><strong>K:</strong> {tRef(isEditMode ? 'editMode.help.types.K' : 'help.types.K')}</li>
                  </ul>

                  {isEditMode && (
                    <>
                      <h4>{tRef('editMode.help.format.title')}</h4>
                      <ul>
                        <li>{tRef('editMode.help.format.single')}</li>
                        <li>{tRef('editMode.help.format.multiple')}</li>
                        <li>{tRef('editMode.help.format.noType')}</li>
                      </ul>

                      <h4>{tRef('editMode.help.rules.title')}</h4>
                      <ul>
                        {tRef('editMode.help.rules.list', { returnObjects: true }).map((rule, index) => (
                          <li key={index}>{rule}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="tabs-container">
              <div 
                className={`tabs-slider ${viewFormat === 'compact' ? 'compact-view' : ''}`}
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
          </>
        )}
      </div>
    </div>
  );
}; 

export default ReferencesPopup;
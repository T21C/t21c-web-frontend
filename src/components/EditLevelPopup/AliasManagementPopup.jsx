import React, { useState, useEffect } from 'react';
import './aliasmanagementpopup.css';
import api from '../../utils/api';

const AliasManagementPopup = ({ levelId, onClose }) => {
  const [aliases, setAliases] = useState([]);
  const [newAlias, setNewAlias] = useState({ field: 'song', alias: '', propagate: false, matchType: 'exact' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [affectedLevelsCount, setAffectedLevelsCount] = useState(null);
  const [levelData, setLevelData] = useState(null);

  useEffect(() => {
    const fetchLevelData = async () => {
      try {
        const response = await api.get(`${import.meta.env.VITE_LEVELS}/byId/${levelId}`);
        setLevelData(response.data);
      } catch (err) {
        console.error('Error fetching level data:', err);
      }
    };

    fetchLevelData();
    fetchAliases();

    // Add ESC key handler
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [levelId, onClose]);

  // Add effect to fetch affected levels count when propagation settings change
  useEffect(() => {
    const fetchAffectedLevelsCount = async () => {
      if (!newAlias.propagate) {
        setAffectedLevelsCount(null);
        return;
      }

      try {
        const params = new URLSearchParams({
          field: newAlias.field,
          matchType: newAlias.matchType
        });

        const response = await api.get(`${import.meta.env.VITE_LEVELS}/alias-propagation-count/${levelId}?${params}`);
        setAffectedLevelsCount(response.data.count);

        // Update the error state if needed
        if (response.data.count === 0) {
          setError(`No other levels found with ${newAlias.field} "${response.data.fieldValue}"`);
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching affected levels count:', err);
        setAffectedLevelsCount(null);
        setError('Failed to check affected levels');
      }
    };

    fetchAffectedLevelsCount();
  }, [newAlias.propagate, newAlias.field, newAlias.matchType, levelId]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      onClose();
    }
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  const fetchAliases = async () => {
    try {
      setLoading(true);
      const response = await api.get(`${import.meta.env.VITE_LEVELS}/${levelId}/aliases`);
      setAliases(response.data);
    } catch (err) {
      setError('Failed to fetch aliases');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlias = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post(`${import.meta.env.VITE_LEVELS}/${levelId}/aliases`, newAlias);
      setNewAlias({ field: 'song', alias: '', propagate: false, matchType: 'exact' });
      await fetchAliases();
    } catch (err) {
      setError('Failed to add alias');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAlias = async (aliasId, updatedAlias) => {
    try {
      setLoading(true);
      await api.put(`${import.meta.env.VITE_LEVELS}/${levelId}/aliases/${aliasId}`, { alias: updatedAlias });
      await fetchAliases();
    } catch (err) {
      setError('Failed to update alias');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlias = async (aliasId) => {
    try {
      setLoading(true);
      await api.delete(`${import.meta.env.VITE_LEVELS}/${levelId}/aliases/${aliasId}`);
      await fetchAliases();
    } catch (err) {
      setError('Failed to delete alias');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="alias-management-popup" onClick={handleOverlayClick}>
      <div className="alias-management-content" onClick={handleContentClick}>
        <div className="alias-management-header">
          <h2>Manage Aliases</h2>
          <button 
            className="close-button" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleAddAlias} className="add-alias-form">
          <div className="form-group">
            <label>Field:</label>
            <select
              value={newAlias.field}
              onChange={(e) => setNewAlias({ ...newAlias, field: e.target.value })}
              className="field-select"
            >
              <option value="song">Song ({levelData?.song || 'Loading...'})</option>
              <option value="artist">Artist ({levelData?.artist || 'Loading...'})</option>
            </select>
          </div>

          <div className="form-group">
            <label>Alias for: <span className="selected-value">{levelData?.[newAlias.field]}</span></label>
            <input
              type="text"
              value={newAlias.alias}
              onChange={(e) => setNewAlias({ ...newAlias, alias: e.target.value })}
              placeholder="Enter alias..."
              required
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={newAlias.propagate}
                onChange={(e) => setNewAlias({ ...newAlias, propagate: e.target.checked })}
              />
              Propagate to other levels
            </label>
          </div>

          {newAlias.propagate && (
            <>
              <div className="form-group">
                <label>Match Type:</label>
                <select
                  value={newAlias.matchType}
                  onChange={(e) => setNewAlias({ ...newAlias, matchType: e.target.value })}
                >
                  <option value="exact">Exact Match</option>
                  <option value="partial">Partial Match</option>
                </select>
              </div>

              {affectedLevelsCount !== null && (
                <div className="affected-levels-notice">
                  This will affect {affectedLevelsCount} other level{affectedLevelsCount !== 1 ? 's' : ''}
                </div>
              )}
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Alias'}
          </button>
        </form>

        <div className="aliases-list">
          <h3>Current Aliases</h3>
          {aliases.length === 0 ? (
            <p>No aliases found</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Original Value</th>
                  <th>Alias</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {aliases.map((alias) => (
                  <tr key={alias.id}>
                    <td>{alias.field}</td>
                    <td>{alias.originalValue}</td>
                    <td>{alias.alias}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteAlias(alias.id)}
                        disabled={loading}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default AliasManagementPopup; 
import api from '@/utils/api';
import '../css/announcementpage.css';
import { useState } from 'react';
import { EditIcon } from '../../../components/Icons/EditIcon';
import { TrashIcon } from '../../../components/Icons/TrashIcon';

const ReratesTab = ({ levels, selectedLevels, onCheckboxChange, isLoading, onRemove, onEdit }) => {
  const [removingIds, setRemovingIds] = useState(new Set());
  const [error, setError] = useState('');

  const handleRemove = async (level) => {
    try {
      setRemovingIds(prev => new Set([...prev, level.id]));
      setError('');
      
      // Optimistically remove from UI
      onRemove(level.id);
      
      // Then make the server request
      await api.post(`${import.meta.env.VITE_LEVELS}/markAnnounced/${level.id}`);
    } catch (err) {
      console.error('Error marking level as announced:', err);
      setError(`Failed to remove ${level.song}. Please try again.`);
      // Refetch the data to ensure UI is in sync
      window.location.reload();
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(level.id);
        return next;
      });
    }
  };

  return (
    <div className="announcement-section">
      {error && <div className="error-message">{error}</div>}
      <div className="items-list">
        {levels.length > 0 ? (
          levels.map(level => (
            <div key={level.id} className="announcement-item">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level.id)}
                  onChange={() => onCheckboxChange(level.id)}
                  disabled={isLoading || removingIds.has(level.id)}
                />
                <span className="checkmark"></span>
                <div className="item-details">
                  <div className="item-title">
                    {level.song} - {level.artist}
                  </div>
                  <div className="item-subtitle">
                    {level.previousDifficulty?.name} ➔ {level.difficulty?.name}
                    {level.team && ` • ${level.team}`}
                  </div>
                </div>
              </label>
              <div className="button-group">
                <button 
                  className="edit-button"
                  onClick={() => onEdit(level)}
                  disabled={isLoading || removingIds.has(level.id)}
                  style ={{width: '40px', height: '40px'}}
                >
                  <EditIcon color="#fff" size="24px" />
                </button>
                <button 
                  className="trash-button"
                  onClick={() => handleRemove(level)}
                  disabled={isLoading || removingIds.has(level.id)}
                  style ={{width: '40px', height: '40px'}}
                >
                  {removingIds.has(level.id) ? (
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    <TrashIcon color="#fff"/>
                    )}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-items-message">No rerates to announce</div>
        )}
      </div>
    </div>
  );
};

export default ReratesTab;
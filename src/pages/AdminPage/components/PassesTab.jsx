import '../css/announcementpage.css';
import api from '@/utils/api';
import { useState } from 'react';
import { TrashIcon } from '../../../components/Icons/TrashIcon';
  
const PassesTab = ({ passes, selectedPasses, onCheckboxChange, isLoading, onRemove }) => {
  const [removingIds, setRemovingIds] = useState(new Set());
  const [error, setError] = useState('');

  const handleRemove = async (pass) => {
    try {
      setRemovingIds(prev => new Set([...prev, pass.id]));
      setError('');
      
      // Optimistically remove from UI
      onRemove(pass.id);
      
      // Then make the server request
      await api.post(`${import.meta.env.VITE_PASSES}/markAnnounced/${pass.id}`);
    } catch (err) {
      console.error('Error marking pass as announced:', err);
      setError(`Failed to remove ${pass.player?.name}'s pass. Please try again.`);
      // Refetch the data to ensure UI is in sync
      window.location.reload();
    } finally {
      setRemovingIds(prev => {
        const next = new Set(prev);
        next.delete(pass.id);
        return next;
      });
    }
  };

  return (
    <div className="announcement-section">
      {error && <div className="error-message">{error}</div>}
      <div className="items-list">
        {Array.isArray(passes) && passes.length > 0 ? (
          passes.map(pass => {
            // Skip invalid passes
            if (!pass?.id || !pass?.player?.name || !pass?.level?.song) {
              console.warn('Invalid pass data:', pass);
              return null;
            }
  
            return (
              <div key={pass.id} className="announcement-item">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={selectedPasses.includes(pass.id)}
                    onChange={() => onCheckboxChange(pass.id)}
                    disabled={isLoading || removingIds.has(pass.id)}
                  />
                  <span className="checkmark"></span>
                  <div className="item-details">
                    <div className="item-title">
                      {pass.player?.name}'s clear of {pass.level?.song}
                    </div>
                    <div className="item-subtitle">
                      Score: {pass.scoreV2?.toFixed(2) || 'N/A'} | Accuracy: {((pass.accuracy || 0) * 100).toFixed(2)}%
                      {pass.level?.difficulty?.name && ` • ${pass.level.difficulty.name}`}
                    </div>
                  </div>
                </label>
                <button 
                  className="trash-button"
                  onClick={() => handleRemove(pass)}
                  disabled={isLoading || removingIds.has(pass.id)}
                  style ={{width: '40px', height: '40px'}}
                >
                  {removingIds.has(pass.id) ? (
                    <svg className="spinner" viewBox="0 0 50 50">
                      <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                    </svg>
                  ) : (
                    <TrashIcon color="#fff"/>
                  )}
                </button>
              </div>
            );
          }).filter(Boolean)
        ) : (
          <div className="no-items-message">No passes to announce</div>
        )}
      </div>
    </div>
  );
};

export default PassesTab;
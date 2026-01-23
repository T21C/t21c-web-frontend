import React from 'react';

export const MergeTab = ({
  type,
  mergeTargetSearch,
  setMergeTargetSearch,
  availableMergeTargets,
  currentMergeTarget,
  setMergeTarget,
  handleMerge,
  isLoading,
  tEntity
}) => {
  return (
    <div className="form-section">
      <p className="info-text">{tEntity('merge.info')}</p>
      <div className="form-group">
        <label>{tEntity('merge.search')}</label>
        <input
          type="text"
          value={mergeTargetSearch}
          onChange={(e) => setMergeTargetSearch(e.target.value)}
          placeholder={tEntity('merge.placeholder')}
        />
      </div>

      {availableMergeTargets && availableMergeTargets.length > 0 && (
        <div className="entity-results">
          {availableMergeTargets.map((target) => (
            <div
              key={target.id}
              className={`entity-result-item ${currentMergeTarget?.id === target.id ? 'selected' : ''}`}
              onClick={() => setMergeTarget(target)}
            >
              {type === 'artist' && target.avatarUrl && (
                <img src={target.avatarUrl} alt={target.name} className="entity-avatar" />
              )}
              <span>{target.name} (ID: {target.id})</span>
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button
          className="submit-button"
          onClick={handleMerge}
          disabled={isLoading || !currentMergeTarget}
        >
          {isLoading ? tEntity('buttons.merging') : tEntity('buttons.merge')}
        </button>
      </div>
    </div>
  );
};

export default MergeTab;

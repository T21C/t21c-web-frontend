import React from 'react';

export const AliasesTab = ({
  newAlias,
  setNewAlias,
  aliases,
  handleAddAlias,
  handleRemoveAlias,
  handleUpdate,
  isLoading,
  tEntity
}) => {
  return (
    <div className="form-section">
      <div className="form-group">
        <label>{tEntity('aliases.add')}</label>
        <div className="entity-input-group">
          <input
            type="text"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddAlias();
              }
            }}
            placeholder={tEntity('aliases.placeholder')}
          />
          <button onClick={handleAddAlias}>{tEntity('buttons.add')}</button>
        </div>
      </div>

      {aliases.length > 0 && (
        <div className="entity-list">
          {aliases.map((alias, index) => (
            <div key={index} className="entity-item">
              <span>{alias}</span>
              <button onClick={() => handleRemoveAlias(alias)}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button
          className="submit-button"
          onClick={handleUpdate}
          disabled={isLoading}
        >
          {isLoading ? tEntity('buttons.saving') : tEntity('buttons.save')}
        </button>
      </div>
    </div>
  );
};

export default AliasesTab;

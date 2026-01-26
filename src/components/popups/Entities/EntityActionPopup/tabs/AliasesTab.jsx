import React from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation(['components', 'common']);
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
          <button onClick={handleAddAlias}>{t('buttons.add', { ns: 'common' })}</button>
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
          {isLoading ? t('loading.saving', { ns: 'common' }) : t('buttons.save', { ns: 'common' })}
        </button>
      </div>
    </div>
  );
};

export default AliasesTab;

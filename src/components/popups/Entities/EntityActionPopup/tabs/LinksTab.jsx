import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLinkIcon } from '@/components/common/icons';

export const LinksTab = ({
  newLink,
  setNewLink,
  links,
  handleAddLink,
  handleRemoveLink,
  handleUpdate,
  isLoading,
  tEntity
}) => {
  const { t } = useTranslation(['components', 'common']);
  return (
    <div className="form-section">
      <div className="form-group">
        <label>{tEntity('links.add')}</label>
        <div className="entity-input-group">
          <input
            type="text"
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddLink();
              }
            }}
            placeholder={tEntity('links.placeholder')}
          />
          <button onClick={handleAddLink}>{t('buttons.add', { ns: 'common' })}</button>
        </div>
      </div>

      {links.length > 0 && (  
        <div className="entity-list">
          {links.map((link, index) => (
            <div key={index} className="entity-item">
              <a href={link} target="_blank" rel="noopener noreferrer">
                {link}
                <ExternalLinkIcon size={14} />
              </a>
              <button onClick={() => handleRemoveLink(link)}>×</button>
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

export default LinksTab;

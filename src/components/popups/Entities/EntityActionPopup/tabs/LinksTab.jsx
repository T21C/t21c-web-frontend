import React from 'react';
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
          <button onClick={handleAddLink}>{tEntity('buttons.add')}</button>
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
          {isLoading ? tEntity('buttons.saving') : tEntity('buttons.save')}
        </button>
      </div>
    </div>
  );
};

export default LinksTab;

import React from 'react';
import { useTranslation } from 'react-i18next';
export const CreditsTab = ({
  creditSearch,
  setCreditSearch,
  availableArtistsForCredits,
  newCreditArtistId,
  setNewCreditArtistId,
  newCreditRole,
  setNewCreditRole,
  credits,
  handleAddCredit,
  handleRemoveCredit,
  tEntity
}) => {
  const { t } = useTranslation(['components', 'common']);
  return (
    <div className="form-section">
      <div className="form-group">
        <label>{tEntity('credits.search')}</label>
        <input
          type="text"
          value={creditSearch}
          onChange={(e) => setCreditSearch(e.target.value)}
          placeholder={tEntity('credits.placeholder')}
        />
      </div>

      {availableArtistsForCredits.length > 0 && (
        <div className="entity-results">
          {availableArtistsForCredits.map((artist) => (
            <div
              key={artist.id}
              className={`entity-result-item ${newCreditArtistId === artist.id.toString() ? 'selected' : ''}`}
              onClick={() => setNewCreditArtistId(artist.id.toString())}
            >
              {artist.avatarUrl && (
                <img src={artist.avatarUrl} alt={artist.name} className="entity-avatar" />
              )}
              <span>{artist.name} (ID: {artist.id})</span>
            </div>
          ))}
        </div>
      )}

      {newCreditArtistId && (
        <div className="form-group">
          <label>{tEntity('credits.role')}</label>
          <input
            type="text"
            value={newCreditRole}
            onChange={(e) => setNewCreditRole(e.target.value)}
            placeholder={tEntity('credits.rolePlaceholder')}
          />
        </div>
      )}

      <div className="form-actions">
        <button
          className="submit-button"
          onClick={handleAddCredit}
          disabled={!newCreditArtistId}
        >
          {tEntity('buttons.addCredit')}
        </button>
      </div>

      <div className="entity-list">
        <h4>{tEntity('credits.existing')}</h4>
        {credits.map((credit) => (
          <div key={credit.id} className="entity-item">
            {credit.artist?.avatarUrl && (
              <img src={credit.artist.avatarUrl} alt={credit.artist.name} className="entity-avatar" />
            )}
            <div className="entity-info">
              <span>{credit.artist?.name || 'Unknown'}</span>
              {credit.role && <span className="entity-role">{credit.role}</span>}
            </div>
            <button onClick={() => handleRemoveCredit(credit.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreditsTab;

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';

export const RelationsTab = ({
  relationSearch,
  setRelationSearch,
  availableArtistsForRelations,
  newRelationArtistId,
  setNewRelationArtistId,
  relations,
  handleAddRelation,
  handleRemoveRelation,
  tEntity
}) => {
  const { t } = useTranslation(['components', 'common']);

  // Transform artists to CustomSelect options
  const artistOptions = (availableArtistsForRelations || []).map(artist => ({
    value: artist.id.toString(),
    label: `${artist.name} (ID: ${artist.id})`
  }));

  // Get selected artist option
  const selectedArtistOption = newRelationArtistId 
    ? artistOptions.find(opt => opt.value === newRelationArtistId)
    : null;

  return (
    <div className="form-section relations-tab">
      <div className="form-group">
        <label>{tEntity('relations.search')}</label>
        <CustomSelect
          options={artistOptions}
          value={selectedArtistOption}
          onChange={(option) => {
            if (option) {
              setNewRelationArtistId(option.value);
            } else {
              setNewRelationArtistId('');
            }
          }}
          onInputChange={(value) => {
            setRelationSearch(value);
          }}
          placeholder={tEntity('relations.placeholder')}
          isSearchable={true}
          width="100%"
          isLoading={availableArtistsForRelations === null}
          noOptionsMessage={() => {
            if (availableArtistsForRelations === null) {
              return t('loading.searching', { ns: 'common' }) || 'Searching...';
            }
            if (!relationSearch.trim()) {
              return tEntity('relations.typeToSearch') || 'Type to search artists...';
            }
            return tEntity('relations.noResults') || 'No artists found';
          }}
        />
      </div>

      <div className="form-actions">
        <button
          className="submit-button"
          onClick={handleAddRelation}
          disabled={!newRelationArtistId}
        >
          {tEntity('buttons.addRelation')}
        </button>
      </div>

      <div className="entity-list">
        <h4>{tEntity('relations.existing')}</h4>
        {relations.length === 0 ? (
          <p className="no-relations">{tEntity('relations.none')}</p>
        ) : (
          <div className="relations-list">
            {relations.map((relation) => (
              <div key={relation.id} className="entity-item">
                {relation.avatarUrl && (
                  <img src={relation.avatarUrl} alt={relation.name} className="entity-avatar" />
                )}
                <div className="entity-info">
                  <span>{relation.name} (ID: {relation.id})</span>
                </div>
                <button onClick={() => handleRemoveRelation(relation.id)}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelationsTab;

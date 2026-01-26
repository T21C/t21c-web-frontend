import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';

export const MergeTab = ({
  type,
  sourceEntitySearch,
  setSourceEntitySearch,
  availableSourceEntities,
  currentSourceEntity,
  setSourceEntity,
  targetEntitySearch,
  setTargetEntitySearch,
  availableTargetEntities,
  currentTargetEntity,
  setTargetEntity,
  handleMerge,
  isLoading,
  isSearchingSource,
  isSearchingTarget,
  tEntity
}) => {
  const { t } = useTranslation(['components', 'common']);

  // Ensure current source entity is always in options
  const sourceOptions = useMemo(() => {
    const options = availableSourceEntities?.map(entity => ({
      value: entity.id,
      label: `${entity.name} (ID: ${entity.id})`
    })) || [];
    
    // Add current source entity if it's not already in the list
    if (currentSourceEntity && !options.find(opt => opt.value === currentSourceEntity.id)) {
      options.unshift({
        value: currentSourceEntity.id,
        label: `${currentSourceEntity.name} (ID: ${currentSourceEntity.id})`
      });
    }
    
    return options;
  }, [availableSourceEntities, currentSourceEntity]);

  const targetOptions = availableTargetEntities?.map(entity => ({
    value: entity.id,
    label: `${entity.name} (ID: ${entity.id})`
  })) || [];

  return (
    <div className="form-section">
      <p className="info-text">{tEntity('merge.info')}</p>
      
      <div className="form-group">
        <CustomSelect
          label={tEntity('merge.sourceEntity') || 'Source Entity'}
          options={sourceOptions}
          value={currentSourceEntity ? {
            value: currentSourceEntity.id,
            label: `${currentSourceEntity.name} (ID: ${currentSourceEntity.id})`
          } : null}
          onChange={(option) => {
            if (!option) {
              setSourceEntity(null);
              return;
            }
            // Try to find in available entities first
            let entity = availableSourceEntities?.find(e => e.id === option?.value);
            // If not found and it's the current source entity, use that
            if (!entity && currentSourceEntity && currentSourceEntity.id === option?.value) {
              entity = currentSourceEntity;
            }
            setSourceEntity(entity || { id: option.value, name: option.label.split(' (ID:')[0] });
          }}
          placeholder={tEntity('merge.sourcePlaceholder') || 'Type to search...'}
          onInputChange={(value) => setSourceEntitySearch(value)}
          isSearchable={true}
          width="100%"
          isLoading={isSearchingSource}
          noOptionsMessage={() => isSearchingSource ? "Loading..." : (sourceEntitySearch ? "No results found" : "Type to search...")}
        />
      </div>

      <div className="form-group">
        <CustomSelect
          label={tEntity('merge.targetEntity') || 'Target Entity'}
          options={targetOptions}
          value={currentTargetEntity ? {
            value: currentTargetEntity.id,
            label: `${currentTargetEntity.name} (ID: ${currentTargetEntity.id})`
          } : null}
          onChange={(option) => {
            const entity = availableTargetEntities?.find(e => e.id === option?.value);
            setTargetEntity(entity);
          }}
          placeholder={tEntity('merge.targetPlaceholder') || 'Type to search...'}
          onInputChange={(value) => setTargetEntitySearch(value)}
          isSearchable={true}
          width="100%"
          isLoading={isSearchingTarget}
          noOptionsMessage={() => isSearchingTarget ? "Loading..." : (targetEntitySearch ? "No results found" : "Type to search...")}
        />
      </div>

      <div className="form-actions">
        <button
          className="submit-button"
          onClick={handleMerge}
          disabled={isLoading || !currentSourceEntity || !currentTargetEntity}
        >
          {isLoading ? tEntity('buttons.merging') : tEntity('buttons.merge')}
        </button>
      </div>
    </div>
  );
};

export default MergeTab;

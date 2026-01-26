import React from 'react';
import { useTranslation } from 'react-i18next';
import { CustomSelect } from '@/components/common/selectors';

export const SplitTab = ({
  type,
  splitEntity1,
  setSplitEntity1,
  splitEntity2,
  setSplitEntity2,
  splitSearch1,
  setSplitSearch1,
  splitSearch2,
  setSplitSearch2,
  availableEntities1,
  availableEntities2,
  deleteOriginal,
  setDeleteOriginal,
  handleSplit,
  isLoading,
  tEntity
}) => {
  const { t } = useTranslation(['components', 'common']);
  return (
    <div className="form-section">
      <p className="info-text">{tEntity('split.info')}</p>
      <div className="form-group">
        <label>{tEntity('split.entity1')}</label>
        <CustomSelect
          options={availableEntities1 === null ? [] : availableEntities1.map(e => ({
            value: e.id,
            label: `${e.name} (ID: ${e.id})${e.avatarUrl && type === 'artist' ? ' 🖼️' : ''}`
          }))}
          value={splitEntity1 ? {
            value: splitEntity1.id,
            label: `${splitEntity1.name} (ID: ${splitEntity1.id})`
          } : null}
          onChange={(option) => {
            const entity = availableEntities1?.find(e => e.id === option?.value);
            setSplitEntity1(entity || null);
          }}
          placeholder={tEntity('split.entity1Placeholder')}
          onInputChange={(value) => setSplitSearch1(value)}
          isSearchable={true}
          width="100%"
          isLoading={availableEntities1 === null}
          noOptionsMessage={() => availableEntities1 === null ? "Loading..." : "Type to search..."}
        />
      </div>
      <div className="form-group">
        <label>{tEntity('split.entity2')}</label>
        <CustomSelect
          options={availableEntities2 === null ? [] : availableEntities2.map(e => ({
            value: e.id,
            label: `${e.name} (ID: ${e.id})${e.avatarUrl && type === 'artist' ? ' 🖼️' : ''}`
          }))}
          value={splitEntity2 ? {
            value: splitEntity2.id,
            label: `${splitEntity2.name} (ID: ${splitEntity2.id})`
          } : null}
          onChange={(option) => {
            const entity = availableEntities2?.find(e => e.id === option?.value);
            setSplitEntity2(entity || null);
          }}
          placeholder={tEntity('split.entity2Placeholder')}
          onInputChange={(value) => setSplitSearch2(value)}
          isSearchable={true}
          width="100%"
          isLoading={availableEntities2 === null}
          noOptionsMessage={() => availableEntities2 === null ? "Loading..." : "Type to search..."}
        />
      </div>
      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={deleteOriginal}
            onChange={(e) => setDeleteOriginal(e.target.checked)}
          />
          {tEntity('split.deleteOriginal')}
        </label>
      </div>
      <div className="form-actions">
        <button
          className="submit-button"
          onClick={handleSplit}
          disabled={isLoading || !splitEntity1 || !splitEntity2}
        >
          {isLoading ? tEntity('buttons.splitting') : tEntity('buttons.split')}
        </button>
      </div>
    </div>
  );
};

export default SplitTab;

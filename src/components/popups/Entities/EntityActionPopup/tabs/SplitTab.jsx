import React from 'react';
import { useTranslation } from 'react-i18next';

export const SplitTab = ({
  splitName1,
  setSplitName1,
  splitName2,
  setSplitName2,
  deleteOriginal,
  setDeleteOriginal,
  showSplitConfirm,
  existingArtists,
  useExisting1,
  setUseExisting1,
  useExisting2,
  setUseExisting2,
  handleSplitCheck,
  handleSplitConfirm,
  handleSplitCancel,
  isLoading,
  tEntity
}) => {
  const { t } = useTranslation('common');
  return (
    <div className="form-section">
      {!showSplitConfirm ? (
        <>
          <p className="info-text">{tEntity('split.info')}</p>
          <div className="form-group">
            <label>{tEntity('split.name1')}</label>
            <input
              type="text"
              value={splitName1}
              onChange={(e) => setSplitName1(e.target.value)}
              placeholder={tEntity('split.name1Placeholder')}
            />
          </div>
          <div className="form-group">
            <label>{tEntity('split.name2')}</label>
            <input
              type="text"
              value={splitName2}
              onChange={(e) => setSplitName2(e.target.value)}
              placeholder={tEntity('split.name2Placeholder')}
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
              onClick={handleSplitCheck}
              disabled={isLoading || !splitName1.trim() || !splitName2.trim()}
            >
              {isLoading ? tEntity('buttons.checking') : tEntity('buttons.split')}
            </button>
          </div>
        </>
      ) : (
        <div className="split-confirm-section">
          <p className="info-text warning">{tEntity('split.confirmTitle')}</p>
          
          {existingArtists.existing1 && (
            <div className="existing-artist-warning">
              <p>{tEntity('split.existing1', {name: existingArtists.existing1.name})}</p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useExisting1}
                  onChange={(e) => setUseExisting1(e.target.checked)}
                />
                {tEntity('split.useExisting')}
              </label>
            </div>
          )}
          
          {existingArtists.existing2 && (
            <div className="existing-artist-warning">
              <p>{tEntity('split.existing2', {name: existingArtists.existing2.name})}</p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useExisting2}
                  onChange={(e) => setUseExisting2(e.target.checked)}
                />
                {tEntity('split.useExisting')}
              </label>
            </div>
          )}

          <div className="form-actions">
            <button
              className="submit-button"
              onClick={handleSplitConfirm}
              disabled={isLoading}
            >
              {isLoading ? tEntity('buttons.splitting') : tEntity('buttons.proceed')}
            </button>
            <button
              className="cancel-button"
              onClick={handleSplitCancel}
              disabled={isLoading}
            >
              {t('buttons.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitTab;

import React from 'react';
import { isImageUrl, isCdnUrl } from '@/utils/Utility';
import { EvidenceGalleryPopup } from '@/components/popups';

export const EvidenceTab = ({
  type,
  entityId,
  isDragOver,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleEvidenceFileSelect,
  evidenceFiles,
  handleRemoveEvidencePreview,
  handleAddEvidence,
  isUploadingEvidence,
  evidences,
  showEvidenceGallery,
  setShowEvidenceGallery,
  handleDeleteEvidence,
  newEvidenceLink,
  setNewEvidenceLink,
  handleAddEvidenceLink,
  editingEvidenceId,
  editingEvidenceLink,
  setEditingEvidenceLink,
  handleStartEditEvidence,
  handleCancelEditEvidence,
  handleUpdateEvidence,
  entityExtraInfo,
  editingEntityExtraInfo,
  setEditingEntityExtraInfo,
  isEditingEntityExtraInfo,
  handleStartEditEntityExtraInfo,
  handleCancelEditEntityExtraInfo,
  handleSaveEntityExtraInfo,
  tEntity
}) => {
  const hasEntityExtraInfoChanges = isEditingEntityExtraInfo && (
    editingEntityExtraInfo !== (entityExtraInfo || '')
  );

  return (
    <div className="form-section">
      {/* Entity Extra Info Section */}
      <div className="form-group">
        <label>{tEntity('entityExtraInfo.label') || `${type === 'song' ? 'Song' : 'Artist'} Extra Info`}</label>
        {isEditingEntityExtraInfo ? (
          <div className="entity-extra-info-edit">
            <textarea
              value={editingEntityExtraInfo}
              onChange={(e) => setEditingEntityExtraInfo(e.target.value)}
              className="entity-extra-info-textarea"
              placeholder={tEntity('entityExtraInfo.placeholder', {type}) || 'Additional notes or information about this ' + type}
              rows={4}
            />
            <div className="entity-extra-info-actions">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveEntityExtraInfo();
                }} 
                className="entity-extra-info-save-btn"
                disabled={!hasEntityExtraInfoChanges}
                title={tEntity('buttons.save')}
                type="button"
              >
                {tEntity('buttons.save') || 'Save'}
              </button>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCancelEditEntityExtraInfo();
                }} 
                className="entity-extra-info-cancel-btn"
                title={tEntity('buttons.cancel') || 'Cancel'}
                type="button"
              >
                {tEntity('buttons.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        ) : (
          <div className="entity-extra-info-display">
            <div className="entity-extra-info-content">
              {entityExtraInfo ? (
                <p>{entityExtraInfo}</p>
              ) : (
                <p className="entity-extra-info-empty">
                  {tEntity('entityExtraInfo.empty') || 'No extra info added'}
                </p>
              )}
            </div>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleStartEditEntityExtraInfo();
                }} 
                className="entity-extra-info-edit-btn"
                title={tEntity('buttons.edit') || 'Edit'}
                type="button"
              >
                {tEntity('buttons.edit') || 'Edit'}
              </button>
          </div>
        )}
      </div>

      {/* Add external evidence link */}
      <div className="form-group">
        <label>{tEntity('evidence.addLink') || 'Add External Evidence Link'}</label>
        <div className="entity-input-group">
          <input
            type="text"
            value={newEvidenceLink}
            onChange={(e) => setNewEvidenceLink(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddEvidenceLink();
              }
            }}
            placeholder={tEntity('evidence.linkPlaceholder') || 'Enter external URL'}
          />
          <button onClick={handleAddEvidenceLink}>{tEntity('buttons.add')}</button>
        </div>
      </div>

      {/* Drop-in field for uploading new evidence */}
      <div className="evidence-upload-zone">
        <div
          className={`evidence-drop-zone ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            id="evidence-upload-input"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleEvidenceFileSelect(e.target.files);
              }
              // Reset input so same file can be selected again
              e.target.value = '';
            }}
          />
          <label htmlFor="evidence-upload-input" className="evidence-drop-label">
            <div className="evidence-drop-content">
              <span className="evidence-drop-icon">📁</span>
              <span className="evidence-drop-text">
                {tEntity('evidence.dropZoneText')}
              </span>
              <span className="evidence-drop-hint">
                {tEntity('evidence.dropZoneHint')}
              </span>
            </div>
          </label>
        </div>

        {/* Show previews of files selected for upload */}
        {evidenceFiles.length > 0 && (
          <div className="evidence-preview-upload">
            <div className="evidence-items-container">
              {evidenceFiles.map((evidenceFile, index) => (
                <div key={index} className="evidence-item">
                  <img
                    src={evidenceFile.preview || ''}
                    alt="Evidence preview"
                    className={evidenceFile.preview ? '' : 'loading'}
                  />
                  <button onClick={() => handleRemoveEvidencePreview(index)} title={tEntity('buttons.remove')}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddEvidence} 
              disabled={isUploadingEvidence || evidenceFiles.length === 0}
              className="upload-evidence-btn"
            >
              {isUploadingEvidence ? tEntity('buttons.uploading') : tEntity('buttons.upload')}
            </button>
          </div>
        )}
      </div>

      {/* Show existing uploaded evidence */}
      {evidences.length > 0 && (
        <div className="evidence-preview">
          <label>{tEntity('evidence.existing')}</label>
          <div className="evidence-items-container">
            {evidences.map((evidence) => {
              const isImage = isImageUrl(evidence.link);
              const isCdn = isCdnUrl(evidence.link);
              const isEditing = editingEvidenceId === evidence.id;
              const hasChanges = isEditing && editingEvidenceLink !== evidence.link;
              
              return (
                <div key={evidence.id} className="evidence-item">
                  {isEditing ? (
                    <div className="evidence-edit-form">
                      <input
                        type="text"
                        value={editingEvidenceLink}
                        onChange={(e) => setEditingEvidenceLink(e.target.value)}
                        className="evidence-edit-input"
                        placeholder={tEntity('evidence.linkPlaceholder') || 'Enter URL'}
                      />
                      <div className="evidence-edit-actions">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleUpdateEvidence(evidence.id);
                          }} 
                          className="evidence-save-btn"
                          disabled={!hasChanges}
                          title={tEntity('buttons.save')}
                          type="button"
                        >
                          ✓
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCancelEditEvidence();
                          }} 
                          className="evidence-cancel-btn"
                          title={tEntity('buttons.cancel') || 'Cancel'}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isImage ? (
                        <img
                          src={evidence.link}
                          alt="Evidence"
                          onClick={() => setShowEvidenceGallery(true)}
                        />
                      ) : (
                        <div
                          className="evidence-link-item"
                          onClick={() => setShowEvidenceGallery(true)}
                          title={evidence.link}
                        >
                          <span className="evidence-link-icon">🔗</span>
                        </div>
                      )}
                      {evidence.extraInfo && (
                        <div className="evidence-extra-info-preview" title={evidence.extraInfo}>
                          <span className="evidence-extra-info-icon">ℹ️</span>
                          <span className="evidence-extra-info-text">
                            {evidence.extraInfo.length > 50 
                              ? evidence.extraInfo.substring(0, 50) + '...' 
                              : evidence.extraInfo}
                          </span>
                        </div>
                      )}
                      <div className="evidence-item-info">
                        {isCdn ? (
                          <span className="evidence-cdn-badge" title="CDN Link (read-only)">
                            CDN
                          </span>
                        ) : (
                          <span className="evidence-external-badge" title="External Link (editable)">
                            External
                          </span>
                        )}
                      </div>
                      <div className="evidence-item-actions">
                        {!isCdn && (
                          <button 
                            onClick={() => handleStartEditEvidence(evidence)} 
                            className="evidence-edit-btn"
                            title={tEntity('buttons.edit') || 'Edit'}
                          >
                            ✎
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteEvidence(evidence.id)} 
                          className="evidence-delete-btn"
                          title={tEntity('buttons.delete')}
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showEvidenceGallery && (
        <EvidenceGalleryPopup
          evidence={evidences}
          onClose={() => setShowEvidenceGallery(false)}
          onDelete={handleDeleteEvidence}
          canDelete={true}
        />
      )}
    </div>
  );
};

export default EvidenceTab;

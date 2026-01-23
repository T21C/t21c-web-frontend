import React from 'react';
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
  tEntity
}) => {
  return (
    <div className="form-section">
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
            {evidences.map((evidence) => (
              <div key={evidence.id} className="evidence-item">
                <img
                  src={evidence.link}
                  alt="Evidence"
                  onClick={() => setShowEvidenceGallery(true)}
                />
                <button onClick={() => handleDeleteEvidence(evidence.id)} title={tEntity('buttons.delete')}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            ))}
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

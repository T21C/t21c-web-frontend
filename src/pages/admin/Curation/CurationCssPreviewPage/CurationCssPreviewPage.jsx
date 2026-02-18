import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '@/utils/api';
import toast from 'react-hot-toast';
import LevelDetailPage from '@/pages/common/Level/LevelDetailPage/LevelDetailPage';
import { ABILITIES, hasBit } from '@/utils/Abilities';
import { canAssignCurationType } from '@/utils/curationTypeUtils';
import { hasAnyFlag, permissionFlags } from '@/utils/UserPermissions';
import { useAuth } from "@/contexts/AuthContext";
import './curationcsspreviewpage.css';
import { AccessDenied } from '@/components/common/display';

const CurationCssPreviewPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const { user } = useAuth();
  
  const { levelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [curation, setCuration] = useState(null);
  const [customCSS, setCustomCSS] = useState('');
  const [isEditorCollapsed, setIsEditorCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [originalCSS, setOriginalCSS] = useState('');
  const [levelData, setLevelData] = useState(null);

  // Check if user can access this curation
  const canAccessCuration = (curation) => {
    if (!curation || !user) return false;
    
    // Super admins and head curators can access all curations
    if (hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR])) {
      return true;
    }
    
    // Check if user can assign this curation type
    if (curation.type && curation.type.abilities) {
      return canAssignCurationType(user.permissionFlags, curation.type.abilities);
    }
    
    return false;
  };

  // Get the CSS from the location state or URL parameters
  useEffect(() => {
    let cssContent = '';
    
    // First try to get from location state (passed from CurationEditPopup)
    if (location.state?.customCSS !== undefined) {
      cssContent = location.state.customCSS;
    } else {
      // Fallback to URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const cssParam = urlParams.get('css');
      if (cssParam) {
        cssContent = decodeURIComponent(cssParam);
      }
    }
    
    if (cssContent) {
      setCustomCSS(cssContent);
      setOriginalCSS(cssContent);
    }
  }, [location.state]);

  // Fetch curation data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch level data first
        try {
          const levelResponse = await api.get(`${import.meta.env.VITE_LEVELS}/${levelId}`);
          const passesResponse = await api.get(`${import.meta.env.VITE_PASSES}/level/${levelId}`);
          
          setLevelData({
            ...levelResponse.data,
            passes: passesResponse.data
          });
          setCuration(levelResponse.data.level.curation);
        } catch (error) {
          console.error('Error fetching level data:', error);
          toast.error('Failed to load level data');
          return;
        }

      } catch (error) {
        toast.error('Failed to load data');
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (levelId) {
      fetchData();
    }
  }, [levelId]);

    // Apply CSS to the page
  useEffect(() => {
    if (typeof window !== 'undefined' && window.setCurationCssOverride && window.setDisableDefaultStyling) {
      window.setDisableDefaultStyling(true);
      window.setCurationCssOverride(customCSS || '');
    }
  }, [customCSS]);

  // No longer needed - using props instead of global context

  // Cleanup CSS when component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.setCurationCssOverride && window.setDisableDefaultStyling) {
        window.setCurationCssOverride('');
        window.setDisableDefaultStyling(false);
      }
    };
  }, []);

  const hasUnsavedChanges = customCSS !== originalCSS;

  const handleSave = async () => {
    if (!curation) {
      toast.error('No curation found for this level');
      return;
    }

    const typeId = curation.typeId ?? curation.type?.id;
    if (typeId == null || isNaN(Number(typeId))) {
      toast.error('Curation type is missing');
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        typeId: parseInt(typeId, 10),
        shortDescription: curation.shortDescription ?? '',
        description: curation.description ?? '',
        customCSS: customCSS ?? '',
        customColor: curation.customColor ?? null
      };

      const response = await api.put(`${import.meta.env.VITE_CURATIONS}/${curation.id}`, payload);

      const updatedCuration = response.data?.curation ?? { ...curation, customCSS };
      setCuration(updatedCuration);
      setOriginalCSS(customCSS);

      if (levelData?.level?.curation) {
        setLevelData((prev) => ({
          ...prev,
          level: {
            ...prev.level,
            curation: { ...prev.level.curation, customCSS }
          }
        }));
      }

      toast.success(t('curationCssPreview.notifications.saved'));
    } catch (error) {
      const errorMessage = error.response?.data?.error || t('curationCssPreview.errors.saveFailed');
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const confirmed = window.confirm(t('curationCssPreview.confirmations.reset'));
    if (!confirmed) return;

    setCustomCSS(originalCSS);
    toast.success(t('curationCssPreview.notifications.reset'));
  };

  const handleReturn = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(t('confirmations.unsavedChanges', { ns: 'common' }));
      if (!confirmed) return;
    }

    const curationToPass = { ...curation, customCSS: hasUnsavedChanges ? originalCSS : customCSS };

    navigate(`/admin/curations`, {
      state: { 
        updatedCuration: curationToPass,
        action: 'returned'
      }
    });
  };

  // Warn on tab close / navigate away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  if (isLoading || !levelData) {
    return (
      <div className="curation-css-preview-loading">
        <div className="spinner spinner-large spinner-primary"></div>
        <p>{t('curationCssPreview.loading')}</p>
      </div>
    );
  }

  // Check if user can access this curation
  if (!canAccessCuration(curation)) {
    const currentUrl = window.location.origin + location.pathname;
    return (
      <AccessDenied 
        metaTitle={t('curationCssPreview.meta.title')}
        metaDescription={t('curationCssPreview.meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  // Check if curation type has CUSTOM_CSS ability
  if (!hasBit(curation?.type?.abilities, ABILITIES.CUSTOM_CSS)) {
    const currentUrl = window.location.origin + location.pathname;
    return (
      <AccessDenied 
        metaTitle={t('curationCssPreview.meta.title')}
        metaDescription={t('curationCssPreview.meta.description')}
        currentUrl={currentUrl}
      />
    );
  }



  return (
    <div className="curation-css-preview-page">
      {/* Fixed Collapse Button */}
      <button
        className="fixed-collapse-button"
        onClick={() => setIsEditorCollapsed(!isEditorCollapsed)}
        title={isEditorCollapsed ? t('curationCssPreview.editor.expand') : t('curationCssPreview.editor.collapse')}
      >
        {isEditorCollapsed ? '◀' : '▶'}
      </button>

      {/* CSS Editor Overlay */}
      <div className={`css-editor-overlay ${isEditorCollapsed ? 'collapsed' : ''}`}>
        <div className="css-editor-header">
          <div className="css-editor-title">
            <h3>{t('curationCssPreview.editor.title')}</h3>
            <p>{t('curationCssPreview.editor.subtitle')}</p>
          </div>
        </div>
        
        <div className="css-editor-content">
          {/* Warning if curation type doesn't have CUSTOM_CSS ability */}
          {curation?.type && !hasBit(curation.type.abilities, ABILITIES.CUSTOM_CSS) && (
            <div className="css-editor-warning">
              <p><strong>⚠️ Warning:</strong> This curation type doesn&apos;t have the &quot;Custom CSS&quot; ability enabled. 
              Custom CSS will not be applied to the actual level page, but you can still preview it here.</p>
            </div>
          )}
          
          <div className="css-editor-textarea-container">
            <label htmlFor="css-editor">{t('curationCssPreview.editor.cssLabel')}</label>
            <textarea
              id="css-editor"
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              placeholder={t('curationCssPreview.editor.placeholder')}
              className="css-editor-textarea"
            />
            <div className="css-editor-help">
              <p>{t('curationCssPreview.editor.help')}</p>
              <p><strong>Note:</strong> Your CSS is injected as-is after the base styles. Target <code>.level-detail</code> and its descendants. No transformation is applied.</p>
              <p><strong>Example:</strong> <code>.left {'{'} box-shadow: 0 0 10px; {'}'}</code> will target the left section.</p>
            </div>
          </div>
          
          <div className="css-editor-actions">
            <button
              className="reset-button"
              onClick={handleReset}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {t('buttons.reset', { ns: 'common' })}
            </button>
            <button
              className="save-button"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving ? t('loading.saving', { ns: 'common' }) : t('buttons.save', { ns: 'common' })}
            </button>
            <button
              className="return-button"
              onClick={handleReturn}
              disabled={isSaving}
            >
              {t('buttons.return', { ns: 'common' })}
            </button>
          </div>
        </div>
      </div>

      {/* Reuse the existing LevelDetailPage component */}
      <div className={`level-detail-wrapper ${isEditorCollapsed ? 'collapsed' : ''}`}>
        <LevelDetailPage 
          mockData={levelData}
        />
      </div>
    </div>
  );
};

export default CurationCssPreviewPage;
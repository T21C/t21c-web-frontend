import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { MetaTags } from '@/components/common/display';
import { ScrollButton } from '@/components/common/buttons';
import api from '@/utils/api';
import './curationpreviewpage.css';
import { useTranslation } from 'react-i18next';
import { formatCreatorDisplay } from '@/utils/Utility';
import { formatDate } from '@/utils/Utility';
import i18next from 'i18next';

const CurationPreviewPage = () => {
  const { id } = useParams();
  const { t } = useTranslation('pages');
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [curation, setCuration] = useState(null);
  const [level, setLevel] = useState(null);

  useEffect(() => {
    const fetchCuration = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`${import.meta.env.VITE_CURATIONS}/${id}`);
        setCuration(response.data);
        
        // Fetch level details if not included
        if (response.data.levelId) {
          const levelResponse = await api.get(`${import.meta.env.VITE_LEVELS}/${response.data.levelId}`);
          setLevel(levelResponse.data);
        }
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to fetch curation');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchCuration();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="curation-preview-page">
        
        <div className="curation-preview-page__loading">
          {t('curationPreview.loading')}
        </div>
      </div>
    );
  }

  if (error || !curation) {
    return (
      <div className="curation-preview-page">
        
        <div className="curation-preview-page__error">
          {error || t('curationPreview.notFound')}
        </div>
      </div>
    );
  }

  return (
    <div className="curation-preview-page">
      <MetaTags 
        title={t('curationPreview.meta.title', { song: level?.song || 'Unknown' })}
        description={t('curationPreview.meta.description', { song: level?.song || 'Unknown' })}
        url={currentUrl}
      />
      
      
      
      <div className="curation-preview-page__content page-content-800">
        <div className="curation-preview-page__header">
          <div className="curation-preview-page__type-badge" style={{ backgroundColor: curation.type?.color }}>
            {curation.type?.name}
          </div>
          <h1>{level?.song || 'Unknown Level'}</h1>
          <p className="curation-preview-page__artist">{level?.artist || 'Unknown Artist'}</p>
          <p className="curation-preview-page__creator">by {formatCreatorDisplay(level)}</p>
        </div>

        {curation.previewLink && (
          <div className="curation-preview-page__preview">
            <img 
              src={curation.previewLink} 
              alt={t('curationPreview.preview.alt', { song: level?.song || 'Unknown' })}
              className="curation-preview-page__preview-image"
            />
          </div>
        )}

        {curation.description && (
          <div className="curation-preview-page__description">
            <h2>{t('curationPreview.description.title')}</h2>
            <p>{curation.description}</p>
          </div>
        )}

        {level && (
          <div className="curation-preview-page__level-info">
            <h2>{t('curationPreview.levelInfo.title')}</h2>
            <div className="curation-preview-page__level-details">
              <div className="curation-preview-page__detail">
                <span className="curation-preview-page__detail-label">{t('curationPreview.levelInfo.difficulty')}</span>
                <span className="curation-preview-page__detail-value">{level.difficulty?.name || 'Unknown'}</span>
              </div>
              <div className="curation-preview-page__detail">
                <span className="curation-preview-page__detail-label">{t('curationPreview.levelInfo.clears')}</span>
                <span className="curation-preview-page__detail-value">{level.clears || 0}</span>
              </div>
              <div className="curation-preview-page__detail">
                <span className="curation-preview-page__detail-label">{t('curationPreview.levelInfo.likes')}</span>
                <span className="curation-preview-page__detail-value">{level.likes || 0}</span>
              </div>
              {level.videoLink && (
                <div className="curation-preview-page__detail">
                  <span className="curation-preview-page__detail-label">{t('curationPreview.levelInfo.video')}</span>
                  <a 
                    href={level.videoLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="curation-preview-page__detail-link"
                  >
                    {t('curationPreview.levelInfo.watchVideo')}
                  </a>
                </div>
              )}
              {level.dlLink && (
                <div className="curation-preview-page__detail">
                  <span className="curation-preview-page__detail-label">{t('curationPreview.levelInfo.download')}</span>
                  <a 
                    href={level.dlLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="curation-preview-page__detail-link"
                  >
                    {t('curationPreview.levelInfo.downloadLevel')}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="curation-preview-page__footer">
          <p className="curation-preview-page__assigned-by">
            {t('curationPreview.footer.assignedBy', { user: curation.assignedBy })}
          </p>
          <p className="curation-preview-page__date">
            {t('curationPreview.footer.assignedOn', { date: formatDate(curation.createdAt, i18next?.language) })}
          </p>
        </div>
      </div>

      <ScrollButton />
    </div>
  );
};

export default CurationPreviewPage;

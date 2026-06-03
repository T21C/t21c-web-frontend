import { routes } from '@/api/routes';
// tuf-search: #AnnouncementPage #announcementPage #admin #announcement — Announcements
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";

import { ScrollButton } from '@/components/common/buttons';
import { EditLevelPopup } from '@/components/popups/Levels';
import api from '@/utils/api';
import './announcementpage.css';
import NewLevelsTab from './components/NewLevelsTab';
import ReratesTab from './components/ReratesTab';
import PassesTab from './components/PassesTab';
import { RefreshIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { AccessDenied, MetaTags } from '@/components/common/display';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';

const AnnouncementPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation('pages');
  const currentUrl = window.location.origin + location.pathname;

  const [activeTab, setActiveTab] = useState('newLevels');
  const [newLevelEntries, setNewLevelEntries] = useState([]);
  const [rerateEntries, setRerateEntries] = useState([]);
  const [passes, setPasses] = useState([]);
  const [selectedQueueRowIds, setSelectedQueueRowIds] = useState([]);
  const [selectedPasses, setSelectedPasses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [error, setError] = useState(null);
  const [editingLevel, setEditingLevel] = useState(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [newLevelsResponse, reratesResponse, passesResponse] = await Promise.all([
        api.get(`${routes.database.levels.root()}/unannounced/new`),
        api.get(`${routes.database.levels.root()}/unannounced/rerates`),
        api.get(`${routes.database.passes.root()}/unannounced/new`)
      ]);

      setNewLevelEntries(newLevelsResponse.data);
      setRerateEntries(reratesResponse.data);
      setPasses(passesResponse.data);

      setSelectedQueueRowIds(prev =>
        prev.filter(id => {
          if (activeTab === 'newLevels') {
            return newLevelsResponse.data.some(e => e.queueRowId === id);
          }
          if (activeTab === 'rerates') {
            return reratesResponse.data.some(e => e.queueRowId === id);
          }
          return false;
        }),
      );

      setSelectedPasses(prev =>
        prev.filter(id => passesResponse.data.some(pass => pass.id === id)),
      );
    } catch (err) {
      setError(t('announcement.errors.fetchFailed'));
      console.error('Error fetching items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueueRowCheckboxChange = (queueRowId) => {
    setSelectedQueueRowIds(prev => {
      if (prev.includes(queueRowId)) {
        return prev.filter(id => id !== queueRowId);
      }
      return [...prev, queueRowId];
    });
  };

  const handlePassCheckboxChange = (passId) => {
    setSelectedPasses(prev => {
      if (prev.includes(passId)) {
        return prev.filter(id => id !== passId);
      }
      return [...prev, passId];
    });
  };

  const handleRemoveQueueRow = (queueRowId) => {
    setNewLevelEntries(prev => prev.filter(e => e.queueRowId !== queueRowId));
    setRerateEntries(prev => prev.filter(e => e.queueRowId !== queueRowId));
    setSelectedQueueRowIds(prev => prev.filter(id => id !== queueRowId));
  };

  const handleRemovePass = (passId) => {
    setPasses(prev => prev.filter(pass => pass.id !== passId));
    setSelectedPasses(prev => prev.filter(id => id !== passId));
  };

  const handleAnnounce = async () => {
    const hasSelectedItems =
      selectedQueueRowIds.length > 0 || selectedPasses.length > 0;
    if (!hasSelectedItems) return;

    const validPassIds = selectedPasses.filter(id => !isNaN(id) && id > 0);
    const validQueueRowIds = selectedQueueRowIds.filter(
      id => !isNaN(id) && id > 0,
    );

    if (
      validPassIds.length !== selectedPasses.length ||
      validQueueRowIds.length !== selectedQueueRowIds.length
    ) {
      setError(t('announcement.errors.invalidIds'));
      return;
    }

    setIsAnnouncing(true);
    setError(null);
    try {
      if (validQueueRowIds.length > 0) {
        await api.post(
          `${routes.webhook.root()}/${activeTab === 'newLevels' ? 'levels' : 'rerates'}`,
          { queueRowIds: validQueueRowIds },
        );

        setNewLevelEntries(prev =>
          prev.filter(e => !validQueueRowIds.includes(e.queueRowId)),
        );
        setRerateEntries(prev =>
          prev.filter(e => !validQueueRowIds.includes(e.queueRowId)),
        );
      }

      if (validPassIds.length > 0) {
        await api.post(`${routes.webhook.root()}/passes`, {
          passIds: validPassIds,
        });

        setPasses(prev => prev.filter(pass => !validPassIds.includes(pass.id)));
      }

      setSelectedQueueRowIds([]);
      setSelectedPasses([]);
    } catch (err) {
      setError(t('announcement.errors.announceFailed'));
      console.error('Error announcing items:', err);
      await fetchItems();
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleEditLevel = (level) => {
    setEditingLevel(level);
  };

  const handleLevelUpdate = async () => {
    try {
      const [newLevelsResponse, reratesResponse] = await Promise.all([
        api.get(`${routes.database.levels.root()}/unannounced/new`),
        api.get(`${routes.database.levels.root()}/unannounced/rerates`),
      ]);

      setNewLevelEntries(newLevelsResponse.data);
      setRerateEntries(reratesResponse.data);

      const newIds = new Set(newLevelsResponse.data.map(e => e.queueRowId));
      const rerateIds = new Set(reratesResponse.data.map(e => e.queueRowId));

      setSelectedQueueRowIds(prev =>
        prev.filter(id => {
          if (activeTab === 'newLevels') return newIds.has(id);
          if (activeTab === 'rerates') return rerateIds.has(id);
          return false;
        }),
      );
    } catch (err) {
      console.error('Error refreshing data:', err);
    }
    setEditingLevel(null);
  };

  const handleSelectAll = () => {
    if (activeTab === 'passes') {
      const allPassIds = passes.map(pass => pass.id);
      const shouldSelectAll = selectedPasses.length !== passes.length;
      setSelectedPasses(shouldSelectAll ? allPassIds : []);
    } else {
      const currentEntries =
        activeTab === 'newLevels' ? newLevelEntries : rerateEntries;
      const allIds = currentEntries.map(e => e.queueRowId);
      const shouldSelectAll = selectedQueueRowIds.length !== currentEntries.length;
      setSelectedQueueRowIds(shouldSelectAll ? allIds : []);
    }
  };

  if (user.permissionFlags === undefined) {
    return (
      <>
        <MetaTags
          title={t('announcement.meta.title')}
          description={t('announcement.meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />

        <div className="announcement-page">
          <div className="announcement-container page-content">
            <div className="loader-shell loader-shell--tall">
              <div className="loader loader-relative" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!hasFlag(user, permissionFlags.SUPER_ADMIN)) {
    return (
      <AccessDenied
        metaTitle={t('announcement.meta.title')}
        metaDescription={t('announcement.meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  if (error) {
    return (
      <>
        <MetaTags
          title={t('announcement.meta.title')}
          description={t('announcement.meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />

        <div className="announcement-page">
          <ScrollButton />
          <div className="announcement-container page-content">
            <div className="error-message">{error}</div>
            <button onClick={fetchItems} className="announce-button">
              {t('announcement.buttons.retry')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MetaTags
        title={t('announcement.meta.title')}
        description={t('announcement.meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />

      <div className="announcement-page">
        <ScrollButton />
        <div className="announcement-container page-content">
          <div className="header-container">
            <h1>{t('announcement.header.title')}</h1>
            <button
              className="refresh-button"
              onClick={fetchItems}
              disabled={isLoading}
              aria-label={t('announcement.buttons.refresh')}
            >
              <RefreshIcon color="#fff" size="40px" />
            </button>
          </div>

          <div className="tab-header">
            <div className="submission-tabs">
              <button
                className={`tab-button ${activeTab === 'newLevels' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('newLevels');
                  setSelectedQueueRowIds([]);
                  setSelectedPasses([]);
                }}
              >
                {t('announcement.tabs.newLevels')}
              </button>
              <button
                className={`tab-button ${activeTab === 'rerates' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('rerates');
                  setSelectedQueueRowIds([]);
                  setSelectedPasses([]);
                }}
              >
                {t('announcement.tabs.rerates')}
              </button>
              <button
                className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('passes');
                  setSelectedQueueRowIds([]);
                  setSelectedPasses([]);
                }}
              >
                {t('announcement.tabs.passes')}
              </button>
            </div>
          </div>

          <button
            className="select-all-button"
            onClick={handleSelectAll}
            disabled={
              isLoading ||
              (activeTab === 'passes'
                ? passes.length === 0
                : activeTab === 'newLevels'
                  ? newLevelEntries.length === 0
                  : rerateEntries.length === 0)
            }
          >
            {activeTab === 'passes'
              ? selectedPasses.length === passes.length
                ? t('announcement.buttons.deselectAll')
                : t('announcement.buttons.selectAll')
              : selectedQueueRowIds.length ===
                  (activeTab === 'newLevels'
                    ? newLevelEntries
                    : rerateEntries).length
                ? t('announcement.buttons.deselectAll')
                : t('announcement.buttons.selectAll')}
          </button>
          {error && <div className="error-message">{error}</div>}

          {activeTab === 'newLevels' && (
            <NewLevelsTab
              entries={newLevelEntries}
              selectedQueueRowIds={selectedQueueRowIds}
              onCheckboxChange={handleQueueRowCheckboxChange}
              onRemove={handleRemoveQueueRow}
              onEdit={handleEditLevel}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'rerates' && (
            <ReratesTab
              entries={rerateEntries}
              selectedQueueRowIds={selectedQueueRowIds}
              onCheckboxChange={handleQueueRowCheckboxChange}
              onRemove={handleRemoveQueueRow}
              onEdit={handleEditLevel}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'passes' && (
            <PassesTab
              passes={passes}
              selectedPasses={selectedPasses}
              onCheckboxChange={handlePassCheckboxChange}
              onRemove={handleRemovePass}
              isLoading={isLoading}
            />
          )}

          <div className="announcement-actions">
            <button
              className="announce-button"
              onClick={handleAnnounce}
              disabled={
                isLoading ||
                isAnnouncing ||
                (activeTab === 'passes'
                  ? selectedPasses.length === 0
                  : selectedQueueRowIds.length === 0)
              }
            >
              {isAnnouncing
                ? t('announcement.buttons.announcing')
                : t('announcement.buttons.announce')}
            </button>
          </div>
        </div>

        {editingLevel && (
          <EditLevelPopup
            level={editingLevel}
            onClose={() => setEditingLevel(null)}
            onUpdate={handleLevelUpdate}
            isFromAnnouncementPage={true}
          />
        )}
      </div>
    </>
  );
};

export default AnnouncementPage;

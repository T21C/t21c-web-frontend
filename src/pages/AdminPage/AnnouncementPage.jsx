import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { CompleteNav, MetaTags } from '@/components';
import ScrollButton from '@/components/ScrollButton/ScrollButton';
import { EditLevelPopup } from '@/components/EditLevelPopup/EditLevelPopup';
import api from '@/utils/api';
import './css/announcementpage.css';
import NewLevelsTab from './components/NewLevelsTab';
import ReratesTab from './components/ReratesTab';
import PassesTab from './components/PassesTab';
import { RefreshIcon } from '../../components/Icons/RefreshIcon';
import { useTranslation } from 'react-i18next';
import { AccessDenied } from '../../components';

const AnnouncementPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation('pages');
  const tAnnounce = (key) => t(`announcement.${key}`);
  const currentUrl = window.location.origin + location.pathname;

  const [activeTab, setActiveTab] = useState('newLevels');
  const [newLevels, setNewLevels] = useState([]);
  const [rerates, setRerates] = useState([]);
  const [passes, setPasses] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
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
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/new`),
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/rerates`),
        api.get(`${import.meta.env.VITE_PASSES}/unannounced/new`)
      ]);
      
      setNewLevels(newLevelsResponse.data);
      setRerates(reratesResponse.data);
      setPasses(passesResponse.data);

      setSelectedLevels(prev => {
        return prev.filter(id => {
          if (activeTab === 'newLevels') {
            return newLevelsResponse.data.some(level => level.id === id);
          } else if (activeTab === 'rerates') {
            return reratesResponse.data.some(level => level.id === id);
          }
          return false;
        });
      });
      
      setSelectedPasses(prev => 
        prev.filter(id => passesResponse.data.some(pass => pass.id === id))
      );
    } catch (err) {
      setError(tAnnounce('errors.fetchFailed'));
      console.error('Error fetching items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelCheckboxChange = (levelId) => {
    setSelectedLevels(prev => {
      if (prev.includes(levelId)) {
        return prev.filter(id => id !== levelId);
      } else {
        return [...prev, levelId];
      }
    });
  };

  const handlePassCheckboxChange = (passId) => {
    setSelectedPasses(prev => {
      if (prev.includes(passId)) {
        return prev.filter(id => id !== passId);
      } else {
        return [...prev, passId];
      }
    });
  };

  const handleRemoveLevel = (levelId) => {
    setNewLevels(prev => prev.filter(level => level.id !== levelId));
    setRerates(prev => prev.filter(level => level.id !== levelId));
    setSelectedLevels(prev => prev.filter(id => id !== levelId));
  };

  const handleRemovePass = (passId) => {
    setPasses(prev => prev.filter(pass => pass.id !== passId));
    setSelectedPasses(prev => prev.filter(id => id !== passId));
  };

  const handleAnnounce = async () => {
    const hasSelectedItems = selectedLevels.length > 0 || selectedPasses.length > 0;
    if (!hasSelectedItems) return;

    const validPassIds = selectedPasses.filter(id => !isNaN(id) && id > 0);
    const validLevelIds = selectedLevels.filter(id => !isNaN(id) && id > 0);

    if (validPassIds.length !== selectedPasses.length || validLevelIds.length !== selectedLevels.length) {
      setError(tAnnounce('errors.invalidIds'));
      return;
    }

    setIsAnnouncing(true);
    setError(null);
    try {
      if (validLevelIds.length > 0) {
        await api.post(`${import.meta.env.VITE_LEVELS}/announce`, {
          levelIds: validLevelIds
        });
        
        await api.post(`${import.meta.env.VITE_WEBHOOK}/${activeTab === 'newLevels' ? 'levels' : 'rerates'}`, {
          levelIds: validLevelIds
        });
        
        setNewLevels(prev => prev.filter(level => !validLevelIds.includes(level.id)));
        setRerates(prev => prev.filter(level => !validLevelIds.includes(level.id)));
      }

      if (validPassIds.length > 0) {
        await api.post(`${import.meta.env.VITE_PASSES}/announce`, {
          passIds: validPassIds
        });

        await api.post(`${import.meta.env.VITE_WEBHOOK}/passes`, {
          passIds: validPassIds
        });
        
        setPasses(prev => prev.filter(pass => !validPassIds.includes(pass.id)));
      }

      setSelectedLevels([]);
      setSelectedPasses([]);
    } catch (err) {
      setError(tAnnounce('errors.announceFailed'));
      console.error('Error announcing items:', err);
      await fetchItems();
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleEditLevel = (level) => {
    setEditingLevel(level);
  };

  const handleLevelUpdate = async (updatedData) => {
    try {
      const [newLevelsResponse, reratesResponse] = await Promise.all([
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/new`),
        api.get(`${import.meta.env.VITE_LEVELS}/unannounced/rerates`)
      ]);

      const currentNewLevels = new Set(newLevels.map(l => l.id));
      const currentRerates = new Set(rerates.map(l => l.id));

      setNewLevels(newLevelsResponse.data);
      setRerates(reratesResponse.data);

      const newNewLevels = new Set(newLevelsResponse.data.map(l => l.id));
      const newRerates = new Set(reratesResponse.data.map(l => l.id));

      setSelectedLevels(prev => {
        return prev.filter(id => {
          if (activeTab === 'newLevels') {
            return newNewLevels.has(id) && !newRerates.has(id);
          }
          else if (activeTab === 'rerates') {
            return newRerates.has(id) && !newNewLevels.has(id);
          }
          return false;
        });
      });
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
      const currentLevels = activeTab === 'newLevels' ? newLevels : rerates;
      const allLevelIds = currentLevels.map(level => level.id);
      const shouldSelectAll = selectedLevels.length !== currentLevels.length;
      setSelectedLevels(shouldSelectAll ? allLevelIds : []);
    }
  };

  if (user?.isSuperAdmin === undefined) {
    return (
      <>
        <MetaTags
          title={tAnnounce('meta.title')}
          description={tAnnounce('meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />
        <CompleteNav />
        <div className="background-level"></div>
        <div className="announcement-page">
          <div className="announcement-container">
            <div className="loader loader-level-detail"/>
          </div>
        </div>
      </>
    );
  }

  if (!user?.isSuperAdmin) {
    return (
      <AccessDenied 
        metaTitle={tAnnounce('meta.title')}
        metaDescription={tAnnounce('meta.description')}
        currentUrl={currentUrl}
      />
    );
  }

  if (error) {
    return (
      <>
        <MetaTags
          title={tAnnounce('meta.title')}
          description={tAnnounce('meta.description')}
          url={currentUrl}
          image="/og-image.jpg"
          type="website"
        />
        <CompleteNav />
        <div className="background-level"></div>
        <div className="announcement-page">
          <ScrollButton />
          <div className="announcement-container">
            <div className="error-message">{error}</div>
            <button onClick={fetchItems} className="announce-button">
              {tAnnounce('buttons.retry')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MetaTags
        title={tAnnounce('meta.title')}
        description={tAnnounce('meta.description')}
        url={currentUrl}
        image="/og-image.jpg"
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="announcement-page">
        <ScrollButton />
        <div className="announcement-container">
          <div className="header-container">
            <h1>{tAnnounce('header.title')}</h1>
            <button 
              className="refresh-button"
              onClick={fetchItems}
              disabled={isLoading}
              aria-label={tAnnounce('buttons.refresh')}
            >
              <RefreshIcon color="#fff" size="40px" />
            </button>
          </div>

          <div className="tab-header">
            <div className="submission-tabs">
              <button
                className={`tab-button ${activeTab === 'newLevels' ? 'active' : ''}`}
                onClick={() => setActiveTab('newLevels')}
              >
                {tAnnounce('tabs.newLevels')}
              </button>
              <button
                className={`tab-button ${activeTab === 'rerates' ? 'active' : ''}`}
                onClick={() => setActiveTab('rerates')}
              >
                {tAnnounce('tabs.rerates')}
              </button>
              <button
                className={`tab-button ${activeTab === 'passes' ? 'active' : ''}`}
                onClick={() => setActiveTab('passes')}
              >
                {tAnnounce('tabs.passes')}
              </button>
            </div>
          </div>

          <button
            className="select-all-button"
            onClick={handleSelectAll}
            style={{ marginBottom: '1rem', marginLeft: '1rem' }}
            disabled={isLoading || (
              activeTab === 'passes' ? passes.length === 0 : 
              activeTab === 'newLevels' ? newLevels.length === 0 : 
              rerates.length === 0
            )}
          >
            {activeTab === 'passes' 
              ? selectedPasses.length === passes.length 
                ? tAnnounce('buttons.deselectAll') 
                : tAnnounce('buttons.selectAll')
              : selectedLevels.length === (activeTab === 'newLevels' ? newLevels : rerates).length 
                ? tAnnounce('buttons.deselectAll') 
                : tAnnounce('buttons.selectAll')
            }
          </button>
          {error && <div className="error-message">{error}</div>}

          {activeTab === 'newLevels' && (
            <NewLevelsTab
              levels={newLevels}
              selectedLevels={selectedLevels}
              onCheckboxChange={handleLevelCheckboxChange}
              onRemove={handleRemoveLevel}
              onEdit={handleEditLevel}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'rerates' && (
            <ReratesTab
              levels={rerates}
              selectedLevels={selectedLevels}
              onCheckboxChange={handleLevelCheckboxChange}
              onRemove={handleRemoveLevel}
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
                isLoading || isAnnouncing || 
                (activeTab === 'passes' ? selectedPasses.length === 0 : selectedLevels.length === 0)
              }
            >
              {isAnnouncing ? tAnnounce('buttons.announcing') : tAnnounce('buttons.announce')}
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
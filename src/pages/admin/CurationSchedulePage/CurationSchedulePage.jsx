import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { CompleteNav } from '@/components/layout';
import { MetaTags, AccessDenied } from '@/components/common/display';
import { ScrollButton } from '@/components/common/buttons';
import api from '@/utils/api';
import './curationschedulepage.css';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { NavLink } from 'react-router-dom';
import { CurationSelectionPopup } from '@/components/popups';

const CurationSchedulePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation('pages');
  const tSch = (key, params = {}) => t(`curationSchedule.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [currentMonday, setCurrentMonday] = useState(getNextMonday(new Date()));
  const [showCurationSelection, setShowCurationSelection] = useState(false);
  const [selectionMode, setSelectionMode] = useState({ type: '', position: null }); // 'primary' or 'secondary'
  
  const primaryScrollRef = useRef(null);
  const secondaryScrollRef = useRef(null);

  // Get the next Monday from a given date
  function getNextMonday(date) {
    const day = date.getDay();
    const daysUntilMonday = day === 0 ? 1 : 8 - day; // If Sunday (0), get next Monday (1 day), otherwise 8 - current day
    const monday = new Date(date);
    monday.setDate(date.getDate() + daysUntilMonday);
    return monday;
  }

  // Get Monday of current week
  function getMondayOfWeek(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date);
    monday.setDate(diff);
    return monday;
  }

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get week label
  const getWeekLabel = (monday) => {
    const weekEnd = new Date(monday);
    weekEnd.setDate(monday.getDate() + 6);
    return `${formatDate(monday)} - ${formatDate(weekEnd)}`;
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.isSuperAdmin) {
      fetchSchedules();
    }
  }, [user, currentMonday]);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`${import.meta.env.VITE_CURATIONS}/schedules`, {
        params: {
          weekStart: currentMonday.toISOString().split('T')[0]
        }
      });
      setSchedules(response.data.schedules || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWeekChange = (direction) => {
    const newMonday = new Date(currentMonday);
    newMonday.setDate(currentMonday.getDate() + (direction * 7));
    setCurrentMonday(newMonday);
  };

  const handleAddCuration = (type, position = null) => {
    setSelectionMode({ type, position });
    setShowCurationSelection(true);
  };

  const handleCurationSelect = async (curation) => {
    try {
      const response = await api.post(`${import.meta.env.VITE_CURATIONS}/schedules`, {
        curationId: curation.id,
        weekStart: currentMonday.toISOString().split('T')[0],
        listType: selectionMode.type, // 'primary' or 'secondary'
        position: selectionMode.position
      });

      toast.success(tSch('notifications.added'));
      fetchSchedules();
      setShowCurationSelection(false);
      setSelectionMode({ type: '', position: null });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to add curation to schedule');
    }
  };

  const handleRemoveCuration = async (scheduleId) => {
    try {
      await api.delete(`${import.meta.env.VITE_CURATIONS}/schedules/${scheduleId}`);
      toast.success(tSch('notifications.removed'));
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to remove curation');
    }
  };

  const handleReorderCuration = async (scheduleId, newPosition) => {
    try {
      await api.put(`${import.meta.env.VITE_CURATIONS}/schedules/${scheduleId}`, {
        position: newPosition
      });
      fetchSchedules();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reorder curation');
    }
  };

  // Scroll functions for horizontal lists
  const scrollList = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = 300;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Filter schedules by type
  const primarySchedules = schedules.filter(s => s.listType === 'primary').slice(0, 10);
  const secondarySchedules = schedules.filter(s => s.listType === 'secondary').slice(0, 10);

  // Get excluded curation IDs for the popup
  const excludedIds = schedules.map(s => s.curationId || s.curation?.id).filter(Boolean);

  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
    return <AccessDenied />;
  }

  return (
    <div className="curation-schedule-page">
      <MetaTags 
        title={tSch('meta.title')}
        description={tSch('meta.description')}
        url={currentUrl}
      />
      
      <CompleteNav />
      
      <div className="curation-schedule-page__content">
        <div className="curation-schedule-page__header">
          <div className="curation-schedule-page__header-top">
            <NavLink
              className="curation-schedule-page__back-btn"
              to="/admin/curation"
              title={tSch('actions.backToCuration')}
            >
              ← {tSch('actions.backToCuration')}
            </NavLink>
            <h1>{tSch('title')}</h1>
          </div>
          <p>{tSch('description')}</p>
        </div>

        {/* Week Navigation */}
        <div className="curation-schedule-page__week-nav">
          <button 
            className="curation-schedule-page__week-btn"
            onClick={() => handleWeekChange(-1)}
          >
            ← {tSch('previousWeek')}
          </button>
          <h2 className="curation-schedule-page__week-title">
            {getWeekLabel(currentMonday)}
          </h2>
          <button 
            className="curation-schedule-page__week-btn"
            onClick={() => handleWeekChange(1)}
          >
            {tSch('nextWeek')} →
          </button>
        </div>

        {/* Primary Hall of Fame */}
        <div className="curation-schedule-page__hall-section">
          <div className="curation-schedule-page__hall-header">
            <h3>{tSch('primaryHall.title')}</h3>
            <p>{tSch('primaryHall.description')}</p>
            <span className="curation-schedule-page__count">
              {primarySchedules.length}/10
            </span>
          </div>
          
          <div className="curation-schedule-page__hall-container">
            <button 
              className="curation-schedule-page__scroll-btn curation-schedule-page__scroll-btn--left"
              onClick={() => scrollList(primaryScrollRef, 'left')}
              disabled={primarySchedules.length === 0}
            >
              ‹
            </button>
            
            <div className="curation-schedule-page__hall-scroll" ref={primaryScrollRef}>
              <div className="curation-schedule-page__hall-list">
                {primarySchedules.map((schedule, index) => (
                  <div key={schedule.id} className="curation-schedule-page__hall-item">
                    <div className="curation-schedule-page__hall-position">
                      {index + 1}
                    </div>
                    <div className="curation-schedule-page__hall-preview">
                      {schedule.scheduledCuration?.previewLink ? (
                        <img 
                          src={schedule.scheduledCuration.previewLink} 
                          alt="Level thumbnail"
                          className="curation-schedule-page__hall-thumbnail"
                        />
                      ) : (
                        <div className="curation-schedule-page__hall-no-thumbnail">
                          🎵
                        </div>
                      )}
                    </div>
                    <div className="curation-schedule-page__hall-info">
                      <h4>{schedule.scheduledCuration?.level?.song || 'Unknown Song'}</h4>
                      <p>{schedule.scheduledCuration?.level?.artist || 'Unknown Artist'}</p>
                      <div 
                        className="curation-schedule-page__hall-type"
                        style={{ backgroundColor: schedule.scheduledCuration?.type?.color + '80' || '#60606080' }}
                      >
                        {schedule.scheduledCuration?.type?.name || 'Unknown Type'}
                      </div>
                    </div>
                    <div className="curation-schedule-page__hall-actions">
                      <button
                        onClick={() => handleRemoveCuration(schedule.id)}
                        className="curation-schedule-page__remove-btn"
                        title={tSch('actions.remove')}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
                
                {primarySchedules.length < 10 && (
                  <button 
                    className="curation-schedule-page__add-slot"
                    onClick={() => handleAddCuration('primary', primarySchedules.length)}
                  >
                    <div className="curation-schedule-page__add-icon">+</div>
                    <span>{tSch('actions.addCuration')}</span>
                  </button>
                )}
              </div>
            </div>
            
            <button 
              className="curation-schedule-page__scroll-btn curation-schedule-page__scroll-btn--right"
              onClick={() => scrollList(primaryScrollRef, 'right')}
              disabled={primarySchedules.length === 0}
            >
              ›
            </button>
          </div>
        </div>

        {/* Secondary Hall of Fame */}
        <div className="curation-schedule-page__hall-section">
          <div className="curation-schedule-page__hall-header">
            <h3>{tSch('secondaryHall.title')}</h3>
            <p>{tSch('secondaryHall.description')}</p>
            <span className="curation-schedule-page__count">
              {secondarySchedules.length}/10
            </span>
          </div>
          
          <div className="curation-schedule-page__hall-container">
            <button 
              className="curation-schedule-page__scroll-btn curation-schedule-page__scroll-btn--left"
              onClick={() => scrollList(secondaryScrollRef, 'left')}
              disabled={secondarySchedules.length === 0}
            >
              ‹
            </button>
            
            <div className="curation-schedule-page__hall-scroll" ref={secondaryScrollRef}>
              <div className="curation-schedule-page__hall-list">
                {secondarySchedules.map((schedule, index) => (
                  <div key={schedule.id} className="curation-schedule-page__hall-item">
                    <div className="curation-schedule-page__hall-position">
                      {index + 1}
                    </div>
                    <div className="curation-schedule-page__hall-preview">
                      {schedule.scheduledCuration?.previewLink ? (
                        <img 
                          src={schedule.curation.previewLink} 
                          alt="Level thumbnail"
                          className="curation-schedule-page__hall-thumbnail"
                        />
                      ) : (
                        <div className="curation-schedule-page__hall-no-thumbnail">
                          🎵
                        </div>
                      )}
                    </div>
                    <div className="curation-schedule-page__hall-info">
                      <h4>{schedule.scheduledCuration?.level?.song || 'Unknown Song'}</h4>
                      <p>{schedule.scheduledCuration?.level?.artist || 'Unknown Artist'}</p>
                      <div 
                        className="curation-schedule-page__hall-type"
                        style={{ backgroundColor: schedule.scheduledCuration?.type?.color || '#666' }}
                      >
                        {schedule.scheduledCuration?.type?.name || 'Unknown Type'}
                      </div>
                    </div>
                    <div className="curation-schedule-page__hall-actions">
                      <button
                        onClick={() => handleRemoveCuration(schedule.id)}
                        className="curation-schedule-page__remove-btn"
                        title={tSch('actions.remove')}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
                
                {secondarySchedules.length < 10 && (
                  <button 
                    className="curation-schedule-page__add-slot"
                    onClick={() => handleAddCuration('secondary', secondarySchedules.length)}
                  >
                    <div className="curation-schedule-page__add-icon">+</div>
                    <span>{tSch('actions.addCuration')}</span>
                  </button>
                )}
              </div>
            </div>
            
            <button 
              className="curation-schedule-page__scroll-btn curation-schedule-page__scroll-btn--right"
              onClick={() => scrollList(secondaryScrollRef, 'right')}
              disabled={secondarySchedules.length === 0}
            >
              ›
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="curation-schedule-page__loading">
            {tSch('loading')}
          </div>
        )}
      </div>

      {/* Curation Selection Popup */}
      <CurationSelectionPopup
        isOpen={showCurationSelection}
        onClose={() => {
          setShowCurationSelection(false);
          setSelectionMode({ type: '', position: null });
        }}
        onCurationSelect={handleCurationSelect}
        excludeIds={excludedIds}
      />

      <ScrollButton />
    </div>
  );
};

export default CurationSchedulePage;
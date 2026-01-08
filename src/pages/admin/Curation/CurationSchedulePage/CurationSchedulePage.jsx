import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from "@/contexts/AuthContext";

import { MetaTags, AccessDenied } from '@/components/common/display';
import { ScrollButton } from '@/components/common/buttons';
import api from '@/utils/api';
import './curationschedulepage.css';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { NavLink } from 'react-router-dom';
import { CurationSelectionPopup } from '@/components/popups';
import { hasAnyFlag, hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { canAssignCurationType } from '@/utils/curationTypeUtils';
import { formatDate } from '@/utils/Utility';
import i18next from 'i18next';

// All date operations use UTC to ensure consistent timezone handling
const CurationSchedulePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation('pages');
  const tSch = (key, params = {}) => t(`curationSchedule.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [currentMonday, setCurrentMonday] = useState(getCurrentMonday(new Date()));
  const [showCurationSelection, setShowCurationSelection] = useState(false);
  const [selectionMode, setSelectionMode] = useState({ type: '' }); // 'primary' or 'secondary'
  
  const primaryScrollRef = useRef(null);
  const secondaryScrollRef = useRef(null);

  function getCurrentMonday(date) {
    const day = date.getUTCDay();
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date);
    monday.setUTCDate(diff);
    monday.setUTCHours(0, 0, 0, 0); // Set to start of day in UTC
    return monday;
  }


  // Get week label (UTC)
  const getWeekLabel = (monday) => {
    const weekEnd = new Date(monday);
    weekEnd.setUTCDate(monday.getUTCDate() + 6);
    weekEnd.setUTCHours(0, 0, 0, 0); // Ensure it stays at start of day in UTC
    return `${formatDate(monday, i18next?.language)} - ${formatDate(weekEnd, i18next?.language)}`;
  };

  useEffect(() => {
    if (hasFlag(user, permissionFlags.SUPER_ADMIN)) {
      fetchSchedules();
    }
  }, [user, currentMonday]);

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      // Ensure the date is sent in UTC format
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
    newMonday.setUTCDate(currentMonday.getUTCDate() + (direction * 7));
    newMonday.setUTCHours(0, 0, 0, 0); // Ensure it stays at start of day in UTC
    setCurrentMonday(newMonday);
  };

  const handleAddCuration = (type) => {
    setSelectionMode({ type });
    setShowCurationSelection(true);
  };

  const handleCurationSelect = async (curation) => {
    try {
      // Ensure the date is sent in UTC format
      const response = await api.post(`${import.meta.env.VITE_CURATIONS}/schedules`, {
        curationId: curation.id,
        weekStart: currentMonday.toISOString().split('T')[0],
        listType: selectionMode.type // 'primary' or 'secondary'
      });

      toast.success(tSch('notifications.added'));
      fetchSchedules();
      setShowCurationSelection(false);
      setSelectionMode({ type: '' });
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
  const primarySchedules = schedules.filter(s => s.listType === 'primary').slice(0, 20);
  const secondarySchedules = schedules.filter(s => s.listType === 'secondary').slice(0, 20);

  // Check if user can access a specific curation
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

  // Get excluded curation IDs for the popup
  const excludedIds = schedules.map(s => s.curationId || s.curation?.id).filter(Boolean);

  // Check overall access - users need to be able to access at least some curations
  const hasOverallAccess = hasAnyFlag(user, [permissionFlags.SUPER_ADMIN, permissionFlags.HEAD_CURATOR]) ||
                          schedules.some(schedule => canAccessCuration(schedule.scheduledCuration));

  if (!hasOverallAccess) {
    return <AccessDenied />;
  }

  return (
    <div className="curation-schedule-page">
      <MetaTags 
        title={tSch('meta.title')}
        description={tSch('meta.description')}
        url={currentUrl}
      />
      
      
      <div className="curation-schedule-page__content">
        <div className="curation-schedule-page__header">
          <div className="curation-schedule-page__header-top">
            <NavLink
              className="curation-schedule-page__back-btn"
              to="/admin/curations"
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
              {primarySchedules.length}/20
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
                
                {primarySchedules.length < 20 && (
                  <button 
                    className="curation-schedule-page__add-slot"
                    onClick={() => handleAddCuration('primary')}
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
              {secondarySchedules.length}/20
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
                
                {secondarySchedules.length < 20 && (
                  <button 
                    className="curation-schedule-page__add-slot"
                    onClick={() => handleAddCuration('secondary')}
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
          setSelectionMode({ type: '' });
        }}
        onCurationSelect={handleCurationSelect}
        excludeIds={excludedIds}
      />

      <ScrollButton />
    </div>
  );
};

export default CurationSchedulePage;
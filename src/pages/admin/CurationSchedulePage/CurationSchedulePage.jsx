import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { CompleteNav } from '@/components/layout';
import { MetaTags, AccessDenied } from '@/components/common/display';
import { ScrollButton } from '@/components/common/buttons';
import api from '@/utils/api';
import './curationschedulepage.css';
import { EditIcon, TrashIcon } from '@/components/common/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';

const CurationSchedulePage = () => {
  const { user } = useAuth();
  const { t } = useTranslation('pages');
  const tSch = (key, params = {}) => t(`curationSchedule.${key}`, params);
  const currentUrl = window.location.origin + location.pathname;

  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [curationTypes, setCurationTypes] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState({ type: '', data: null });
  const [isAnyPopupOpen, setIsAnyPopupOpen] = useState(false);
  const [showInitialPasswordPrompt, setShowInitialPasswordPrompt] = useState(true);

  // Add effect to handle body scrolling
  useEffect(() => {
    const isAnyOpen = showPasswordModal || showInitialPasswordPrompt;
    setIsAnyPopupOpen(isAnyOpen);
    if (isAnyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showPasswordModal, showInitialPasswordPrompt]);

  // Initial password verification
  useEffect(() => {
    if (user?.isSuperAdmin && showInitialPasswordPrompt) {
      setShowInitialPasswordPrompt(true);
    }
  }, [user?.isSuperAdmin]);

  const getWeekDates = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      dates.push(day);
    }
    return dates;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getSchedulesForDate = (date) => {
    return schedules.filter(schedule => {
      const scheduleDate = new Date(schedule.targetDate);
      return scheduleDate.toDateString() === date.toDateString();
    });
  };

  const handlePasswordSubmit = async () => {
    try {
      const { type, data } = selectedAction;
      
      if (type === 'create') {
        const response = await api.post(`${import.meta.env.VITE_CURATIONS}/schedules`, {
          ...data,
          superAdminPassword: superAdminPassword
        });
        
        setSchedules(prev => [...prev, response.data]);
        toast.success(tSch('notifications.created'));
      } else if (type === 'edit') {
        const response = await api.put(`${import.meta.env.VITE_CURATIONS}/schedules/${data.id}`, {
          ...data,
          superAdminPassword: superAdminPassword
        });
        
        setSchedules(prev => prev.map(sch => sch.id === response.data.id ? response.data : sch));
        toast.success(tSch('notifications.updated'));
      } else if (type === 'delete') {
        await api.delete(`${import.meta.env.VITE_CURATIONS}/schedules/${data.id}`, {
          data: { superAdminPassword: superAdminPassword }
        });
        
        setSchedules(prev => prev.filter(sch => sch.id !== data.id));
        toast.success(tSch('notifications.deleted'));
      }
      
      setSuperAdminPassword('');
      setShowPasswordModal(false);
      setSelectedAction({ type: '', data: null });
    } catch (error) {
      toast.error(error.response?.data?.error || 'An error occurred');
    }
  };

  const fetchSchedules = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`${import.meta.env.VITE_CURATIONS}/schedules`);
      setSchedules(response.data.schedules);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch schedules');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurationTypes = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_CURATIONS}/types`);
      setCurationTypes(response.data);
    } catch (error) {
      console.error('Failed to fetch curation types:', error);
    }
  };

  useEffect(() => {
    if (user?.isSuperAdmin) {
      fetchSchedules();
      fetchCurationTypes();
    }
  }, [user?.isSuperAdmin]);

  const handleWeekChange = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  if (!user?.isSuperAdmin) {
    return <AccessDenied />;
  }

  const weekDates = getWeekDates(currentWeek);

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
          <h1>{tSch('title')}</h1>
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
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
          </h2>
          <button 
            className="curation-schedule-page__week-btn"
            onClick={() => handleWeekChange(1)}
          >
            {tSch('nextWeek')} →
          </button>
        </div>

        {/* Weekly Grid */}
        <div className="curation-schedule-page__grid">
          {weekDates.map((date, index) => {
            const daySchedules = getSchedulesForDate(date);
            return (
              <div key={index} className="curation-schedule-page__day">
                <div className="curation-schedule-page__day-header">
                  <h3>{formatDate(date)}</h3>
                  <button 
                    className="curation-schedule-page__add-btn"
                    onClick={() => {
                      setSelectedAction({ 
                        type: 'create', 
                        data: { targetDate: date.toISOString().split('T')[0] }
                      });
                      setShowPasswordModal(true);
                    }}
                  >
                    ➕
                  </button>
                </div>
                
                <div className="curation-schedule-page__day-content">
                  {daySchedules.length === 0 ? (
                    <p className="curation-schedule-page__empty-day">{tSch('noSchedules')}</p>
                  ) : (
                    daySchedules.map(schedule => (
                      <div key={schedule.id} className="curation-schedule-page__schedule-item">
                        <div className="curation-schedule-page__schedule-info">
                          <h4>{schedule.level?.song || 'Unknown Level'}</h4>
                          <p>{schedule.level?.artist || 'Unknown Artist'}</p>
                          <span className={`curation-schedule-page__status ${schedule.isActive ? 'active' : 'inactive'}`}>
                            {schedule.isActive ? tSch('status.active') : tSch('status.inactive')}
                          </span>
                        </div>
                        
                        <div className="curation-schedule-page__schedule-actions">
                          <button 
                            className="curation-schedule-page__action-btn"
                            onClick={() => {
                              setSelectedAction({ type: 'edit', data: schedule });
                              setShowPasswordModal(true);
                            }}
                          >
                            <EditIcon />
                          </button>
                          <button 
                            className="curation-schedule-page__action-btn curation-schedule-page__action-btn--delete"
                            onClick={() => {
                              setSelectedAction({ type: 'delete', data: schedule });
                              setShowPasswordModal(true);
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="curation-schedule-page__modal-overlay">
          <div className="curation-schedule-page__modal">
            <h3>{tSch('password.title')}</h3>
            <p>{tSch('password.description')}</p>
            <input
              type="password"
              value={superAdminPassword}
              onChange={(e) => setSuperAdminPassword(e.target.value)}
              placeholder={tSch('password.placeholder')}
            />
            <div className="curation-schedule-page__modal-actions">
              <button onClick={handlePasswordSubmit}>{tSch('password.submit')}</button>
              <button onClick={() => {
                setShowPasswordModal(false);
                setSelectedAction({ type: '', data: null });
                setSuperAdminPassword('');
              }}>
                {tSch('password.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial Password Prompt */}
      {showInitialPasswordPrompt && (
        <div className="curation-schedule-page__modal-overlay">
          <div className="curation-schedule-page__modal">
            <h3>{tSch('initialPassword.title')}</h3>
            <p>{tSch('initialPassword.description')}</p>
            <input
              type="password"
              value={superAdminPassword}
              onChange={(e) => setSuperAdminPassword(e.target.value)}
              placeholder={tSch('initialPassword.placeholder')}
            />
            <div className="curation-schedule-page__modal-actions">
              <button onClick={() => {
                setShowInitialPasswordPrompt(false);
                setSuperAdminPassword('');
              }}>
                {tSch('initialPassword.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ScrollButton />
    </div>
  );
};

export default CurationSchedulePage;

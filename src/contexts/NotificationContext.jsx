import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '@/utils/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({
  pendingSubmissions: 0,
  pendingRatings: 0,
  totalNotifications: 0,
  pendingLevelSubmissions: 0,
  pendingPassSubmissions: 0,
  displayCount: '0'
});

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [pendingRatings, setPendingRatings] = useState(0);
  const [pendingLevelSubmissions, setPendingLevelSubmissions] = useState(0);
  const [pendingPassSubmissions, setPendingPassSubmissions] = useState(0);
  const { user } = useAuth();
  const lastFetchTimeRef = useRef(null);
  const fetchTimeoutRef = useRef(null);

  const fetchNotificationCounts = async () => {
    if (!user?.isSuperAdmin && !user?.isRater) return;
    
    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/admin/statistics`);
      const { unratedRatings, totalPendingSubmissions, pendingLevelSubmissions, pendingPassSubmissions } = response.data;
      
      setPendingSubmissions(totalPendingSubmissions);
      setPendingRatings(unratedRatings);
      setPendingLevelSubmissions(pendingLevelSubmissions);
      setPendingPassSubmissions(pendingPassSubmissions);
      
      lastFetchTimeRef.current = Date.now();
      scheduleFetch();
    } catch (error) {
      scheduleFetch();
    }
  };

  const scheduleFetch = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchNotificationCounts();
    }, 30000);
  };

  useEffect(() => {
    if (!user?.isSuperAdmin && !user?.isRater) return;

    const apiUrl = import.meta.env.VITE_API_URL;
    const eventsEndpoint = `${apiUrl}/events`;
    
    fetch(eventsEndpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    })
    .then(response => {
      if (response.ok) {
        setupEventSource();
      }
    })
    .catch(() => {
      setupEventSource();
    });

    let eventSource = null;
    let reconnectTimeout = null;

    const setupEventSource = () => {
      if (eventSource) {
        eventSource.close();
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      eventSource = new EventSource(eventsEndpoint, {
        withCredentials: true
      });

      eventSource.onerror = () => {
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          
          reconnectTimeout = setTimeout(() => {
            setupEventSource();
          }, 1000);
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'submissionUpdate' || data.type === 'ratingUpdate') {
            if (fetchTimeoutRef.current) {
              clearTimeout(fetchTimeoutRef.current);
            }
            fetchNotificationCounts();
          }
        } catch (error) {
          // Silent error handling
        }
      };
    };

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user?.isSuperAdmin, user?.isRater]);

  const totalNotifications = pendingSubmissions + pendingRatings;
  const displayCount = totalNotifications > 9 ? '9+' : totalNotifications.toString();

  useEffect(() => {
    if (user?.isSuperAdmin || user?.isRater) {
      fetchNotificationCounts();
    }
  }, [user?.isSuperAdmin, user?.isRater]);

  const value = {
    pendingSubmissions,
    pendingRatings,
    totalNotifications,
    displayCount,
    pendingLevelSubmissions,
    pendingPassSubmissions
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 
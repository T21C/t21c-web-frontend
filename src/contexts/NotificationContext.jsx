import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '@/utils/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({
  pendingSubmissions: 0,
  pendingRatings: 0,
  totalNotifications: 0,
  pendingLevelSubmissions: 0,
  pendingPassSubmissions: 0,
  displayCount: '0',
  restartNotifications: () => {},
  resetNotifications: () => {},
  cleanup: () => {}
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
  const auth = useAuth();
  const user = auth?.user;
  const lastFetchTimeRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const resetCounts = () => {
    console.log('[Notifications] Resetting all notification counts to 0');
    setPendingSubmissions(0);
    setPendingRatings(0);
    setPendingLevelSubmissions(0);
    setPendingPassSubmissions(0);
  };

  const fetchNotificationCounts = async (force = false) => {
    if (!force && !user?.isSuperAdmin && !user?.isRater) {
      console.log('[Notifications] User lacks permissions, resetting counts');
      resetCounts();
      return;
    }

    const now = Date.now();
    // Throttle fetches to once every 30 seconds unless forced
    if (!force && lastFetchTimeRef.current && now - lastFetchTimeRef.current < 30000) {
      console.log('[Notifications] Throttling fetch, scheduling retry');
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => fetchNotificationCounts(force), 30000);
      return;
    }

    console.log('[Notifications] Fetching notification counts');
    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/admin/statistics`);
      console.log('[Notifications] Received counts:', response.data);
      const { unratedRatings, totalPendingSubmissions, pendingLevelSubmissions, pendingPassSubmissions } = response.data;
      
      setPendingSubmissions(totalPendingSubmissions);
      setPendingRatings(unratedRatings);
      setPendingLevelSubmissions(pendingLevelSubmissions);
      setPendingPassSubmissions(pendingPassSubmissions);
      
      lastFetchTimeRef.current = now;
    } catch (error) {
      console.error('[Notifications] Failed to fetch counts:', error);
    }
  };

  const cleanup = () => {
    console.log('[Notifications] Cleaning up SSE connections and timeouts');
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
  };

  const setupEventSource = (force = false) => {
    cleanup(); // Clean up any existing connections first

    if (!force && !user?.isSuperAdmin && !user?.isRater) {
      console.log('[Notifications] User lacks permissions, skipping SSE setup');
      return;
    }

    console.log('[Notifications] Setting up SSE connection');
    const apiUrl = import.meta.env.VITE_API_URL;
    const eventsEndpoint = `${apiUrl}/events`;

    eventSourceRef.current = new EventSource(eventsEndpoint, {
      withCredentials: true
    });

    eventSourceRef.current.onerror = () => {
      console.log('[Notifications] SSE connection error');
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        eventSourceRef.current.close();
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[Notifications] Attempting to reconnect SSE');
          setupEventSource(force);
        }, 1000);
      }
    };

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'submissionUpdate' || data.type === 'ratingUpdate') {
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchNotificationCounts(force);
        }
      } catch (error) {
        // Silent error handling
      }
    };

    // Test the endpoint first
    fetch(eventsEndpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('SSE connection failed');
      }
    })
    .catch(() => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        setupEventSource(force);
      }, 1000);
    });
  };

  const restartNotifications = (force = false) => {
    console.log('[Notifications] Restarting notifications system', force ? '(forced)' : '');
    cleanup();
    setupEventSource(force);
    fetchNotificationCounts(force);
  };

  useEffect(() => {
    if (user?.isSuperAdmin || user?.isRater) {
      setupEventSource();
      fetchNotificationCounts();
    } else {
      cleanup();
      resetCounts();
    }
    return cleanup;
  }, [user]); // Add user as a dependency to react to auth changes

  const totalNotifications = pendingSubmissions + pendingRatings;
  const displayCount = totalNotifications > 9 ? '9+' : totalNotifications.toString();

  const value = {
    pendingSubmissions,
    pendingRatings,
    totalNotifications,
    displayCount,
    pendingLevelSubmissions,
    pendingPassSubmissions,
    restartNotifications,
    resetNotifications: resetCounts,
    cleanup
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '@/utils/api';
import { useAuth } from './AuthContext';
import { hasAnyFlag, permissionFlags } from '@/utils/UserPermissions';

const NotificationContext = createContext({
  pendingSubmissions: 0,
  totalNotifications: 0,
  pendingLevelSubmissions: 0,
  pendingPassSubmissions: 0,
  isConnected: false,
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
  const [pendingLevelSubmissions, setPendingLevelSubmissions] = useState(0);
  const [pendingPassSubmissions, setPendingPassSubmissions] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const auth = useAuth();
  const user = auth?.user;
  const lastFetchTimeRef = useRef(null);
  const fetchTimeoutRef = useRef(null);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 5000;

  const resetCounts = () => {
    setPendingSubmissions(0);
    setPendingLevelSubmissions(0);
    setPendingPassSubmissions(0);
  };

  const fetchNotificationCounts = async (force = false) => {
    if (!force && !hasAnyFlag(user, [permissionFlags.SUPER_ADMIN])) {
      resetCounts();
      return;
    }

    const now = Date.now();
    // Throttle fetches to once every 30 seconds unless forced
    if (!force && lastFetchTimeRef.current && now - lastFetchTimeRef.current < 30000) {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      fetchTimeoutRef.current = setTimeout(() => fetchNotificationCounts(force), 30000);
      return;
    }

    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/admin/statistics`);
      const { totalPendingSubmissions, pendingLevelSubmissions, pendingPassSubmissions } = response.data;
      
      setPendingSubmissions(totalPendingSubmissions);
      setPendingLevelSubmissions(pendingLevelSubmissions);
      setPendingPassSubmissions(pendingPassSubmissions);
      
      lastFetchTimeRef.current = now;
    } catch (error) {
      console.error('[Notifications] Failed to fetch counts:', error);
    }
  };

  const cleanup = () => {
    console.debug('SSE: Cleaning up connections and timeouts');
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
    setIsConnected(false);
    reconnectAttempts.current = 0;
  };

  const setupEventSource = (force = false) => {
    // Don't create new connection if one exists
    if (eventSourceRef.current) {
      console.debug('SSE: Connection already exists, skipping setup');
      return;
    }

    if (!force && !hasAnyFlag(user, [permissionFlags.SUPER_ADMIN])) {
      console.debug('SSE: User not authorized for notifications');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL;
    const eventsEndpoint = `${apiUrl}/events`;

    console.debug('SSE: Setting up new connection');
    eventSourceRef.current = new EventSource(eventsEndpoint, {
      withCredentials: true
    });

    eventSourceRef.current.onopen = () => {
      console.debug('SSE: Connection established');
      setIsConnected(true);
      reconnectAttempts.current = 0;
    };

    eventSourceRef.current.onerror = (error) => {
      console.error('SSE: Connection error', error);
      setIsConnected(false);

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Only attempt reconnect if under max attempts
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        console.debug(`SSE: Scheduling reconnect attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS}`);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          setupEventSource(force);
        }, RECONNECT_DELAY);
      } else {
        console.debug('SSE: Max reconnection attempts reached');
      }
    };

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        //console.debug('SSE: Received message:', data);

        // Dispatch event to components
        const sseEvent = new CustomEvent('sse-message', { detail: data });
        document.dispatchEvent(sseEvent);

        // Handle notification updates
        if (data.type === 'submissionUpdate' || data.type === 'ratingUpdate') {
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchNotificationCounts(force);
        }
      } catch (error) {
        console.error('SSE: Error processing message:', error);
      }
    };
  };

  const restartNotifications = (force = false) => {
    cleanup();
    setupEventSource(force);
    fetchNotificationCounts(force);
  };

  useEffect(() => {
    if (hasAnyFlag(user, [permissionFlags.SUPER_ADMIN])) {
      setupEventSource();
      fetchNotificationCounts();
    } else {
      cleanup();
      resetCounts();
    }
    return cleanup;
  }, [user]); // Add user as a dependency to react to auth changes

  const value = {
    pendingSubmissions,
    pendingLevelSubmissions,
    pendingPassSubmissions,
    isConnected,
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
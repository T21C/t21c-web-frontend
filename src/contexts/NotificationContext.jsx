import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '@/utils/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext({
  pendingSubmissions: 0,
  pendingRatings: 0,
  totalNotifications: 0,
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
  const { isSuperAdmin, isAdmin } = useAuth();
  const lastFetchTimeRef = useRef(null);
  const fetchTimeoutRef = useRef(null);

  const fetchNotificationCounts = async () => {
    if (!isSuperAdmin && !isAdmin) return;
    
    try {
      const response = await api.get(`${import.meta.env.VITE_API_URL}/v2/admin/statistics`);
      const { unratedRatings, totalPendingSubmissions } = response.data;
      
      setPendingSubmissions(totalPendingSubmissions);
      setPendingRatings(unratedRatings);
      
      // Update last fetch time
      lastFetchTimeRef.current = Date.now();
      
      // Schedule next fetch
      scheduleFetch();
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      // Even on error, schedule next fetch
      scheduleFetch();
    }
  };

  const scheduleFetch = () => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Schedule next fetch 30 seconds after the last fetch
    fetchTimeoutRef.current = setTimeout(() => {
      fetchNotificationCounts();
    }, 30000);
  };

  useEffect(() => {
    if (!isSuperAdmin && !isAdmin) return;

    // Initial fetch
    fetchNotificationCounts();

    let retryCount = 0;
    const maxRetries = 3;
    let isFirstConnection = true;

    // Set up SSE connection
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/events`, {
      withCredentials: true
    });

    eventSource.onopen = () => {
      if (isFirstConnection) {
        console.debug('SSE: Initial connection established');
        isFirstConnection = false;
      } else {
        console.debug('SSE: Reconnected successfully');
      }
      retryCount = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'submissionUpdate' || data.type === 'ratingUpdate') {
          // For SSE updates, fetch immediately and reset the timer
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchNotificationCounts();
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      // Check if it's a normal reconnection attempt
      if (eventSource.readyState === EventSource.CONNECTING) {
        retryCount++;
        if (retryCount <= maxRetries) {
          // Don't log anything for normal reconnection attempts
          return;
        }
        console.warn(`SSE: Reconnection attempt ${retryCount}/${maxRetries}`);
      } else if (eventSource.readyState === EventSource.CLOSED) {
        console.error('SSE: Connection closed', error);
        eventSource.close();
      }
    };

    return () => {
      console.debug('SSE: Cleaning up connection');
      if (eventSource) {
        eventSource.close();
      }
      // Clear any pending fetch timeout
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [isSuperAdmin, isAdmin]);

  const totalNotifications = pendingSubmissions + pendingRatings;
  const displayCount = totalNotifications > 9 ? '9+' : totalNotifications.toString();

  const value = {
    pendingSubmissions,
    pendingRatings,
    totalNotifications,
    displayCount
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 
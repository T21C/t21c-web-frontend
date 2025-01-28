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
    if (!user?.isSuperAdmin && !user?.isRater) return;

    const apiUrl = import.meta.env.VITE_API_URL;
    const eventsEndpoint = `${apiUrl}/events`;
    
    console.log('Environment:', import.meta.env.MODE);
    console.log('API URL:', apiUrl);
    console.log('Setting up SSE connection to:', eventsEndpoint);
    
    // Test the endpoint first with a regular fetch
    fetch(eventsEndpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
      }
    })
    .then(response => {
      console.log('SSE: Initial endpoint test response:', response.status, response.statusText);
      console.log('SSE: Response headers:', Object.fromEntries([...response.headers]));
    })
    .catch(error => {
      console.error('SSE: Initial endpoint test failed:', error);
    });
    
    // Set up SSE connection
    const eventSource = new EventSource(eventsEndpoint, {
      withCredentials: true
    });

    eventSource.onopen = (event) => {
      console.log('SSE: Connection established successfully', event);
      console.log('SSE: ReadyState after open:', eventSource.readyState);
    };

    eventSource.onerror = (error) => {
      console.error('SSE: Connection error:', {
        error,
        readyState: eventSource.readyState,
        url: eventsEndpoint,
        timestamp: new Date().toISOString()
      });

      // Check if the error is due to CORS
      if (error.target?.status === 0) {
        console.error('SSE: Possible CORS or network error');
      }

      // Close and retry connection if in error state
      if (eventSource.readyState === EventSource.CLOSED) {
        console.log('SSE: Connection closed, attempting to reconnect in 5s...');
        eventSource.close();
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          console.log('SSE: Attempting to reconnect...');
          const newEventSource = new EventSource(eventsEndpoint, {
            withCredentials: true
          });
          // Update the eventSource reference
          Object.assign(eventSource, newEventSource);
        }, 5000);
      }
    };

    eventSource.onmessage = (event) => {
      console.log('SSE: Received message:', event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'submissionUpdate') {
          // For submission updates, fetch immediately and reset the timer
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          
          // Log submission update details if available
          if (data.data) {
            console.debug('SSE: Submission update received:', {
              action: data.data.action,
              type: data.data.submissionType,
              id: data.data.submissionId,
              count: data.data.count
            });
          }
          
          fetchNotificationCounts();
        } else if (data.type === 'ratingUpdate') {
          // For rating updates, fetch immediately and reset the timer
          if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
          }
          fetchNotificationCounts();
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    return () => {
      console.log('Closing SSE connection');
      eventSource.close();
    };
  }, [user?.isSuperAdmin, user?.isRater]);

  const totalNotifications = pendingSubmissions + pendingRatings;
  const displayCount = totalNotifications > 9 ? '9+' : totalNotifications.toString();

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
import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const { isSuperAdmin } = useAuth();

  const fetchNotificationCounts = async () => {
    if (!isSuperAdmin) return;
    
    try {
      // Get pending submissions count
      const submissionsResponse = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/levels/pending`);
      const pendingLevels = submissionsResponse.data.length || 0;

      // Get pending pass submissions count
      const passSubmissionsResponse = await api.get(`${import.meta.env.VITE_SUBMISSION_API}/passes/pending`);
      const pendingPasses = passSubmissionsResponse.data.length || 0;

      setPendingSubmissions(pendingLevels + pendingPasses);

      // Get pending ratings count
      const ratingsResponse = await api.get(import.meta.env.VITE_RATING_API);
      const pendingRatingCount = ratingsResponse.data.filter(rating => 
        rating.level && rating.level.toRate && !rating.average
      ).length;
      setPendingRatings(pendingRatingCount);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;

    // Initial fetch
    fetchNotificationCounts();

    // Set up SSE connection
    const eventSource = new EventSource(`${import.meta.env.VITE_API_URL}/events`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'submissionUpdate' || data.type === 'ratingUpdate') {
        fetchNotificationCounts();
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isSuperAdmin]);

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
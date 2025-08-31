import { useState, useEffect } from 'react';
import api from '@/utils/api';

export const useWeeklyCurations = () => {
  const [weeklies, setWeeklies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeeklies = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get Monday of current week
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday-based week
        const mondayOfCurrentWeek = new Date(today);
        mondayOfCurrentWeek.setDate(today.getDate() - daysToSubtract);
        
        // Format as YYYY-MM-DD
        const weekStart = mondayOfCurrentWeek.toISOString().split('T')[0];
        
        const response = await api.get(`${import.meta.env.VITE_CURATIONS}/schedules`, {
          params: {
            weekStart: weekStart
          }
        });
        
        setWeeklies(response.data.schedules || []);
      } catch (err) {
        console.error('Failed to fetch weekly curations:', err);
        setError(err.response?.data?.error || 'Failed to fetch weekly curations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklies();
  }, []);

  return { weeklies, isLoading, error };
};

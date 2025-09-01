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
        
        // Let the server handle date management - no parameters needed
        const response = await api.get(`${import.meta.env.VITE_CURATIONS}/schedules`);
        
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

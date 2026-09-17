import { routes } from '@/api/routes';
// tuf-search: #useWeeklyCurations
import { useState, useEffect } from 'react';
import api from '@/utils/api';

const isPublicWeeklySchedule = (schedule) => {
  const level = schedule?.scheduledCuration?.level;
  return Boolean(level) && !level.isDeleted && !level.isHidden;
};

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
        const response = await api.get(`${routes.admin.curations.root()}/schedules`);
        
        setWeeklies((response.data.schedules || []).filter(isPublicWeeklySchedule));
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

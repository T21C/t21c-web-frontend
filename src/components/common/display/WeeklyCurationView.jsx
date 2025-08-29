import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@/utils/api';
import './WeeklyCurationView.css';

const WeeklyCurationView = () => {
  const [curations, setCurations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWeeklyCurations = async () => {
      try {
        setIsLoading(true);
        // Get current week's schedules
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

        const response = await api.get(`${import.meta.env.VITE_CURATIONS}/schedules`, {
          params: {
            startDate: startOfWeek.toISOString().split('T')[0],
            endDate: endOfWeek.toISOString().split('T')[0],
            isActive: true
          }
        });

        // Get the actual curations for these scheduled levels
        const curationPromises = response.data.schedules.map(schedule => 
          api.get(`${import.meta.env.VITE_CURATIONS}`, {
            params: { levelId: schedule.levelId }
          })
        );

        const curationResponses = await Promise.all(curationPromises);
        const allCurations = curationResponses.flatMap(response => response.data.curations);
        
        setCurations(allCurations.slice(0, 10)); // Limit to 10
      } catch (error) {
        console.error('Failed to fetch weekly curations:', error);
        setError('Failed to load weekly curations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeeklyCurations();
  }, []);

  if (isLoading) {
    return (
      <div className="weekly-curation-view">
        <div className="weekly-curation-view__loading">Loading weekly curations...</div>
      </div>
    );
  }

  if (error || curations.length === 0) {
    return null; // Don't show anything if there's an error or no curations
  }

  return (
    <div className="weekly-curation-view">
      <div className="weekly-curation-view__header">
        <h2>Weekly Curations</h2>
        <Link to="/admin/curations" className="weekly-curation-view__link">
          View All
        </Link>
      </div>
      
      <div className="weekly-curation-view__grid">
        {curations.map(curation => (
          <Link 
            key={curation.id} 
            to={`/curations/${curation.id}`}
            className="weekly-curation-view__item"
          >
            <div className="weekly-curation-view__item-content">
              <div className="weekly-curation-view__type-badge" style={{ backgroundColor: curation.type?.color }}>
                {curation.type?.name}
              </div>
              <h3>{curation.level?.song || 'Unknown Level'}</h3>
              <p>{curation.level?.artist || 'Unknown Artist'}</p>
              {curation.previewLink && (
                <img 
                  src={curation.previewLink} 
                  alt="Preview"
                  className="weekly-curation-view__preview"
                />
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCurationView;

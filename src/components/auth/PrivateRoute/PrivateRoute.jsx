// tuf-search: #PrivateRoute #privateRoute #auth
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading, setOriginUrl } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the attempted URL for redirecting after login
    setOriginUrl(`${location.pathname}${location.search}${location.hash}`);
    // Replace rather than push: a pushed entry leaves this guarded route in
    // history, so Back re-enters it and bounces to /login again.
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute; 
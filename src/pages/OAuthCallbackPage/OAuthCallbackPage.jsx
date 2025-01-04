import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './oauthCallbackPage.css';

const OAuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (error) {
      setError('Authentication failed. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setError('No authorization code received');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const handleCallback = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_AUTH_DISCORD_CALLBACK}?code=${code}&state=${state || ''}`
        );

        const { token } = response.data;
        localStorage.setItem('token', token);
        navigate('/profile');
      } catch (err) {
        setError(err.response?.data?.message || 'Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="oauth-callback-page-wrapper">
      <div className="oauth-callback-page">
        <div className="callback-container">
          {error ? (
          <>
            <h1>Authentication Failed</h1>
            <p className="error-message">{error}</p>
            <p className="redirect-message">Redirecting to login page...</p>
          </>
        ) : (
          <>
            <h1>Authenticating</h1>
            <p className="status-message">Please wait while we complete the authentication process...</p>
          </>
        )}
      </div>
    </div>
    </div>
  );
};

export default OAuthCallbackPage; 
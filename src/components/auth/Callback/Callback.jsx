import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import axios from 'axios';
import './callback.css';

const CallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { fetchUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setError('Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_DISCORD_CALLBACK}`,
          { code }
        );

        const { token } = response.data;
        if (token) {
          localStorage.setItem('token', token);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await fetchUser();
          navigate('/profile');
        } else {
          throw new Error('No token received from server');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.response?.data?.message || 'Authentication failed');
        setTimeout(() => navigate('/login'), 3000);
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, fetchUser]);

  return (
    <div className="callback-page">
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
            <p className="status-message">
              {loading
                ? "Please wait while we complete the authentication process..."
                : "Authentication successful! Redirecting..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CallbackPage;

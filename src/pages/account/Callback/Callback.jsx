import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import api from '@/utils/api';
import './callback.css';

const CallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { fetchUser, setUser, getOriginUrl, clearOriginUrl } = useAuth();

  const handleContinue = () => {
    setRedirecting(true);
    // Redirect to profile edit page if linking failed, otherwise go to login
    if (isLinking) {
      navigate('/profile/edit');
    } else {
      navigate('/login');
    }
  };

  const handleSuccessfulAuth = () => {
    setRedirecting(true);
    const origin = getOriginUrl()
    if (origin && origin !== '/register' && origin !== '/login') {
      navigate(origin);
    } else {
      navigate('/profile');
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      const linking = urlParams.get('linking') === 'true';
      setIsLinking(linking);
      const provider = urlParams.get('provider') || 'discord';
      if (error) {
        setError('Authentication failed');
        setLoading(false);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setLoading(false);
        return;
      }

      try {
        const link = linking ? `/v2/auth/oauth/link/${provider}` : `/v2/auth/oauth/callback/${provider}`;
        const response = await api.post(link, { code, linking });

        if (linking) {
          if (response.status === 200) {
            await fetchUser();
            handleSuccessfulAuth();
          } else {
            throw new Error('Linking failed');
          }
        } else {
          const { user: userData } = response.data;
          if (userData) {
            setUser(userData);
            handleSuccessfulAuth();
          } else {
            throw new Error('No user received from server');
          }
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        
        // Handle different error response formats
        let errorMessage = 'Authentication failed';
        
        if (err.response) {
          // Server responded with an error
          if (err.response.data) {
            if (err.response.data.error) {
              // Format: { error: "Error message" }
              errorMessage = err.response.data.error;
            } else if (err.response.data.message) {
              // Format: { message: "Error message" }
              errorMessage = err.response.data.message;
            } else if (err.response.data.data && err.response.data.data.error) {
              // Nested format: { data: { error: "Error message" } }
              errorMessage = err.response.data.data.error;
            }
          }
        } else if (err.request) {
          // Request was made but no response received
          errorMessage = 'No response from server';
        } else {
          // Something else happened
          errorMessage = err.message || 'Authentication failed';
        }
        
        setError(errorMessage);
        setLoading(false);
      } finally {
        if (!error) {
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="callback-page">
      <div className="callback-container">
        {error ? (
          <>
            <h1>Authentication Failed</h1>
            <p className="error-message">{error}</p>
            {redirecting ? (
              <p className="redirect-message">
                {isLinking ? "Redirecting to profile edit page..." : "Redirecting to login page..."}
              </p>
            ) : (
              <button className="continue-button" onClick={handleContinue}>
                {isLinking ? "Return to Profile Edit" : "Return to Login"}
              </button>
            )}
          </>
        ) : (
          <>
            <h1>Authenticating</h1>
            <p className="status-message">
              {loading
                ? "Please wait while we complete the authentication process..."
                : isLinking ? "Link successful! Redirecting..." : "Authentication successful! Redirecting..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default CallbackPage;

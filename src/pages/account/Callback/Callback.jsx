import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import axios from 'axios';
import './callback.css';

const CallbackPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const { fetchUser, getOriginUrl, clearOriginUrl } = useAuth();

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
    console.log("callback successful auth")
    console.log(getOriginUrl())
    navigate(getOriginUrl() || '/profile');
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
        // Handle login flow
        const link = linking ? `/v2/auth/oauth/link/${provider}` : `/v2/auth/oauth/callback/${provider}`;

        console.log("callback link", link)
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}${link}`,
          { 
            code,
            linking
           }
        );

        // Handle different response formats for linking vs. authentication
        if (linking) {
          // For linking, we don't expect a token in the response
          // Just check if the request was successful
          if (response.status === 200) {
            // Refresh user data to get updated linked accounts
            await fetchUser();
            handleSuccessfulAuth();
          } else {
            throw new Error('Linking failed');
          }
        } else {
          // For regular authentication, expect a token
          const { token } = response.data;
          if (token) {
            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            await fetchUser();
            handleSuccessfulAuth();
          } else {
            throw new Error('No token received from server');
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

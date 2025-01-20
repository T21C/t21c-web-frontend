import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './loginPage.css';
import { CompleteNav } from '../../components';
import { useScript } from '../../hooks/useScript';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const recaptchaContainer = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithDiscord } = useAuth();

  // Load reCAPTCHA script
  const recaptchaStatus = useScript(
    'https://www.google.com/recaptcha/api.js'
  );

  // Keep track of whether reCAPTCHA has been rendered
  const [isRecaptchaRendered, setIsRecaptchaRendered] = useState(false);

  // Initialize reCAPTCHA when script is loaded
  useEffect(() => {
    if (recaptchaStatus === 'ready' && window.grecaptcha && requireCaptcha && !isRecaptchaRendered) {
      try {
        window.grecaptcha.render(recaptchaContainer.current, {
          sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
          theme: 'light',
          size: 'normal',
          callback: (token) => {
            console.log('reCAPTCHA solved:', token.substring(0, 20) + '...');
          }
        });
        setIsRecaptchaRendered(true);
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
        if (error.message.includes('already been rendered')) {
          setIsRecaptchaRendered(true);
        }
      }
    }
  }, [recaptchaStatus, requireCaptcha, isRecaptchaRendered]);

  // Reset reCAPTCHA when it's no longer required
  useEffect(() => {
    if (!requireCaptcha && isRecaptchaRendered) {
      setIsRecaptchaRendered(false);
      if (window.grecaptcha) {
        window.grecaptcha.reset();
      }
    }
  }, [requireCaptcha]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let captchaToken = null;
      
      if (requireCaptcha) {
        try {
          // Get the token from the rendered widget
          captchaToken = await new Promise((resolve, reject) => {
            if (!window.grecaptcha) {
              reject(new Error('reCAPTCHA not loaded'));
              return;
            }

            const response = window.grecaptcha.getResponse();
            if (response) {
              resolve(response);
            } else {
              reject(new Error('Please complete the reCAPTCHA verification'));
            }
          });
        } catch (captchaError) {
          console.error('reCAPTCHA error:', captchaError);
          setError(captchaError.message || 'Failed to verify reCAPTCHA. Please try again.');
          setLoading(false);
          return;
        }
      }

      await login(email, password, captchaToken);
      const from = location.state?.from?.pathname || '/profile';
      navigate(from);
    } catch (err) {
      const response = err.response?.data;
      setError(response?.error || 'Login failed. Please try again.');
      if (response?.requireCaptcha) {
        setRequireCaptcha(true);
      }
      // Reset reCAPTCHA on failed login attempt
      if (requireCaptcha && window.grecaptcha) {
        window.grecaptcha.reset();
        setIsRecaptchaRendered(false); // This will trigger re-render of the widget
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      await loginWithDiscord();
    } catch (err) {
      setError('Failed to initiate Discord login. Please try again, if the issue persists, contact the developer.');
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="background-level"/>
      <CompleteNav/>
      <div className="login-page">
        <div className="login-container">
          <h1>Login</h1>
          {error && <div className="error-message">{error}</div>}
        
          <form onSubmit={handleEmailLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email or Username</label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {requireCaptcha && (
              <div className="captcha-container" ref={recaptchaContainer}></div>
            )}

            <button 
              type="submit" 
              className="login-button" 
              disabled={loading || (requireCaptcha && recaptchaStatus !== 'ready')}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="discord-button"
            onClick={handleDiscordLogin}
            disabled={loading}
          >
            Login with Discord
          </button>

        </div>
      </div>
    </div>
  );
};

export default LoginPage; 
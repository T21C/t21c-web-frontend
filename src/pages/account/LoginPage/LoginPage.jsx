import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './loginPage.css';
import { CompleteNav } from '@/components/layout';
import { MetaTags } from '@/components/common/display';
import { useScript } from '@/hooks/useScript';
const currentUrl = window.location.origin + location.pathname;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [retryAfter, setRetryAfter] = useState(null);
  const recaptchaContainer = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithDiscord } = useAuth();
  const { t } = useTranslation('pages');
  const tLogin = (key, params = {}) => t(`login.${key}`, params);

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

  // Handle countdown timer for rate limiting
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Start a new timer if retryAfter is set
    if (retryAfter) {
      const endTime = Date.now() + retryAfter;
      
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        
        if (remaining <= 0) {
          // Clear the interval when time is up
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setError(null);
          setRetryAfter(null);
        } else {
          setRetryAfter(remaining);
        }
      }, 1000);
    }

    // Cleanup function to clear the interval when component unmounts or retryAfter changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [retryAfter]);

  const formatTime = (ms) => {
    if (!ms) return '0s';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60) % 60;
    const hours = Math.floor(seconds / 3600) % 24;
    const days = Math.floor(seconds / 86400);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
    result += `${seconds % 60}s`;
    
    return result;
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setRetryAfter(null);
    setLoading(true);

    try {
      let captchaToken = null;
      
      if (requireCaptcha) {
        try {
          captchaToken = await new Promise((resolve, reject) => {
            if (!window.grecaptcha) {
              reject(new Error(tLogin('errors.captcha.notLoaded')));
              return;
            }

            const response = window.grecaptcha.getResponse();
            if (response) {
              resolve(response);
            } else {
              reject(new Error(tLogin('errors.captcha.incomplete')));
            }
          });
        } catch (captchaError) {
          console.error('reCAPTCHA error:', captchaError);
          setError(captchaError.message || tLogin('errors.captcha.failed'));
          setLoading(false);
          return;
        }
      }

      await login(email, password, captchaToken);
      const from = location.state?.from?.pathname || '/profile';
      navigate(from);
    } catch (err) {
      console.error('Login error:', err);
      
      // Extract error message from various possible response formats
      let errorMessage = '';
      let retryAfterValue = null;
      
      if (err.response) {
        const response = err.response.data;
        
        // Handle rate limit errors
        if (response?.retryAfter) {
          retryAfterValue = response.retryAfter;
          errorMessage = response.message || tLogin('errors.rateLimit');
        } 
        // Handle captcha requirement
        else if (response?.requireCaptcha) {
          setRequireCaptcha(true);
          errorMessage = response.message || response.error || tLogin('errors.generic');
        }
        // Handle specific error messages
        else if (response?.message) {
          errorMessage = response.message;
        }
        else if (response?.error) {
          errorMessage = response.error;
        }
        // Handle specific status codes
        else if (err.response.status === 401) {
          errorMessage = tLogin('errors.invalidCredentials');
        }
        else if (err.response.status === 403) {
          errorMessage = tLogin('errors.emailNotVerified');
        }
        else if (err.response.status === 429) {
          errorMessage = tLogin('errors.rateLimit');
          if (response?.retryAfter) {
            retryAfterValue = response.retryAfter;
          }
        }
        else {
          errorMessage = tLogin('errors.generic');
        }
      } 
      // Handle network errors
      else if (err.request) {
        errorMessage = tLogin('errors.network');
      } 
      // Handle other errors
      else {
        errorMessage = err.message || tLogin('errors.generic');
      }
      
      // Set the error message and retry after value
      setError(errorMessage);
      if (retryAfterValue) {
        setRetryAfter(retryAfterValue);
      }
      
      // Reset captcha if needed
      if (requireCaptcha && window.grecaptcha) {
        window.grecaptcha.reset();
        setIsRecaptchaRendered(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    try {
      setError('');
      await loginWithDiscord();
    } catch (err) {
      setError(tLogin('errors.discordFailed'));
    }
  };

  return (
    <div className="login-page-wrapper">
       <MetaTags
          title={tLogin('meta.title')}
          description={tLogin('meta.description')}
          url={currentUrl}
          image={''}
          type="article"
      />
      <div className="background-level"/>
      <CompleteNav/>
      <div className="login-page">
        <div className="login-container">
          <h1>{tLogin('header.title')}</h1>
          {error && (
            <div className="error-message">
              {error}
              {retryAfter && (
                <div className="retry-countdown">
                  Time remaining: {formatTime(retryAfter)}
                </div>
              )}
            </div>
          )}
        
          <form onSubmit={handleEmailLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">{tLogin('form.labels.emailOrUsername')}</label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || retryAfter}
                className={`login-input ${retryAfter ? 'rate-limit' : ''}`}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">{tLogin('form.labels.password')}</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || retryAfter}
                className={`login-input ${retryAfter ? 'rate-limit' : ''}`}
              />
            </div>

            {requireCaptcha && (
              <div className="captcha-container" ref={recaptchaContainer}></div>
            )}

            <button 
              type="submit" 
              className="login-button" 
              disabled={loading || retryAfter || (requireCaptcha && recaptchaStatus !== 'ready')}
            >
              {loading ? tLogin('form.buttons.loggingIn') : tLogin('form.buttons.login')}
            </button>
          </form>

          <div className="divider">
            <span>{tLogin('form.divider')}</span>
          </div>

          <button
            type="button"
            className="discord-button"
            onClick={handleDiscordLogin}
            disabled={loading || retryAfter}
          >
            {tLogin('form.buttons.discordLogin')}
          </button>

          <div className="links">
            <Link to="/register" className="register-link">
              {tLogin('form.links.register')}
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage; 
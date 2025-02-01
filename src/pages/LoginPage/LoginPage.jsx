import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './loginPage.css';
import { CompleteNav, MetaTags } from '../../components';
import { useScript } from '../../hooks/useScript';
const currentUrl = window.location.origin + location.pathname;

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

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
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
      const response = err.response?.data;
      setError(response?.error || tLogin('errors.generic'));
      if (response?.requireCaptcha) {
        setRequireCaptcha(true);
      }
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
          {error && <div className="error-message">{error}</div>}
        
          <form onSubmit={handleEmailLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">{tLogin('form.labels.emailOrUsername')}</label>
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
              <label htmlFor="password">{tLogin('form.labels.password')}</label>
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
            disabled={loading}
          >
            {tLogin('form.buttons.discordLogin')}
          </button>

        </div>
      </div>
    </div>
  );
};

export default LoginPage; 
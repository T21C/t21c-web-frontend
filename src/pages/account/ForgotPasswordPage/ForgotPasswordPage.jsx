import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

import { MetaTags } from '@/components/common/display';
import ReCAPTCHA from '@/components/auth/ReCaptcha/ReCaptcha';
import { useTranslation } from 'react-i18next';
import './forgotPasswordPage.css';

const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('request'); // request, sent, reset, error, success
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requireCaptcha, setRequireCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [retryAfter, setRetryAfter] = useState(null);
  const timerRef = useRef(null);
  const { requestPasswordReset, resetPassword, initiateLogin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('pages');

  // Handle countdown timer for rate limiting
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (retryAfter) {
      const endTime = Date.now() + retryAfter;
      
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, endTime - now);
        
        if (remaining <= 0) {
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

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
  };

  useEffect(() => {
    if (requireCaptcha && captchaToken === null) {
      setCaptchaKey(prev => prev + 1);
    }
  }, [requireCaptcha]);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      setStatus('reset');
      return;
    }
    
    setStatus('request');
  }, [searchParams]);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setRetryAfter(null);
    setLoading(true);

    try {
      if (requireCaptcha && !captchaToken) {
        setError(t('forgotPassword.errors.captcha.required'));
        setLoading(false);
        return;
      }

      await requestPasswordReset(email, captchaToken);
      setStatus('sent');
    } catch (err) {
      console.error('Password reset request error:', err);
      
      let errorMessage = '';
      let retryAfterValue = null;
      let captchaRequired = false;
      
      if (err.response) {
        const response = err.response.data;
        
        if (response?.retryAfter) {
          retryAfterValue = response.retryAfter;
          errorMessage = response.message || t('forgotPassword.errors.tooManyRequests');
        } else if (response?.requireCaptcha) {
          captchaRequired = true;
          errorMessage = response.message || response.error || t('forgotPassword.errors.generic');
        } else if (response?.message) {
          errorMessage = response.message;
          captchaRequired = response.requireCaptcha || false;
        } else if (response?.error) {
          errorMessage = response.error;
        } else if (err.response.status === 429) {
          errorMessage = t('forgotPassword.errors.tooManyRequests');
          if (response?.retryAfter) {
            retryAfterValue = response.retryAfter;
          }
        } else {
          errorMessage = t('forgotPassword.errors.requestFailed');
        }
      } else if (err.request) {
        errorMessage = t('forgotPassword.errors.network');
      } else {
        errorMessage = err.message || t('forgotPassword.errors.generic');
      }
      
      setError(errorMessage);
      if (retryAfterValue) {
        setRetryAfter(retryAfterValue);
      }
      if (captchaRequired) {
        setRequireCaptcha(true);
        setCaptchaKey(prev => prev + 1);
        if (!requireCaptcha) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        setCaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        setError(t('forgotPassword.errors.passwordsMismatch'));
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError(t('forgotPassword.errors.passwordTooShort'));
        setLoading(false);
        return;
      }

      const token = searchParams.get('token');
      await resetPassword(token, password);
      setStatus('success');
    } catch (err) {
      console.error('Password reset error:', err);
      
      let errorMessage = '';
      if (err.response) {
        const response = err.response.data;
        if (response?.message) {
          errorMessage = response.message;
        } else if (response?.error) {
          errorMessage = response.error;
        } else if (err.response.status === 400) {
          errorMessage = t('forgotPassword.errors.invalidToken');
        } else {
          errorMessage = t('forgotPassword.errors.resetFailed');
        }
      } else if (err.request) {
        errorMessage = t('forgotPassword.errors.network');
      } else {
        errorMessage = err.message || t('forgotPassword.errors.generic');
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'request':
        return (
          <>
            <h1>{t('forgotPassword.request.title')}</h1>
            <p className="status-message">
              {t('forgotPassword.request.description')}
            </p>
            
            {error && (
              <div className="error-message">
                {error}
                {retryAfter && (
                  <div className="retry-countdown">
                    {t('forgotPassword.rateLimit.timeRemaining', { time: formatTime(retryAfter) })}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleRequestReset} className="reset-form">
              <div className="form-group">
                <label htmlFor="email">{t('forgotPassword.request.form.labels.email')}</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || retryAfter}
                  className={`reset-input ${retryAfter ? 'rate-limit' : ''}`}
                  placeholder={t('forgotPassword.request.form.placeholders.email')}
                />
              </div>

              {requireCaptcha && (
                <div className="captcha-container">
                  <ReCAPTCHA key={captchaKey} onVerify={handleCaptchaVerify} />
                </div>
              )}

              <button 
                type="submit" 
                className="action-button" 
                disabled={loading || retryAfter || (requireCaptcha && !captchaToken)}
              >
                {loading ? t('forgotPassword.request.form.buttons.sending') : t('forgotPassword.request.form.buttons.sendReset')}
              </button>
            </form>

            <button
              className="action-button secondary"
              onClick={() => navigate('/login')}
            >
              {t('forgotPassword.request.form.buttons.backToLogin')}
            </button>
          </>
        );

      case 'sent':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>{t('forgotPassword.sent.title')}</h1>
            <p className="status-message">
              {t('forgotPassword.sent.description')}
            </p>
            <p className="email-display">{email}</p>
            <p className="info-message">
              {t('forgotPassword.sent.info')}
            </p>
            <button
              className="action-button"
              onClick={() => navigate('/login')}
            >
              {t('forgotPassword.sent.buttons.backToLogin')}
            </button>
          </>
        );

      case 'reset':
        return (
          <>
            <h1>{t('forgotPassword.reset.title')}</h1>
            <p className="status-message">
              {t('forgotPassword.reset.description')}
            </p>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="reset-form">
              <div className="form-group">
                <label htmlFor="password">{t('forgotPassword.reset.form.labels.password')}</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="reset-input"
                  placeholder={t('forgotPassword.reset.form.placeholders.password')}
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">{t('forgotPassword.reset.form.labels.confirmPassword')}</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="reset-input"
                  placeholder={t('forgotPassword.reset.form.placeholders.confirmPassword')}
                  minLength={8}
                />
              </div>

              <button 
                type="submit" 
                className="action-button" 
                disabled={loading}
              >
                {loading ? t('forgotPassword.reset.form.buttons.resetting') : t('forgotPassword.reset.form.buttons.reset')}
              </button>
            </form>
          </>
        );

      case 'success':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>{t('forgotPassword.success.title')}</h1>
            <p className="status-message">
              {t('forgotPassword.success.description')}
            </p>
            <button
              className="action-button"
              onClick={() => initiateLogin()}
            >
              {t('forgotPassword.success.buttons.login')}
            </button>
          </>
        );

      case 'error':
        return (
          <>
            <div className="error-icon">✕</div>
            <h1>Reset Failed</h1>
            {error && <p className="error-message">{error}</p>}
            <button
              className="action-button"
              onClick={() => navigate('/forgot-password')}
            >
              Try Again
            </button>
            <button
              className="action-button secondary"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="forgot-password-page">
      <MetaTags
        title={t('forgotPassword.meta.title')}
        description={t('forgotPassword.meta.description')}
        url={window.location.href}
        type="website"
      />
      
      <div className="reset-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

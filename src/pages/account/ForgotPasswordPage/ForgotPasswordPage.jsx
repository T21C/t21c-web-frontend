import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CompleteNav } from '@/components/layout';
import { MetaTags } from '@/components/common/display';
import ReCAPTCHA from '@/components/auth/ReCaptcha/ReCaptcha';
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
  const resetAttempted = useRef(false);

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
        setError('Please complete the captcha');
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
          errorMessage = response.message || 'Too many requests. Please try again later.';
        } else if (response?.requireCaptcha) {
          captchaRequired = true;
          errorMessage = response.message || response.error || 'An error occurred';
        } else if (response?.message) {
          errorMessage = response.message;
          captchaRequired = response.requireCaptcha || false;
        } else if (response?.error) {
          errorMessage = response.error;
        } else if (err.response.status === 429) {
          errorMessage = 'Too many requests. Please try again later.';
          if (response?.retryAfter) {
            retryAfterValue = response.retryAfter;
          }
        } else {
          errorMessage = 'An error occurred while processing your request';
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = err.message || 'An error occurred';
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
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
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
          errorMessage = 'Invalid or expired reset token';
        } else {
          errorMessage = 'An error occurred while resetting your password';
        }
      } else if (err.request) {
        errorMessage = 'Network error. Please check your connection.';
      } else {
        errorMessage = err.message || 'An error occurred';
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
            <h1>Forgot Password</h1>
            <p className="status-message">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
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

            <form onSubmit={handleRequestReset} className="reset-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || retryAfter}
                  className={`reset-input ${retryAfter ? 'rate-limit' : ''}`}
                  placeholder="Enter your email address"
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
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <button
              className="action-button secondary"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </>
        );

      case 'sent':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Reset Link Sent</h1>
            <p className="status-message">
              We've sent a password reset link to your email address.
            </p>
            <p className="email-display">{email}</p>
            <p className="info-message">
              Please check your inbox and click the link to reset your password. 
              The link will expire in 1 hour.
            </p>
            <button
              className="action-button"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </>
        );

      case 'reset':
        return (
          <>
            <h1>Reset Password</h1>
            <p className="status-message">
              Enter your new password below.
            </p>
            
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="reset-form">
              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="reset-input"
                  placeholder="Enter your new password"
                  minLength={8}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="reset-input"
                  placeholder="Confirm your new password"
                  minLength={8}
                />
              </div>

              <button 
                type="submit" 
                className="action-button" 
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        );

      case 'success':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Password Reset Successfully</h1>
            <p className="status-message">
              Your password has been reset successfully.
            </p>
            <button
              className="action-button"
              onClick={() => initiateLogin()}
            >
              Log In
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
        title="Forgot Password - TUF"
        description="Reset your password for The Universal Forums"
        url={window.location.href}
        type="website"
      />
      <CompleteNav />
      <div className="background-level"></div>
      <div className="reset-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

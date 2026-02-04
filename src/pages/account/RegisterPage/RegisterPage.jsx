import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './registerPage.css';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

import { Tooltip } from 'react-tooltip';
import { QuestionmarkCircleIcon, WarningIcon } from '@/components/common/icons';
import ReCAPTCHA from '@/components/auth/ReCaptcha/ReCaptcha';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [modifiedUsername, setModifiedUsername] = useState('');
  const [retryAfter, setRetryAfter] = useState(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef(null);
  const [validationErrors, setValidationErrors] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [usernameValidationState, setUsernameValidationState] = useState({
    isValid: false,
    message: '',
    invalidChar: '',
    invalidCharIndex: -1,
    errorType: '' // 'length', 'characters', or ''
  });
  const [captchaKey, setCaptchaKey] = useState(null);
  const [captchaToken, setCaptchaToken] = useState(null);
  const navigate = useNavigate();
  const { user, loginWithDiscord, register } = useAuth();
  const { t } = useTranslation('pages');

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
  };

  useEffect(() => {
    if (captchaToken === null) {
      setCaptchaKey(prev => prev + 1);
    }
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username) => {
    if (username.length < 3 || username.length > 20) {
      return {
        isValid: false,
        message: t('register.form.username.error.length'),
        invalidChar: '',
        invalidCharIndex: -1,
        errorType: 'length'
      };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      for (let i = 0; i < username.length; i++) {
        if (!/^[a-zA-Z0-9_-]$/.test(username[i])) {
          return {
            isValid: false,
            message: t('register.form.username.error.characters'),
            invalidChar: username[i],
            invalidCharIndex: i,
            errorType: 'characters'
          };
        }
      }
    }
    
    return {
      isValid: true,
      message: '',
      invalidChar: '',
      invalidCharIndex: -1,
      errorType: ''
    };
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return t('register.form.password.error.length');
    }
    return '';
  };

  const validateForm = () => {
    const errors = {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      captcha: '',
    };
    
    let isValid = true;
    
    if (!captchaToken) {
      errors.captcha = t('register.form.captcha.error');
      isValid = false;
    }

    if (formData.email && !validateEmail(formData.email)) {
      errors.email = t('register.form.email.error');
      isValid = false;
    }
    
    if (formData.username) {
      const usernameValidation = validateUsername(formData.username);
      if (!usernameValidation.isValid) {
        errors.username = usernameValidation.message;
        isValid = false;
      }
    }
    
    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        errors.password = passwordError;
        isValid = false;
      }
    }
    
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('register.form.password.error.mismatch');
      isValid = false;
    }
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setAgreedToTerms(checked);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
      
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
  
      if (name === 'username') {
        setUsernameValidationState(validateUsername(value));
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    if (name === 'email' && value) {
      setValidationErrors(prev => ({
        ...prev,
        email: validateEmail(value) ? '' : t('register.form.email.error'),
      }));
    } else if (name === 'username' && value) {
      const usernameValidation = validateUsername(value);
      setUsernameValidationState(usernameValidation);
      setValidationErrors(prev => ({
        ...prev,
        username: usernameValidation.isValid ? '' : usernameValidation.message,
      }));
    } else if (name === 'password' && value) {
      setValidationErrors(prev => ({
        ...prev,
        password: validatePassword(value),
      }));
    } else if (name === 'confirmPassword' && value && formData.password) {
      setValidationErrors(prev => ({
        ...prev,
        confirmPassword: value === formData.password ? '' : t('register.form.password.error.mismatch'),
      }));
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (retryAfter) {
      timerRef.current = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1000) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return null;
          }
          return prev - 1000;
        });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      return;
    }
    
    setError('');
    setRetryAfter(null);
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        captchaToken: captchaToken
      });

      if (response.usernameModified) {
        setModifiedUsername(response.username);
      }

      setSuccess(true);
      
    } catch (err) {
      if (err.retryAfter) {
        setRetryAfter(err.retryAfter);
        setError(t('register.errors.rateLimit'));
      } else {
        setError(err.message || t('register.errors.generic'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscordRegister = async () => {
    try {
      await loginWithDiscord();
    } catch (err) {
      setError(t('register.errors.discordFailed'));
    }
  };

  if (user) {
    navigate('/profile');
  }

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  if (success) {
    return (
      <div className="register-page-wrapper">
        
        <div className="register-page">
          <div className="register-container">
            <div className="success-container">
              <h1>{t('register.success.title')}</h1>
              <p className="success-message">
                {t('register.success.message')}
              </p>
              {modifiedUsername && (
                <p className="username-modified-message">
                  {t('register.success.usernameModified', { username: modifiedUsername })}
                </p>
              )}
              <button className="profile-button" onClick={handleGoToProfile}>
                {t('register.success.goToProfile')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getUsernameTooltipContent = () => {
    if (!usernameValidationState.isValid && formData.username) {
      if (usernameValidationState.errorType === 'length') {
        return t('register.form.username.tooltip.length', { length: formData.username.length });
      } else if (usernameValidationState.errorType === 'characters') {
        return t('register.form.username.tooltip.characters', { 
          char: usernameValidationState.invalidChar,
          position: usernameValidationState.invalidCharIndex + 1
        });
      }
    }
    
    return t('register.form.username.tooltip.default');
  };

  return (
    <div className="register-page-wrapper">
      
      <div className="register-page">
        <div className="register-container">
          <h1>{t('register.title')}</h1>
          {error && (
            <div className="error-message">
              {error}
              {retryAfter && (
                <div className="retry-countdown">
                  {t('register.errors.timeRemaining', { time: formatTime(retryAfter) })}
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="email">{t('register.form.email.label')}</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={validationErrors.email ? 'input-error' : ''}
              />
              {validationErrors.email && <div className="validation-error">{validationErrors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="username">{t('register.form.username.label')}</label>
              <div className="username-input">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                  className={validationErrors.username ? 'input-error' : ''}
                /> 
                <div 
                  className={`username-tooltip ${!usernameValidationState.isValid && formData.username ? 'username-tooltip-error' : ''}`}
                  data-tooltip-id="username-tooltip"
                >
                  <Tooltip id="username-tooltip" className="form-help-text">
                    {getUsernameTooltipContent()}
                  </Tooltip>
                  {usernameValidationState.isValid || !formData.username ? (
                    <QuestionmarkCircleIcon strokeWidth={0.1}/>
                  ) : (
                    <WarningIcon color="#ff4444" strokeWidth={2}/>
                  )}
                </div>
              </div>
              {validationErrors.username && <div className="validation-error">{validationErrors.username}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">{t('register.form.password.label')}</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={validationErrors.password ? 'input-error' : ''}
              />
              {validationErrors.password && <div className="validation-error">{validationErrors.password}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">{t('register.form.password.confirmLabel')}</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                className={validationErrors.confirmPassword ? 'input-error' : ''}
              />
              {validationErrors.confirmPassword && <div className="validation-error">{validationErrors.confirmPassword}</div>}
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="agreedToTerms"
                checked={agreedToTerms}
                onChange={handleChange}
                required
              />
              <span>
                {t('register.form.terms.label')}{' '}
                <Link to="/privacy-policy" className="terms-link"><b>{t('register.form.terms.privacyPolicy')}</b></Link>
                {' '}{t('register.form.terms.and')}{' '}
                <Link to="/terms-of-service" className="terms-link"><b>{t('register.form.terms.termsOfService')}</b></Link>
              </span>
            </label>
            <div className="captcha-container">
              <ReCAPTCHA key={captchaKey} onVerify={handleCaptchaVerify} />
            </div>

            <button 
              type="submit" 
              className={`register-button ${!agreedToTerms || isSubmitting || !captchaToken ? 'disabled' : ''}`}
              disabled={!agreedToTerms || isSubmitting || !captchaToken}
            >
              {isSubmitting ? t('loading.submitting', { ns: 'common' }) : t('register.form.submit.default')}
            </button>
          </form>

          <div className="divider">
            <span>{t('register.divider')}</span>
          </div>

          <button
            type="button"
            className="discord-button"
            onClick={handleDiscordRegister}
          >
            {t('register.discord.register')}
          </button>

          <div className="links">
            <Link to="/login" className="login-link">
              {t('register.login.link')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 
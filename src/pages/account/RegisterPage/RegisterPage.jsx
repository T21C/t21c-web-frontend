import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './registerPage.css';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { CompleteNav } from '@/components/layout';
import { Tooltip } from 'react-tooltip';
import { QuestionmarkCircleIcon, WarningIcon } from '@/components/common/icons';

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
  const navigate = useNavigate();
  const { loginWithDiscord, register } = useAuth();
  const { t } = useTranslation('pages');
  const tRegister = (key, params = {}) => t(`register.${key}`, params);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validateUsername = (username) => {
    // Check length (3-20 characters)
    if (username.length < 3 || username.length > 20) {
      return {
        isValid: false,
        message: 'Username must be between 3 and 20 characters',
        invalidChar: '',
        invalidCharIndex: -1,
        errorType: 'length'
      };
    }
    
    // Check for alphanumeric characters, underscores and hyphens only
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username)) {
      // Find the first invalid character
      for (let i = 0; i < username.length; i++) {
        if (!/^[a-zA-Z0-9_-]$/.test(username[i])) {
          return {
            isValid: false,
            message: `Username can only contain alphanumeric characters, underscores _ and hyphens -`,
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
      return 'Password must be at least 8 characters long';
    }
    return '';
  };

  const validateForm = () => {
    const errors = {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
    };
    
    let isValid = true;
    
    // Validate email
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
      isValid = false;
    }
    
    // Validate username
    if (formData.username) {
      const usernameValidation = validateUsername(formData.username);
      if (!usernameValidation.isValid) {
        errors.username = usernameValidation.message;
        isValid = false;
      }
    }
    
    // Validate password
    if (formData.password) {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        errors.password = passwordError;
        isValid = false;
      }
    }
    
    // Validate password confirmation
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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
      
      // Clear validation error for this field when user types
      setValidationErrors(prev => ({
        ...prev,
        [name]: '',
      }));
  
      // Update username validation state
      if (name === 'username') {
        setUsernameValidationState(validateUsername(value));
      }
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    
    // Validate on blur
    if (name === 'email' && value) {
      setValidationErrors(prev => ({
        ...prev,
        email: validateEmail(value) ? '' : 'Invalid email format',
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
        confirmPassword: value === formData.password ? '' : 'Passwords do not match',
      }));
    }
  };

  useEffect(() => {
    // Clear any existing timer when component unmounts or retryAfter changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Start a new timer if retryAfter is set
    if (retryAfter) {
      timerRef.current = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1000) {
            // Clear the interval when time is up
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setError('');
    setRetryAfter(null);
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    // Set submitting state to true
    setIsSubmitting(true);

    try {
      const response = await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });

      // Check if username was modified by the server
      if (response.usernameModified) {
        setModifiedUsername(response.username);
      }

      setSuccess(true);
      
    } catch (err) {
      // Handle rate limit errors
      if (err.retryAfter) {
        setRetryAfter(err.retryAfter); // Use milliseconds directly
        setError(`Too many new accounts created. IP temporarily blocked.`);
      } 
      // Handle other errors
      else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      // Reset submitting state regardless of success or failure
      setIsSubmitting(false);
    }
  };

  const handleDiscordRegister = async () => {
    try {
      await loginWithDiscord();
    } catch (err) {
      setError(tLogin('errors.discordFailed'));
    }
  };

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  if (success) {
    return (
      <div className="register-page-wrapper">
        <CompleteNav />
        <div className="background-level"></div>
        <div className="register-page">
          <div className="register-container">
            <div className="success-container">
              <h1>Registration Successful!</h1>
              <p className="success-message">
                Please check your email to verify your account. You can go to your profile now.
              </p>
              {modifiedUsername && (
                <p className="username-modified-message">
                  Your username was modified to <strong>{modifiedUsername}</strong> because the original username was already taken.
                </p>
              )}
              <button className="profile-button" onClick={handleGoToProfile}>
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get tooltip content based on validation state
  const getUsernameTooltipContent = () => {
    if (!usernameValidationState.isValid && formData.username) {
      if (usernameValidationState.errorType === 'length') {
        return (
          <>
            Username must be between 3 and 20 characters. Your username is currently {formData.username.length} characters.
          </>
        );
      } else if (usernameValidationState.errorType === 'characters') {
        return (
          <>
            Invalid character <strong>"{usernameValidationState.invalidChar}"</strong> at position {usernameValidationState.invalidCharIndex + 1}. 
            Username can only contain alphanumeric characters, underscores _ and hyphens -.
          </>
        );
      }
    }
    
    return (
      <>
        If your username collides with other <u>player's name</u> (not users!), a random number will be added to make it unique: <b>Jipper</b> ➔ <b>Jipper_123456</b>
      </>
    );
  };

  return (
    <div className="register-page-wrapper">
    <CompleteNav />
          <div className="background-level"></div>
      <div className="register-page">
        
        <div className="register-container">
          <h1>Create Account</h1>
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
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
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
            <label htmlFor="username">Username</label>
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
            <label htmlFor="password">Password</label>
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
            <label htmlFor="confirmPassword">Confirm Password</label>
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
                I have read and agree with the{' '}
                <Link to="/privacy-policy" className="terms-link"><b>Privacy Policy</b></Link>
                {' '}and{' '}
                <Link to="/terms-of-service" className="terms-link"><b>Terms of Service</b></Link>
              </span>
            </label>

          <button 
            type="submit" 
            className={`register-button ${!agreedToTerms || isSubmitting ? 'disabled' : ''}`}
            disabled={!agreedToTerms || isSubmitting}
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="discord-button"
          onClick={handleDiscordRegister}
        >
          Register with Discord
        </button>

        <div className="links">
          <Link to="/login" className="login-link">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
    </div>
  );
};

export default RegisterPage; 
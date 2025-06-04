import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './verifyEmailPage.css';
import { useAuth } from '@/contexts/AuthContext';
const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { initiateLogin } = useAuth();
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

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setError('No verification token provided');
      return;
    }

    const verifyEmail = async () => {
      try {
        await axios.post(import.meta.env.VITE_AUTH_VERIFY_EMAIL, { token });
        setStatus('success');
        setTimeout(() => {
          initiateLogin();
        }, 3000);
      } catch (err) {
        console.error('Email verification error:', err);
        setStatus('error');
        
        // Extract error message from various possible response formats
        let errorMessage = '';
        let retryAfterValue = null;
        
        if (err.response) {
          const response = err.response.data;
          
          // Handle rate limit errors
          if (response?.retryAfter) {
            retryAfterValue = response.retryAfter;
            errorMessage = response.message || 'Too many verification attempts. Please try again later.';
          }
          // Handle specific error messages
          else if (response?.message) {
            errorMessage = response.message;
          }
          else if (response?.error) {
            errorMessage = response.error;
          }
          // Handle specific status codes
          else if (err.response.status === 400) {
            errorMessage = 'Invalid or expired verification token';
          }
          else if (err.response.status === 429) {
            errorMessage = 'Too many verification attempts. Please try again later.';
            if (response?.retryAfter) {
              retryAfterValue = response.retryAfter;
            }
          }
          else {
            errorMessage = 'Email verification failed';
          }
        } 
        // Handle network errors
        else if (err.request) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } 
        // Handle other errors
        else {
          errorMessage = err.message || 'Email verification failed';
        }
        
        // Set the error message and retry after value
        setError(errorMessage);
        if (retryAfterValue) {
          setRetryAfter(retryAfterValue);
        }
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResendVerification = async () => {
    try {
      setError('');
      setRetryAfter(null);
      
      await axios.post(import.meta.env.VITE_AUTH_RESEND_VERIFICATION, {
        email: searchParams.get('email'),
      });
      setStatus('resent');
    } catch (err) {
      console.error('Resend verification error:', err);
      
      // Extract error message from various possible response formats
      let errorMessage = '';
      let retryAfterValue = null;
      
      if (err.response) {
        const response = err.response.data;
        
        // Handle rate limit errors
        if (response?.retryAfter) {
          retryAfterValue = response.retryAfter;
          errorMessage = response.message || 'Too many verification email requests. Please try again later.';
        }
        // Handle specific error messages
        else if (response?.message) {
          errorMessage = response.message;
        }
        else if (response?.error) {
          errorMessage = response.error;
        }
        // Handle specific status codes
        else if (err.response.status === 400) {
          errorMessage = 'Email is required';
        }
        else if (err.response.status === 404) {
          errorMessage = 'User not found';
        }
        else if (err.response.status === 429) {
          errorMessage = 'Too many verification email requests. Please try again later.';
          if (response?.retryAfter) {
            retryAfterValue = response.retryAfter;
          }
        }
        else {
          errorMessage = 'Failed to resend verification email';
        }
      } 
      // Handle network errors
      else if (err.request) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } 
      // Handle other errors
      else {
        errorMessage = err.message || 'Failed to resend verification email';
      }
      
      // Set the error message and retry after value
      setError(errorMessage);
      if (retryAfterValue) {
        setRetryAfter(retryAfterValue);
      }
    }
  };

  return (
    <div className="verify-email-page-wrapper">
      <div className="verify-email-page">
        <div className="verify-email-container">
          {status === 'verifying' && (
          <>
            <h1>Verifying Email</h1>
            <p className="status-message">Please wait while we verify your email address...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h1>Email Verified!</h1>
            <p className="success-message">
              Your email has been successfully verified. You will be redirected to the login page.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1>Verification Failed</h1>
            <p className="error-message">
              {error}
              {retryAfter && (
                <div className="retry-countdown">
                  Time remaining: {formatTime(retryAfter)}
                </div>
              )}
            </p>
            <button
              className="resend-button"
              onClick={handleResendVerification}
              disabled={retryAfter}
            >
              {retryAfter ? `Resend (${formatTime(retryAfter)})` : 'Resend Verification Email'}
            </button>
          </>
        )}

        {status === 'resent' && (
          <>
            <h1>Verification Email Sent</h1>
            <p className="success-message">
              A new verification email has been sent. Please check your inbox and click the verification link.
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage; 
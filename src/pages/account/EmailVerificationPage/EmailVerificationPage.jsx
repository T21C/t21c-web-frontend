import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CompleteNav } from '@/components/layout';
import './emailVerificationPage.css';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { user, verifyEmail, resendVerification, fetchUser } = useAuth();
  const navigate = useNavigate();
  const verificationAttempted = useRef(false);

  useEffect(() => {
    // If user is already verified, show already verified state immediately
    if (user?.isEmailVerified) {
      setStatus('already-verified');
      return;
    }

    const token = searchParams.get('token');
    
    // If no token, treat as manual page visit
    if (!token) {
      setStatus('needs-verification');
      return;
    }
    
    // Prevent multiple verification attempts
    if (verificationAttempted.current) {
      return;
    }
    
    verificationAttempted.current = true;
    
    const verifyToken = async () => {
      try {
        // Try to verify the email regardless of login status
        const response = await verifyEmail(token);
        
        // If we got an email back from the verification, store it
        if (response && response.email) {
          setVerificationEmail(response.email);
        }
        
        // If user is not logged in, show the login prompt
        if (!user) {
          setStatus('verify-success-login-required');
          return;
        }
        
        // Otherwise proceed with normal success flow
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };

    verifyToken();
  }, [searchParams, verifyEmail, user]);

  // Separate effect to fetch user data after successful verification
  useEffect(() => {
    if (status === 'success') {
      fetchUser();
    }
  }, [status, fetchUser]);

  const handleResendVerification = async () => {
    const emailToUse = user?.email || verificationEmail;
    
    if (!emailToUse) {
      setError('Unable to determine your email address');
      return;
    }

    try {
      setResending(true);
      await resendVerification(emailToUse);
      setStatus('resent');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    // For non-logged in users with a token, show simplified content
    if (!user && searchParams.get('token')) {
      switch (status) {
        case 'verifying':
          return (
            <>
              <h1>Verifying Email</h1>
              <div className="loader"></div>
              <p className="status-message">Please wait while we verify your email address...</p>
            </>
          );
        case 'verify-success-login-required':
          return (
            <>
              <div className="success-icon">✓</div>
              <h1>Email Verified!</h1>
              <p className="status-message">Your email has been successfully verified.</p>
              <p className="login-required-message">Please log in to access your account.</p>
              <button
                className="action-button"
                onClick={() => navigate('/login')}
              >
                Log In
              </button>
            </>
          );
        case 'error':
          return (
            <>
              <div className="error-icon">✕</div>
              <h1>Verification Failed</h1>
              <p className="error-message">{error}</p>
              <button
                className="action-button"
                onClick={() => navigate('/login')}
              >
                Go to Login
              </button>
            </>
          );
        default:
          return null;
      }
    }

    // For logged-in users or manual visits, show full content
    switch (status) {
      case 'verifying':
        return (
          <>
            <h1>Verifying Email</h1>
            <div className="loader"></div>
            <p className="status-message">Please wait while we verify your email address...</p>
          </>
        );
      case 'success':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Email Verified!</h1>
            <p className="status-message">Your email has been successfully verified.</p>
            <button
              className="action-button"
              onClick={() => navigate('/profile')}
            >
              Go to Profile
            </button>
          </>
        );
      case 'already-verified':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Email Verified</h1>
            <p className="status-message">Your email is verified. No action is needed.</p>
            <button
              className="action-button"
              onClick={() => navigate('/profile')}
            >
              Go to Profile
            </button>
          </>
        );
      case 'needs-verification':
        return (
          <>
            <div className="info-icon"></div>
            <h1>Email Verification Required</h1>
            <p className="status-message">Please check your email for a verification link.</p>
            <div className="resend-section">
              <p className="resend-info">Need a new verification email?</p>
              <p className="email-display">{user?.email || 'your email address'}</p>
              <button
                className="action-button"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
            <button
              className="action-button secondary"
              onClick={() => navigate('/profile')}
            >
              Back to Profile
            </button>
          </>
        );
      case 'error':
        return (
          <>
            <div className="error-icon">✕</div>
            <h1>Verification Failed</h1>
            <p className="error-message">{error}</p>
            <div className="resend-section">
              <p className="resend-info">We'll send a new verification email to:</p>
              <p className="email-display">{user?.email || verificationEmail || 'your email address'}</p>
              <button
                className="action-button"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
            <button
              className="action-button secondary"
              onClick={() => navigate('/profile')}
            >
              Back to Profile
            </button>
          </>
        );
      case 'resent':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Verification Email Sent</h1>
            <p className="status-message">A new verification email has been sent to your inbox.</p>
            <p className="email-display">{user?.email || verificationEmail}</p>
            <button
              className="action-button"
              onClick={() => navigate('/profile')}
            >
              Back to Profile
            </button>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="email-verification-page">
      <CompleteNav />
      <div className="background-level"></div>
      <div className="verification-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerificationPage; 
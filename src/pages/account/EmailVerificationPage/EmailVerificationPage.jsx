import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import './emailVerificationPage.css';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { user, verifyEmail, resendVerification, initiateLogin } = useAuth();
  const navigate = useNavigate();
  const verificationAttempted = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (user?.isEmailVerified) {
      setStatus('already-verified');
      return;
    }

    if (!token) {
      setStatus('needs-verification');
      return;
    }

    if (verificationAttempted.current) {
      return;
    }
    verificationAttempted.current = true;

    (async () => {
      try {
        setStatus('verifying');
        const data = await verifyEmail(token);
        if (data?.email) {
          setVerificationEmail(data.email);
        }
        // Use /me result from verifyEmail (avoids stale closure on `user` after await)
        if (data?.user) {
          setStatus('success');
        } else {
          setStatus('verify-success-login-required');
        }
      } catch (err) {
        setStatus('error');
        setError(err.message || 'Verification failed');
      }
    })();
  }, [token, verifyEmail, user?.isEmailVerified]);

  const handleResendVerification = async () => {
    const emailToUse = user?.email || verificationEmail;
    
    if (!emailToUse) {
      setError('Unable to determine your email address');
      return;
    }

    try {
      setResending(true);
      setError(''); // Clear any existing errors before attempting
      await resendVerification();
      setStatus('resent');
    } catch (err) {
      // Handle specific error cases
      if (err.response?.status === 500 && err.response?.data?.message === "Failed to send verification email") {
        setError("Unable to send verification email. Please try again later.");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
      setStatus('error');
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    // For non-logged in users with a token, show simplified content
    if (!user && token) {
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
              <h1>Verification Failed</h1>
              {error && <p className="error-message">{error}</p>}
              <button
                className="action-button"
                onClick={() => initiateLogin()}
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
              {error && <p className="error-message">{error}</p>}
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
            {error && <p className="error-message">{error}</p>}
            <div className="resend-section">
              <p className="resend-info">We&apos;ll send a new verification email to:</p>
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
      <div className="verification-container">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerificationPage; 
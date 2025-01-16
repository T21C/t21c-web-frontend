import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './verifyEmailPage.css';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
          navigate('/login');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.message || 'Email verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResendVerification = async () => {
    try {
      await axios.post(import.meta.env.VITE_AUTH_RESEND_VERIFICATION, {
        email: searchParams.get('email'),
      });
      setStatus('resent');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend verification email');
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
            <p className="error-message">{error}</p>
            <button
              className="resend-button"
              onClick={handleResendVerification}
            >
              Resend Verification Email
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
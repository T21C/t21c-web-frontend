import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './emailVerificationPage.css';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [error, setError] = useState('');
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setError('Verification token is missing');
      return;
    }

    const verifyToken = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };

    verifyToken();
  }, [searchParams, verifyEmail]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <h1>Verifying Email</h1>
            <p className="status-message">Please wait while we verify your email address...</p>
          </>
        );
      case 'success':
        return (
          <>
            <h1>Email Verified!</h1>
            <p className="status-message">Your email has been successfully verified.</p>
            <button
              className="action-button"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </button>
          </>
        );
      case 'error':
        return (
          <>
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
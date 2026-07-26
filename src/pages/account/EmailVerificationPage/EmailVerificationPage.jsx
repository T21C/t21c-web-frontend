// tuf-search: #EmailVerificationPage #emailVerificationPage #account #emailVerification
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAccountEmail } from '@/utils/accountEmail';
import CodeInput from '@/components/account/CodeInput/CodeInput';
import './emailVerificationPage.css';

function parseAvailableAtMs(value) {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

const EmailVerificationPage = () => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [code, setCode] = useState('');
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const noticeTimerRef = useRef(null);
  const {
    user,
    verifyEmail,
    resendVerification,
    cancelPendingEmail,
    initiateLogin,
    fetchUser,
  } = useAuth();
  const navigate = useNavigate();

  const pendingEmail = user?.pendingEmail;
  const verifiedEmail = user?.email;
  const cooldownSec = Math.max(0, Math.ceil((cooldownUntil - nowMs) / 1000));

  useEffect(() => {
    if (!user) {
      setStatus('login-required');
      return;
    }
    if (user.isEmailVerified && !pendingEmail) {
      setStatus('already-verified');
      return;
    }
    if (!pendingEmail && !hasAccountEmail(user)) {
      setStatus('needs-email');
      return;
    }
    if (!pendingEmail) {
      setStatus('needs-verification');
      return;
    }
    setStatus('enter-code');
  }, [user, pendingEmail, user?.isEmailVerified]);

  // Server is source of truth for resend availability (survives reload / new tabs).
  useEffect(() => {
    setCooldownUntil(parseAvailableAtMs(user?.emailResendAvailableAt));
    setNowMs(Date.now());
  }, [user?.emailResendAvailableAt]);

  // Wall-clock based tick so background tab throttling can't freeze remaining time.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return undefined;

    const sync = () => setNowMs(Date.now());
    const id = window.setInterval(sync, 250);
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', sync);

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', sync);
    };
  }, [cooldownUntil]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const showNotice = (message) => {
    setNotice(message);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice('');
      noticeTimerRef.current = null;
    }, 4000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Enter the verification code from your email');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const data = await verifyEmail(code.trim());
      if (data?.requireLogin) {
        setStatus('verify-success-login-required');
        return;
      }
      setStatus('success');
      await fetchUser(true, { silent: true });
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resending || cooldownSec > 0 || !pendingEmail) return;
    try {
      setResending(true);
      setError('');
      const data = await resendVerification();
      setCode('');
      const nextUntil = parseAvailableAtMs(data?.emailResendAvailableAt);
      if (nextUntil > 0) {
        setCooldownUntil(nextUntil);
        setNowMs(Date.now());
      }
      showNotice('New code sent');
    } catch (err) {
      setError(err.message || 'Failed to resend');
      if (err.retryAfter != null && Number.isFinite(Number(err.retryAfter))) {
        setCooldownUntil(Date.now() + Number(err.retryAfter));
        setNowMs(Date.now());
      }
    } finally {
      setResending(false);
    }
  };

  const handleCancelPending = async () => {
    try {
      setSubmitting(true);
      setError('');
      await cancelPendingEmail();
      navigate('/settings/account');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to cancel');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCooldown = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const destinationMessage = (() => {
    if (pendingEmail && verifiedEmail) {
      return (
        <>
          Code sent to <strong>{pendingEmail}</strong>
        </>
      );
    }
    if (pendingEmail) {
      return (
        <>
          Code sent to <strong>{pendingEmail}</strong>
        </>
      );
    }
    return <>Request a verification code to continue.</>;
  })();

  const renderContent = () => {
    switch (status) {
      case 'login-required':
        return (
          <>
            <h1>Sign in required</h1>
            <p className="status-message">Log in to verify or change your email.</p>
            <button type="button" className="action-button" onClick={() => initiateLogin()}>
              Log In
            </button>
          </>
        );
      case 'verify-success-login-required':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Email Verified!</h1>
            <p className="status-message">
              Your email was confirmed. Please log in again to continue.
            </p>
            <button type="button" className="action-button" onClick={() => initiateLogin()}>
              Log In
            </button>
          </>
        );
      case 'success':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Email Verified!</h1>
            <p className="status-message">Your email has been successfully verified.</p>
            <Link className="action-button" to="/profile">
              Go to Profile
            </Link>
          </>
        );
      case 'already-verified':
        return (
          <>
            <div className="success-icon">✓</div>
            <h1>Email Verified</h1>
            <p className="status-message">Your email is verified. No action is needed.</p>
            <Link className="action-button" to="/profile">
              Go to Profile
            </Link>
          </>
        );
      case 'needs-email':
        return (
          <>
            <h1>Email Required</h1>
            <p className="status-message">
              Your account does not have an email address. Add one in account settings.
            </p>
            <Link className="action-button" to="/settings/account">
              Add email in account settings
            </Link>
          </>
        );
      case 'enter-code':
      case 'needs-verification':
      case 'idle':
        return (
          <>
            <h1>Verify Email</h1>
            <p className="status-message">{destinationMessage}</p>

            <form className="verify-form" onSubmit={handleVerify}>
              <CodeInput value={code} onChange={setCode} disabled={submitting} />
              {error ? <p className="error-message">{error}</p> : null}
              {notice && !error ? <p className="notice-message">{notice}</p> : null}
              <button
                className="action-button"
                type="submit"
                disabled={submitting || !code}
              >
                {submitting ? 'Verifying...' : 'Verify code'}
              </button>
            </form>

            <div className="verify-actions">
              <button
                className="action-button secondary"
                type="button"
                onClick={handleResend}
                disabled={resending || !pendingEmail || cooldownSec > 0}
              >
                {resending
                  ? 'Sending...'
                  : cooldownSec > 0
                    ? `Resend in ${formatCooldown(cooldownSec)}`
                    : 'Resend code'}
              </button>
              {pendingEmail && verifiedEmail ? (
                <button
                  className="action-button secondary"
                  type="button"
                  onClick={handleCancelPending}
                  disabled={submitting}
                >
                  Cancel pending change
                </button>
              ) : null}
              <Link className="action-button secondary" to="/profile">
                Back to Profile
              </Link>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="email-verification-page">
      <div className="verification-container">{renderContent()}</div>
    </div>
  );
};

export default EmailVerificationPage;

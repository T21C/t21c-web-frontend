// tuf-search: #LoginPage #loginPage #account #login — Login
import React, { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './loginPage.css';

import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import ReCAPTCHA from '@/components/auth/ReCaptcha/ReCaptcha';
import CodeInput from '@/components/account/CodeInput/CodeInput';
import { useLoginFlow } from './useLoginFlow';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, getOriginUrl, clearOriginUrl } = useAuth();
  const { t } = useTranslation('pages');
  const location = useLocation();
  const flow = useLoginFlow();
  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('login.meta.title'),
        description: t('login.meta.description'),
        pathname: location.pathname,
        type: 'article',
        noindex: true,
      }),
    [t, location.pathname],
  );

  // Only bounce visitors who were already signed in on arrival; signing in
  // during this page's life is redirected by the submit handlers instead.
  const arrivedSignedIn = useRef(Boolean(user));

  useEffect(() => {
    if (user && arrivedSignedIn.current) {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate]);

  // Replace so /login leaves history: a pushed entry sends Back to this page,
  // which then redirects the now signed-in user straight back out.
  const redirectAfterLogin = () => {
    const from = getOriginUrl() || '/profile';
    clearOriginUrl();
    navigate(from, { replace: true });
  };

  const handleEmailLogin = async (e) => {
    const { completed } = await flow.submitCredentials(e);
    if (completed) {
      redirectAfterLogin();
    }
  };

  const handlePasskeyLogin = async () => {
    const { completed } = await flow.submitPasskey();
    if (completed) {
      redirectAfterLogin();
    }
  };

  const handleMfaSubmit = async (e) => {
    const { completed } = await flow.submitMfa(e);
    if (completed) {
      redirectAfterLogin();
    }
  };

  const handleMfaPasskey = async () => {
    const { completed } = await flow.submitMfaPasskey();
    if (completed) {
      redirectAfterLogin();
    }
  };

  return (
    <div className="login-page-wrapper">
      <MetaTags {...pageMeta} />

      <div className="login-page">
        <div className="login-container">
          <h1>
            {flow.step === 'mfa' ? t('login.mfa.title') : t('login.header.title')}
          </h1>
          {flow.error && (
            <div className="error-message">
              {flow.error}
              {flow.retryAfter && (
                <div className="retry-countdown">
                  Time remaining: {flow.formatTime(flow.retryAfter)}
                </div>
              )}
            </div>
          )}

          {flow.step === 'credentials' && (
            <>
              <form onSubmit={handleEmailLogin} className="login-form">
                <div className="form-group">
                  <label htmlFor="email">{t('login.form.labels.emailOrUsername')}</label>
                  <input
                    type="text"
                    id="email"
                    value={flow.email}
                    onChange={(e) => flow.setEmail(e.target.value)}
                    required
                    disabled={flow.loading || flow.retryAfter}
                    className={`login-input ${flow.retryAfter ? 'rate-limit' : ''}`}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">{t('login.form.labels.password')}</label>
                  <input
                    type="password"
                    autoComplete="login-password"
                    id="password"
                    value={flow.password}
                    onChange={(e) => flow.setPassword(e.target.value)}
                    required
                    disabled={flow.loading || flow.retryAfter}
                    className={`login-input ${flow.retryAfter ? 'rate-limit' : ''}`}
                  />
                  <div className="forgot-password-link">
                    <Link to="/forgot-password" className="forgot-password-text">
                      Forgot your password?
                    </Link>
                  </div>
                </div>

                {flow.requireCaptcha && (
                  <div className="captcha-container">
                    <ReCAPTCHA ref={flow.captchaRef} onChange={flow.setCaptchaToken} />
                  </div>
                )}

                <button
                  type="submit"
                  className="login-button"
                  disabled={
                    flow.loading ||
                    flow.retryAfter ||
                    (flow.requireCaptcha && !flow.captchaToken)
                  }
                >
                  {flow.loading
                    ? t('login.form.buttons.loggingIn')
                    : t('login.form.buttons.login')}
                </button>
              </form>

              <div className="divider">
                <span>{t('login.form.divider')}</span>
              </div>

              <button
                type="button"
                className="discord-button"
                onClick={flow.submitDiscord}
                disabled={flow.loading || flow.retryAfter}
              >
                {t('login.form.buttons.discordLogin')}
              </button>

              {flow.passkeysSupported && (
                <button
                  type="button"
                  className="passkey-button"
                  onClick={handlePasskeyLogin}
                  disabled={flow.loading || flow.retryAfter}
                >
                  {t('login.passkey.button')}
                </button>
              )}

              <div className="links">
                <Link to="/register" className="register-link">
                  {t('login.form.links.register')}
                </Link>
              </div>
            </>
          )}

          {flow.step === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="login-form login-mfa-form">
              {flow.mfaMethods.includes('passkey') && flow.passkeysSupported && (
                <button
                  type="button"
                  className="login-mfa-passkey"
                  onClick={handleMfaPasskey}
                  disabled={flow.loading}
                >
                  {t('login.mfa.usePasskey')}
                </button>
              )}

              {flow.mfaMethods.includes('email') && (
                <>
                  <p className="login-mfa-prompt">
                    {t('login.mfa.codePrompt', {
                      email: flow.maskedEmail || t('login.mfa.yourEmail'),
                    })}
                  </p>

                  <CodeInput
                    id="login-mfa-code"
                    label={t('login.mfa.codeLabel')}
                    value={flow.mfaCode}
                    onChange={flow.setMfaCode}
                    disabled={flow.loading}
                  />
                </>
              )}

              <label className="login-mfa-remember">
                <input
                  type="checkbox"
                  checked={flow.rememberDevice}
                  onChange={(e) => flow.setRememberDevice(e.target.checked)}
                  disabled={flow.loading}
                />
                <span>{t('login.mfa.rememberDevice')}</span>
              </label>

              {flow.mfaMethods.includes('email') && (
                <button
                  type="submit"
                  className="login-button"
                  disabled={flow.loading || flow.mfaCode.length < 8}
                >
                  {flow.loading
                    ? t('login.mfa.verifying')
                    : t('login.mfa.confirm')}
                </button>
              )}

              <div className="login-mfa-actions">
                {flow.mfaMethods.includes('email') && (
                  <button
                    type="button"
                    className="login-mfa-resend"
                    onClick={() => flow.requestMfaCode()}
                    disabled={flow.loading || flow.resendSeconds > 0}
                  >
                    {flow.resendSeconds > 0
                      ? t('login.mfa.resendIn', { seconds: flow.resendSeconds })
                      : t('login.mfa.resend')}
                  </button>
                )}
                <button
                  type="button"
                  className="login-mfa-back"
                  onClick={flow.backToCredentials}
                  disabled={flow.loading}
                >
                  {t('login.mfa.back')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

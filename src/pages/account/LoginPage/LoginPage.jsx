// tuf-search: #LoginPage #loginPage #account #login — Login
import React, { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './loginPage.css';

import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import ReCAPTCHA from '@/components/auth/ReCaptcha/ReCaptcha';
import CodeInput from '@/components/account/CodeInput/CodeInput';
import { navigateExternal } from '@/utils/externalNavigationGate';
import { DiscordIcon, GoogleIcon } from '@/components/common/icons';
import { useLoginFlow } from './useLoginFlow';

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, getOriginUrl, clearOriginUrl, setOriginUrl } = useAuth();
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

  // OAuth AS / deep-link return: absolute URLs continue via full navigation after login.
  useEffect(() => {
    const returnTo = searchParams.get('returnTo');
    if (returnTo && /^https?:\/\//i.test(returnTo)) {
      setOriginUrl(returnTo);
    }
  }, [searchParams, setOriginUrl]);

  // Only bounce visitors who were already signed in on arrival; signing in
  // during this page's life is redirected by the submit handlers instead.
  const arrivedSignedIn = useRef(Boolean(user));

  useEffect(() => {
    if (user && arrivedSignedIn.current) {
      const from = getOriginUrl();
      if (from && /^https?:\/\//i.test(from)) {
        clearOriginUrl();
        void navigateExternal(from);
        return;
      }
      navigate('/profile', { replace: true });
    }
  }, [user, navigate, getOriginUrl, clearOriginUrl]);

  // Replace so /login leaves history: a pushed entry sends Back to this page,
  // which then redirects the now signed-in user straight back out.
  const redirectAfterLogin = () => {
    const from = getOriginUrl() || '/profile';
    clearOriginUrl();
    if (/^https?:\/\//i.test(from)) {
      void navigateExternal(from);
      return;
    }
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

  const mfaHeading =
    flow.step !== 'mfa'
      ? t('login.header.title')
      : flow.mfaFactor === 'totp'
        ? t('login.mfa.totpTitle')
        : flow.mfaFactor === 'recovery'
          ? t('login.mfa.recoveryTitle')
          : flow.mfaFactor === 'email'
            ? t('login.mfa.title')
            : t('login.mfa.chooseTitle');
  const showMfaChooser = flow.step === 'mfa' && !flow.mfaFactor && flow.mfaMethods.includes('totp');

  return (
    <div className="login-page-wrapper">
      <MetaTags {...pageMeta} />

      <div className="login-page">
        <div className="login-container">
          <h1>{mfaHeading}</h1>
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
                  className="login-button btn-fill-primary btn-block"
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

              <div className="oauth-provider-buttons">
                <button
                  type="button"
                  className="discord-button btn-fill-discord btn-block"
                  onClick={flow.submitDiscord}
                  disabled={flow.loading || flow.retryAfter}
                >
                  <DiscordIcon size={18} />
                  {t('login.form.buttons.discordLogin')}
                </button>
                <button
                  type="button"
                  className="google-button btn-fill-glass btn-block"
                  onClick={flow.submitGoogle}
                  disabled={flow.loading || flow.retryAfter}
                >
                  <GoogleIcon size={18} />
                  {t('login.form.buttons.googleLogin')}
                </button>
              </div>

              {flow.passkeysSupported && (
                <button
                  type="button"
                  className="passkey-button btn-fill-glass btn-block"
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

          {flow.step === 'mfa' && showMfaChooser && (
            <div className="login-form login-mfa-form">
              <p className="login-mfa-prompt">{t('login.mfa.choosePrompt')}</p>
              <div className="login-mfa-choices">
                <button
                  type="button"
                  className="login-mfa-choice btn-fill-secondary btn-block"
                  onClick={() => flow.selectMfaFactor('totp')}
                  disabled={flow.loading}
                >
                  {t('login.mfa.useAuthenticator')}
                </button>
                {flow.mfaMethods.includes('email') && (
                  <button
                    type="button"
                    className="login-mfa-choice btn-fill-secondary btn-block"
                    onClick={() => flow.selectMfaFactor('email')}
                    disabled={flow.loading}
                  >
                    {t('login.mfa.useEmail')}
                  </button>
                )}
                <button
                  type="button"
                  className="login-mfa-choice btn-fill-secondary btn-block"
                  onClick={() => flow.selectMfaFactor('recovery')}
                  disabled={flow.loading}
                >
                  {t('login.mfa.useRecovery')}
                </button>
              </div>
              <div className="login-mfa-actions">
                <button
                  type="button"
                  className="login-mfa-back"
                  onClick={flow.backToCredentials}
                  disabled={flow.loading}
                >
                  {t('login.mfa.back')}
                </button>
              </div>
            </div>
          )}

          {flow.step === 'mfa' && !showMfaChooser && (
            <form onSubmit={handleMfaSubmit} className="login-form login-mfa-form">
              {flow.mfaFactor === 'totp' && (
                <>
                  <p className="login-mfa-prompt">{t('login.mfa.totpPrompt')}</p>
                  <CodeInput
                    id="login-mfa-totp"
                    label={t('login.mfa.totpLabel')}
                    value={flow.mfaCode}
                    onChange={flow.setMfaCode}
                    disabled={flow.loading}
                    length={6}
                    numeric
                  />
                </>
              )}

              {flow.mfaFactor === 'recovery' && (
                <>
                  <p className="login-mfa-prompt">{t('login.mfa.recoveryPrompt')}</p>
                  <label className="login-mfa-recovery-label" htmlFor="login-mfa-recovery">
                    {t('login.mfa.recoveryLabel')}
                  </label>
                  <input
                    id="login-mfa-recovery"
                    type="text"
                    autoComplete="one-time-code"
                    className="login-input login-mfa-recovery"
                    value={flow.mfaCode}
                    onChange={(e) => flow.setMfaCode(e.target.value)}
                    disabled={flow.loading}
                    spellCheck={false}
                  />
                </>
              )}

              {flow.mfaFactor === 'email' && (
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

              <button
                type="submit"
                className="login-button btn-fill-primary btn-block"
                disabled={
                  flow.loading ||
                  (flow.mfaFactor === 'totp' && flow.mfaCode.length < 6) ||
                  (flow.mfaFactor === 'recovery' && !flow.mfaCode.trim()) ||
                  (flow.mfaFactor === 'email' && flow.mfaCode.length < 8)
                }
              >
                {flow.loading ? t('login.mfa.verifying') : t('login.mfa.confirm')}
              </button>

              <div className="login-mfa-actions">
                {flow.mfaFactor === 'email' && (
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
                {flow.mfaMethods.includes('totp') ? (
                  <button
                    type="button"
                    className="login-mfa-back"
                    onClick={flow.backToMfaChooser}
                    disabled={flow.loading}
                  >
                    {t('login.mfa.chooseBack')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="login-mfa-back"
                    onClick={flow.backToCredentials}
                    disabled={flow.loading}
                  >
                    {t('login.mfa.back')}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

// tuf-search: #LoginPage #loginPage #account #login — Login
import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import './loginPage.css';

import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import ReCAPTCHA from '@/components/auth/ReCaptcha/ReCaptcha';
import { useLoginFlow } from './useLoginFlow';

const LoginPage = () => {
  const navigate = useNavigate();
  const { user, getOriginUrl } = useAuth();
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

  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleEmailLogin = async (e) => {
    const { completed } = await flow.submitCredentials(e);
    if (completed) {
      const from = getOriginUrl() || '/profile';
      navigate(from);
    }
  };

  // Future MFA step UI switches on flow.step === 'mfa'
  return (
    <div className="login-page-wrapper">
      <MetaTags {...pageMeta} />

      <div className="login-page">
        <div className="login-container">
          <h1>{t('login.header.title')}</h1>
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

              <div className="links">
                <Link to="/register" className="register-link">
                  {t('login.form.links.register')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

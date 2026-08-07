// tuf-search: #OAuthConsentPage #oauthConsent
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { MetaTags } from '@/components/common/display';
import { UserAvatar } from '@/components/layout';
import {
  CheckmarkIcon,
  ExternalLinkIcon,
  InfoIcon,
  LockIcon,
  ShieldIcon,
  TimeIcon,
} from '@/components/common/icons';
import LogoFullOutlineSVG from '@/assets/tuf-logo/LogoFullOutlined/LogoFullOutlined';
import { describeGrantableScopes } from '@/pages/developers/scopeCatalog';
import { userAvatarUrls } from '@/utils/playerAvatarDisplay';
import { navigateExternal } from '@/utils/externalNavigationGate';
import './oauthConsentPage.css';

function redirectDisplayTarget(uri) {
  if (!uri || typeof uri !== 'string') return '';
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
    return uri;
  } catch {
    return uri;
  }
}

const OAuthConsentPage = () => {
  const { t, i18n } = useTranslation('pages');
  const { user, loading: authLoading, logout, setOriginUrl } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(routes.oauth.consent());
      const payload = res.data;
      if (!payload?.client?.name) {
        setError(payload?.error || t('oauthConsent.loadError'));
        setInfo(null);
        return;
      }
      setInfo(payload);
    } catch (e) {
      setError(e?.response?.data?.error || t('oauthConsent.loadError'));
      setInfo(null);
    }
  }, [t]);

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user, load]);

  const approve = async () => {
    setBusy(true);
    try {
      const res = await api.post(routes.oauth.consentApprove());
      if (res.data?.redirectTo) {
        await navigateExternal(res.data.redirectTo);
        return;
      }
      setError(t('oauthConsent.approveError'));
    } catch (e) {
      setError(
        e?.response?.data?.error_description ||
          e?.response?.data?.error ||
          t('oauthConsent.approveError'),
      );
    } finally {
      setBusy(false);
    }
  };

  const deny = async () => {
    setBusy(true);
    try {
      const res = await api.post(routes.oauth.consentDeny());
      if (res.data?.redirectTo) {
        await navigateExternal(res.data.redirectTo);
        return;
      }
    } catch {
      // fall through
    } finally {
      setBusy(false);
    }
  };

  const switchAccount = async () => {
    setBusy(true);
    try {
      setOriginUrl('/oauth/consent');
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const redirectTarget = useMemo(
    () => redirectDisplayTarget(info?.redirectUri),
    [info?.redirectUri],
  );

  const activeSince = useMemo(() => {
    if (!info?.client?.createdAt) return null;
    try {
      return new Date(info.client.createdAt).toLocaleDateString(i18n.language, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  }, [info?.client?.createdAt, i18n.language]);

  const displayName = user?.nickname || user?.username || '';

  if (authLoading) {
    return (
      <div className="oauth-consent-page">
        <div className="loader loader-relative" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="oauth-consent-page">
        <MetaTags title={t('oauthConsent.meta.title')} noindex />
        <Link to="/" className="oauth-consent-page__brand">
          <LogoFullOutlineSVG 
             className="oauth-consent-page__logo" 
             strokeWidth="10" 
          />
        </Link>
        <div className="oauth-consent-page__card oauth-consent-page__card--narrow">
          <p className="oauth-consent-page__lede">{t('oauthConsent.needLogin')}</p>
          <Link to="/login" className="oauth-consent-page__btn oauth-consent-page__btn--approve">
            {t('oauthConsent.loginLink')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="oauth-consent-page">
      <MetaTags
        title={t('oauthConsent.meta.title')}
        description={t('oauthConsent.meta.description')}
        noindex
      />
      <Link to="/" className="oauth-consent-page__brand" aria-hidden>
        <LogoFullOutlineSVG 
             className="oauth-consent-page__logo" 
             strokeWidth="10" 
          />
      </Link>

      <div className="oauth-consent-page__card">
        {error && (
          <p className="oauth-consent-page__error" role="alert">
            {error}
          </p>
        )}

        {info?.client && (
          <>
            <div className="oauth-consent-page__connect">
              <div className="oauth-consent-page__connect-icons">
                {info.client.iconUrl ? (
                  <img
                    src={info.client.iconUrl}
                    alt=""
                    className="oauth-consent-page__party-icon"
                  />
                ) : (
                  <span className="oauth-consent-page__party-icon oauth-consent-page__party-icon--fallback">
                    {(info.client.name || '?').trim().charAt(0).toUpperCase() || '?'}
                  </span>
                )}
                <span className="oauth-consent-page__connect-dots" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <UserAvatar
                  {...userAvatarUrls(user)}
                  className="oauth-consent-page__party-icon oauth-consent-page__party-icon--user"
                />
              </div>

              <h1 className="oauth-consent-page__app-name">
                {info.client.name}
                {info.client.verified ? (
                  <span className="oauth-consent-page__verified" title={t('oauthConsent.verified')}>
                    ✓
                  </span>
                ) : null}
              </h1>
              <p className="oauth-consent-page__wants">{t('oauthConsent.wantsAccess')}</p>
              <p className="oauth-consent-page__signed-in">
                {t('oauthConsent.signedInAs')}{' '}
                <strong>{displayName}</strong>{' '}
                <button
                  type="button"
                  className="oauth-consent-page__switch"
                  onClick={switchAccount}
                  disabled={busy}
                >
                  {t('oauthConsent.notYou')}
                </button>
              </p>
            </div>

            <div className="oauth-consent-page__panel">
              <p className="oauth-consent-page__panel-title">
                {t('oauthConsent.allowDeveloper', { name: info.client.name })}
              </p>
              <ul className="oauth-consent-page__scopes">
                {describeGrantableScopes(info.scopeBits ?? 0).map((meta) => (
                  <li key={meta.key}>
                    <span className="oauth-consent-page__scope-check" aria-hidden>
                      <CheckmarkIcon size={12} color="currentColor" />
                    </span>
                    <span className="oauth-consent-page__scope-copy">
                      <span className="oauth-consent-page__scope-label">{meta.label}</span>
                      <span className="oauth-consent-page__scope-desc">{meta.description}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <ul className="oauth-consent-page__notes">
                {redirectTarget ? (
                  <li>
                    <span className="oauth-consent-page__note-icon" aria-hidden>
                      <ExternalLinkIcon size={14} color="currentColor" />
                    </span>
                    <span>
                      {t('oauthConsent.redirectOutside')}{' '}
                      <strong className="oauth-consent-page__mono">{redirectTarget}</strong>
                    </span>
                  </li>
                ) : null}
                <li>
                  <span className="oauth-consent-page__note-icon" aria-hidden>
                    <LockIcon size={14} color="currentColor" />
                  </span>
                  <span>
                    {info.client.privacyUrl ? (
                      <>
                        {t('oauthConsent.privacyWithLink')}{' '}
                        <a href={info.client.privacyUrl} target="_blank" rel="noreferrer">
                          {t('oauthConsent.privacyLink')}
                        </a>
                        . {t('oauthConsent.tufPrivacyPrefix')}{' '}
                        <Link to="/privacy-policy" target="_blank">
                          {t('oauthConsent.tufPrivacyLink')}
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        {t('oauthConsent.privacyNoAppPolicy')}{' '}
                        <Link to="/privacy-policy" target="_blank">
                          {t('oauthConsent.tufPrivacyLink')}
                        </Link>
                        .
                      </>
                    )}
                  </span>
                </li>
                {activeSince ? (
                  <li>
                    <span className="oauth-consent-page__note-icon" aria-hidden>
                      <TimeIcon size={14} color="currentColor" />
                    </span>
                    <span>{t('oauthConsent.activeSince', { date: activeSince })}</span>
                  </li>
                ) : null}
                {!info.client.verified && info.client.ownerUsername ? (
                  <li>
                    <span className="oauth-consent-page__note-icon" aria-hidden>
                      <InfoIcon size={14} color="currentColor" />
                    </span>
                    <span>
                      {t('oauthConsent.publisher')}: <strong>{info.client.ownerUsername}</strong>
                    </span>
                  </li>
                ) : null}
                <li>
                  <span className="oauth-consent-page__note-icon" aria-hidden>
                    <ShieldIcon size={14} color="currentColor" />
                  </span>
                  <span>{t('oauthConsent.scopeLimit')}</span>
                </li>
              </ul>
            </div>

            <div className="oauth-consent-page__actions">
              <button
                type="button"
                className="oauth-consent-page__btn oauth-consent-page__btn--deny"
                onClick={deny}
                disabled={busy}
              >
                {t('oauthConsent.deny')}
              </button>
              <button
                type="button"
                className="oauth-consent-page__btn oauth-consent-page__btn--approve"
                onClick={approve}
                disabled={busy}
              >
                {t('oauthConsent.approve')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthConsentPage;

// tuf-search: #TranslationsPage #translationsPage #translations
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MetaTags } from '@/components/common/display';
import { buildStaticPageMeta } from '@/utils/meta';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/utils/api';
import { routes } from '@/api/routes';
import './translationspage.css';

function normalizeContributors(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim());
}

function formatStatus(status, t) {
  if (status === 100) {
    return {
      label: t('translations.languages.status.implemented'),
      className: 'status-implemented',
    };
  }
  if (status > 0) {
    return {
      label: t('translations.languages.status.partial', {
        percent: Number(status).toFixed(2),
      }),
      className: 'status-pending',
    };
  }
  return {
    label: t('translations.languages.status.pending'),
    className: '',
  };
}

function formatVerifyResult(data, t) {
  if (data.isValid) {
    return { text: t('translations.results.valid'), className: 'success' };
  }

  const lines = [];

  if (data.missingFiles?.length > 0) {
    lines.push(t('translations.results.missingFiles'));
    lines.push(...data.missingFiles);
    lines.push('');
  }

  if (data.missingKeys && Object.keys(data.missingKeys).length > 0) {
    lines.push(t('translations.results.missingKeys'));
    for (const [file, keys] of Object.entries(data.missingKeys)) {
      lines.push('');
      lines.push(file + ':');
      lines.push(...keys);
    }
  }

  if (data.extraKeys && Object.keys(data.extraKeys).length > 0) {
    lines.push('');
    lines.push(t('translations.results.extraKeys'));
    for (const [file, keys] of Object.entries(data.extraKeys)) {
      lines.push('');
      lines.push(file + ':');
      lines.push(...keys);
    }
  }

  return { text: lines.join('\n'), className: 'error' };
}

const TranslationsPage = () => {
  const { t } = useTranslation('pages');
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, setOriginUrl } = useAuth();
  const [languages, setLanguages] = useState([]);
  const [file, setFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [result, setResult] = useState(null);

  const pageMeta = useMemo(
    () =>
      buildStaticPageMeta({
        title: t('translations.meta.title'),
        description: t('translations.meta.description'),
        pathname: location.pathname,
        image: '/og-image.jpg',
        type: 'website',
      }),
    [t, location.pathname],
  );

  const placeholderVars = useMemo(
    () => ({ open: '{{', close: '}}' }),
    [],
  );

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await api.get(routes.utils.languages());
        const data = response.data || {};
        const list = Object.entries(data).map(([code, info]) => ({
          code,
          display: info.display,
          folder: info.folder || code,
          status: Number(info.status) || 0,
          contributors: normalizeContributors(info.contributors),
        }));
        list.sort((a, b) => b.status - a.status || a.display.localeCompare(b.display));
        setLanguages(list);
      } catch (error) {
        console.error('Error fetching languages:', error);
        setLanguages([]);
      }
    };

    fetchLanguages();
  }, []);

  const handleLoginRedirect = () => {
    setOriginUrl(`${location.pathname}${location.search}${location.hash}`);
  };

  const redirectToLogin = () => {
    handleLoginRedirect();
    navigate('/login', { replace: true });
  };

  const handleDownload = async (langCode) => {
    setDownloading(langCode);
    try {
      const response = await api.get(routes.utils.downloadTranslations(langCode), {
        responseType: 'blob',
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${langCode}-translations.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      const message = error?.response?.data?.error || error.message || 'Unknown error';
      alert(t('translations.languages.downloadError', { message }));
    } finally {
      setDownloading(null);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    if (!file) return;

    setVerifying(true);
    setResult({ text: t('translations.verifier.verifying'), className: '' });

    try {
      const formData = new FormData();
      formData.append('translationZip', file);

      const response = await api.post(routes.utils.verifyTranslations(), formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(formatVerifyResult(response.data, t));
    } catch (error) {
      if (error?.response?.status === 401) {
        redirectToLogin();
        setResult(null);
        return;
      }

      const message =
        error?.response?.data?.details ||
        error?.response?.data?.error ||
        error.message ||
        'Failed to verify translations';
      setResult({
        text: t('translations.results.error', { message }),
        className: 'error',
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="translations-page">
      <MetaTags meta={pageMeta} />
      <div className="translations-page__container">
        <h1 className="translations-page__title">{t('translations.title')}</h1>

        <section className="translations-page__section">
          <h2>{t('translations.verifier.title')}</h2>
          <p>{t('translations.verifier.description')}</p>

          <div className="translations-page__format-note">
            <p>
              <strong>{t('translations.verifier.supportedFormats')}</strong>
            </p>
            <p>
              <strong>{t('translations.verifier.expectedStructure')}</strong>
            </p>
          </div>

          {!isAuthenticated ? (
            <div className="translations-page__login-gate">
              <p>{t('translations.verifier.loginRequired')}</p>
              <Link
                to="/login"
                className="translations-page__button"
                onClick={handleLoginRedirect}
              >
                {t('translations.verifier.loginCta')}
              </Link>
            </div>
          ) : (
            <form className="translations-page__upload-form" onSubmit={handleVerify}>
              <input
                type="file"
                accept=".zip,.7z,.rar,.tar,.gz"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="translations-page__button-group">
                <button
                  type="submit"
                  className="translations-page__button"
                  disabled={verifying || !file}
                >
                  {verifying
                    ? t('translations.verifier.verifying')
                    : t('translations.verifier.submit')}
                </button>
              </div>
            </form>
          )}

          {result && (
            <pre
              className={`translations-page__result ${result.className}`.trim()}
            >
              {result.text}
            </pre>
          )}

          <div className="translations-page__guide">
            <h3>{t('translations.guide.title')}</h3>
            <div className="translations-page__guide-steps">
              <div className="translations-page__step">
                <span className="translations-page__step-number">1</span>
                <h4>{t('translations.guide.steps.download.title')}</h4>
                <p>{t('translations.guide.steps.download.body')}</p>
              </div>

              <div className="translations-page__step">
                <span className="translations-page__step-number">2</span>
                <h4>{t('translations.guide.steps.extract.title')}</h4>
                <p>{t('translations.guide.steps.extract.body')}</p>
                <div className="translations-page__example">
                  <p>{t('translations.guide.steps.extract.basicExampleLabel')}</p>
                  <pre>{t('translations.guide.steps.extract.basicExample')}</pre>
                </div>
                <div className="translations-page__example">
                  <p>{t('translations.guide.steps.extract.placeholdersLabel')}</p>
                  <p>
                    {t('translations.guide.steps.extract.placeholdersBody', placeholderVars)}
                  </p>
                  <pre>
                    {t('translations.guide.steps.extract.placeholderExample', placeholderVars)}
                  </pre>
                  <p className="translations-page__example-note">
                    {t('translations.guide.steps.extract.placeholderWarning', placeholderVars)}
                  </p>
                </div>
              </div>

              <div className="translations-page__step">
                <span className="translations-page__step-number">3</span>
                <h4>{t('translations.guide.steps.verify.title')}</h4>
                <p>{t('translations.guide.steps.verify.body')}</p>
              </div>

              <div className="translations-page__step">
                <span className="translations-page__step-number">4</span>
                <h4>{t('translations.guide.steps.submit.title')}</h4>
                <p>{t('translations.guide.steps.submit.body')}</p>
              </div>
            </div>
          </div>

          <div className="translations-page__languages">
            <h3>{t('translations.languages.title')}</h3>
            <div className="translations-page__language-list">
              {languages.map((lang) => {
                const status = formatStatus(lang.status, t);
                return (
                  <div key={lang.code} className="translations-page__language-card">
                    <div className="translations-page__language-header">
                      <span className="translations-page__language-name">
                        {lang.display}
                      </span>
                      <span
                        className={`translations-page__language-status ${status.className}`.trim()}
                      >
                        {status.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="translations-page__button translations-page__download-button"
                      disabled={lang.status === 0 || downloading === lang.folder}
                      onClick={() => handleDownload(lang.folder)}
                    >
                      {downloading === lang.folder
                        ? t('translations.languages.preparing')
                        : t('translations.languages.download', {
                            display: lang.display,
                          })}
                    </button>
                    {lang.contributors.length > 0 && (
                      <div className="translations-page__language-contributors">
                        <span className="translations-page__language-contributors-label">
                          {t('translations.languages.contributors')}
                        </span>
                        <span className="translations-page__language-contributors-names">
                          {lang.contributors.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TranslationsPage;

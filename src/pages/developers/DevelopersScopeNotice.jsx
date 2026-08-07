// tuf-search: #DevelopersScopeNotice
import { Trans, useTranslation } from 'react-i18next';
import { OAUTH_SCOPE_EXPAND_DISCORD_URL } from '@/utils/oauthScopes';

/** Fixed public-only scope notice (v1 identity toolkit). */
const DevelopersScopeNotice = () => {
  const { t } = useTranslation('pages');

  return (
    <div className="developers-portal__scope-notice">
      <p className="developers-portal__scope-notice-title">{t('developers.scopes')}</p>
      <p className="developers-portal__muted">
        <Trans
          i18nKey="developers.scopesPublicOnly"
          ns="pages"
          components={{
            discord: (
              <a
                href={OAUTH_SCOPE_EXPAND_DISCORD_URL}
                target="_blank"
                rel="noreferrer"
              />
            ),
          }}
        />
      </p>
    </div>
  );
};

export default DevelopersScopeNotice;

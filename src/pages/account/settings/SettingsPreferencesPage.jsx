// tuf-search: #SettingsPreferencesPage #settingsPreferencesPage #preferences
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useMinimalMotionPreference } from '@/hooks/useMinimalMotionPreference';
import { useDisableMascotsPreference } from '@/hooks/useDisableMascotsPreference';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import './settingsSubPage.css';
import './settingsPreferencesPage.css';

/**
 * Preferences hub: category containers (e.g. Motion) host the specific options.
 * Add new sections as siblings — keep options nested inside their container.
 */
const SettingsPreferencesPage = () => {
  const { t } = useTranslation('pages');
  const { user, setUser } = useAuth();
  const [minimalMotion, setMinimalMotion] = useMinimalMotionPreference();
  const [disableMascots, setDisableMascots] = useDisableMascotsPreference();
  const [publicFollowsSaving, setPublicFollowsSaving] = useState(false);

  const publicFollows = user?.publicFollows !== false;

  const handleTogglePublicFollows = useCallback(
    async (next) => {
      if (publicFollowsSaving || !user) return;
      const previous = user.publicFollows !== false;
      setUser((prev) => (prev ? { ...prev, publicFollows: next } : prev));
      setPublicFollowsSaving(true);
      try {
        const { data } = await api.patch(routes.followsV3.mePublic(), {
          publicFollows: next,
        });
        setUser((prev) =>
          prev ? { ...prev, publicFollows: data?.publicFollows !== false } : prev,
        );
      } catch {
        setUser((prev) => (prev ? { ...prev, publicFollows: previous } : prev));
        toast.error(t('settings.preferences.privacy.publicFollows.error'));
      } finally {
        setPublicFollowsSaving(false);
      }
    },
    [publicFollowsSaving, setUser, t, user],
  );

  return (
    <div className="settings-sub-page settings-preferences-page">
      <h1 className="settings-sub-page__title">{t('settings.preferences.title')}</h1>
      <p className="settings-sub-page__text">{t('settings.preferences.subtitle')}</p>

      <section
        className="settings-preferences-page__section"
        aria-labelledby="settings-prefs-motion-heading"
      >
        <h2 id="settings-prefs-motion-heading" className="settings-preferences-page__section-title">
          {t('settings.preferences.motion.title')}
        </h2>

        <label className="settings-preferences-page__toggle">
          <input
            type="checkbox"
            checked={minimalMotion}
            onChange={(e) => setMinimalMotion(e.target.checked)}
          />
          <span className="settings-preferences-page__toggle-copy">
            <span className="settings-preferences-page__toggle-label">
              {t('settings.preferences.motion.submissionMinimalMotion.label')}
            </span>
            <span className="settings-preferences-page__toggle-desc">
              {t('settings.preferences.motion.submissionMinimalMotion.description')}
            </span>
          </span>
        </label>
      </section>

      <section
        className="settings-preferences-page__section"
        aria-labelledby="settings-prefs-display-heading"
      >
        <h2 id="settings-prefs-display-heading" className="settings-preferences-page__section-title">
          {t('settings.preferences.display.title')}
        </h2>

        <label className="settings-preferences-page__toggle">
          <input
            type="checkbox"
            checked={disableMascots}
            onChange={(e) => setDisableMascots(e.target.checked)}
          />
          <span className="settings-preferences-page__toggle-copy">
            <span className="settings-preferences-page__toggle-label">
              {t('settings.preferences.display.disableMascots.label')}
            </span>
            <span className="settings-preferences-page__toggle-desc">
              {t('settings.preferences.display.disableMascots.description')}
            </span>
          </span>
        </label>
      </section>

      <section
        className="settings-preferences-page__section"
        aria-labelledby="settings-prefs-privacy-heading"
      >
        <h2 id="settings-prefs-privacy-heading" className="settings-preferences-page__section-title">
          {t('settings.preferences.privacy.title')}
        </h2>

        <label className="settings-preferences-page__toggle">
          <input
            type="checkbox"
            checked={publicFollows}
            onChange={(e) => handleTogglePublicFollows(e.target.checked)}
            disabled={publicFollowsSaving || !user}
          />
          <span className="settings-preferences-page__toggle-copy">
            <span className="settings-preferences-page__toggle-label">
              {t('settings.preferences.privacy.publicFollows.label')}
            </span>
            <span className="settings-preferences-page__toggle-desc">
              {t('settings.preferences.privacy.publicFollows.description')}
            </span>
          </span>
        </label>
      </section>
    </div>
  );
};

export default SettingsPreferencesPage;

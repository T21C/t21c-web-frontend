// tuf-search: #SettingsPreferencesPage #settingsPreferencesPage #preferences
import { useTranslation } from 'react-i18next';
import { useMinimalMotionPreference } from '@/hooks/useMinimalMotionPreference';
import { useDisableMascotsPreference } from '@/hooks/useDisableMascotsPreference';
import './settingsSubPage.css';
import './settingsPreferencesPage.css';

/**
 * Preferences hub: category containers (e.g. Motion) host the specific options.
 * Add new sections as siblings — keep options nested inside their container.
 */
const SettingsPreferencesPage = () => {
  const { t } = useTranslation('pages');
  const [minimalMotion, setMinimalMotion] = useMinimalMotionPreference();
  const [disableMascots, setDisableMascots] = useDisableMascotsPreference();

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
    </div>
  );
};

export default SettingsPreferencesPage;

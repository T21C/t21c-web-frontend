// tuf-search: #SettingsPreferencesPage #settingsPreferencesPage #preferences
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CustomSelect } from '@/components/common/selectors';
import { useMinimalMotionPreference } from '@/hooks/useMinimalMotionPreference';
import { useDisableMascotsPreference } from '@/hooks/useDisableMascotsPreference';
import {
  NAV_DROPDOWN_CLICK_MODES,
  useNavDropdownClickModePreference,
} from '@/hooks/useNavDropdownClickModePreference';
import { useClientPreference } from '@/hooks/useClientPreference';
import { changeAppLanguage } from '@/translations/config';
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { isoToEmoji } from '@/utils';
import {
  DEFAULT_SITE_LANGUAGE_OPTIONS,
  languageCompletionLabel,
  normalizeSiteLanguageOptions,
  sortSiteLanguageEntries,
} from '@/utils/siteLanguageOptions';
import { routes } from '@/api/routes';
import api from '@/utils/api';
import './settingsSubPage.css';
import './settingsPreferencesPage.css';

const FOLLOW_COUNTRY_LANGUAGE = '__country';

/**
 * Preferences hub: category containers (e.g. Motion) host the specific options.
 * Add new sections as siblings — keep options nested inside their container.
 */
const SettingsPreferencesPage = () => {
  const { t } = useTranslation(['pages', 'components']);
  const { user, setUser } = useAuth();
  const [minimalMotion, setMinimalMotion] = useMinimalMotionPreference();
  const [disableMascots, setDisableMascots] = useDisableMascotsPreference();
  const [dropdownClickMode, setDropdownClickMode] = useNavDropdownClickModePreference();
  const [savedLanguage, setSavedLanguage] = useClientPreference(CLIENT_PREF_KEYS.APP_LANGUAGE, null);
  const [languages, setLanguages] = useState(DEFAULT_SITE_LANGUAGE_OPTIONS);
  const [publicFollowsSaving, setPublicFollowsSaving] = useState(false);

  useEffect(() => {
    const fetchLanguageStatus = async () => {
      try {
        const response = await api.get(routes.utils.languages());
        setLanguages(normalizeSiteLanguageOptions(response.data));
      } catch (error) {
        console.error('Error fetching language status:', error);
        setLanguages(DEFAULT_SITE_LANGUAGE_OPTIONS);
      }
    };

    fetchLanguageStatus();
  }, []);

  const suggestedLanguage = typeof user?.suggestedAppLanguage === 'string' && user.suggestedAppLanguage
    ? user.suggestedAppLanguage
    : 'en';

  const languageOptions = useMemo(() => {
    const suggestedDisplay = languages[suggestedLanguage]?.display || suggestedLanguage;
    return [
      {
        value: FOLLOW_COUNTRY_LANGUAGE,
        label: t('settings.preferences.language.followCountry', { language: suggestedDisplay }),
      },
      ...sortSiteLanguageEntries(languages).map(([code, { display, countryCode, status }]) => ({
        value: code,
        label: (
          <span className="settings-preferences-page__language-option">
            <img
              className="settings-preferences-page__language-flag"
              src={isoToEmoji(countryCode)}
              alt=""
            />
            <span>{display}</span>
            <span className="settings-preferences-page__language-status">
              {languageCompletionLabel(status, t)}
            </span>
          </span>
        ),
        isDisabled: status === 0,
      })),
    ];
  }, [languages, suggestedLanguage, t]);

  const selectedLanguageValue = typeof savedLanguage === 'string' && savedLanguage
    ? savedLanguage
    : FOLLOW_COUNTRY_LANGUAGE;

  const selectedLanguageOption = languageOptions.find((option) => option.value === selectedLanguageValue)
    || languageOptions[0];

  const handleLanguageChange = useCallback((option) => {
    if (!option) return;
    if (option.value === FOLLOW_COUNTRY_LANGUAGE) {
      setSavedLanguage(null);
      void changeAppLanguage(suggestedLanguage, { persist: false });
      return;
    }
    if (!languages[option.value] || languages[option.value].status === 0) return;
    void changeAppLanguage(option.value);
  }, [languages, setSavedLanguage, suggestedLanguage]);

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
        aria-labelledby="settings-prefs-language-heading"
      >
        <h2 id="settings-prefs-language-heading" className="settings-preferences-page__section-title">
          {t('settings.preferences.language.title')}
        </h2>
        <p className="settings-preferences-page__toggle-desc">
          {t('settings.preferences.language.description')}
        </p>
        <CustomSelect
          label={t('settings.preferences.language.label')}
          options={languageOptions}
          value={selectedLanguageOption}
          onChange={handleLanguageChange}
          width="100%"
        />
      </section>

      <section
        className="settings-preferences-page__section"
        aria-labelledby="settings-prefs-navigation-heading"
      >
        <h2 id="settings-prefs-navigation-heading" className="settings-preferences-page__section-title">
          {t('settings.preferences.navigation.title')}
        </h2>

        <fieldset className="settings-preferences-page__radio-group">
          <legend className="settings-preferences-page__legend">
            {t('settings.preferences.navigation.dropdownClickMode.legend')}
          </legend>
          {NAV_DROPDOWN_CLICK_MODES.map((mode) => (
            <label key={mode} className="settings-preferences-page__toggle">
              <input
                type="radio"
                name="settings-nav-dropdown-click-mode"
                value={mode}
                checked={dropdownClickMode === mode}
                onChange={() => setDropdownClickMode(mode)}
              />
              <span className="settings-preferences-page__toggle-copy">
                <span className="settings-preferences-page__toggle-label">
                  {t(`settings.preferences.navigation.dropdownClickMode.${mode}.label`)}
                </span>
                <span className="settings-preferences-page__toggle-desc">
                  {t(`settings.preferences.navigation.dropdownClickMode.${mode}.description`)}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

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

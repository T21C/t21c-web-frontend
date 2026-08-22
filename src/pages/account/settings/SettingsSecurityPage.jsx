// tuf-search: #SettingsSecurityPage #settingsSecurityPage #account #settings
import { routes } from '@/api/routes';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DiscordIcon, GoogleIcon, UnlinkIcon } from '@/components/common/icons';
import { Tooltip } from 'react-tooltip';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { useElevation } from '@/contexts/ElevationContext';
import { useTranslation } from 'react-i18next';
import './settingsSubPage.css';
import './settingsSecurityPage.css';

const LINKABLE_PROVIDERS = [
  { id: 'discord', showProviderId: true, linkClass: 'link-button btn-fill-discord' },
  { id: 'google', showProviderId: false, linkClass: 'link-button google-link-button' },
];

const ProviderIcon = ({ provider, size, color = '#fff' }) => {
  switch (provider) {
    case 'discord':
      return <DiscordIcon size={size} color={color} />;
    case 'google':
      return <GoogleIcon size={size} />;
    default:
      return null;
  }
};

const SettingsSecurityPage = () => {
  const { t } = useTranslation(['pages', 'common']);
  const {
    user,
    changePassword,
    linkProvider,
    unlinkProvider,
    fetchUser,
    registerPasskey,
  } = useAuth();
  const { requireElevation } = useElevation();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const hasNoPassword = user?.password === null;

  const [passkeys, setPasskeys] = useState([]);
  const [passkeysLoading, setPasskeysLoading] = useState(true);
  const [passkeyBusyId, setPasskeyBusyId] = useState(null);
  const passkeysSupported =
    typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';

  const [isDeletionBusy, setIsDeletionBusy] = useState(false);
  const [deletionIncludeCreator, setDeletionIncludeCreator] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError(t('editProfile.error.newPasswordsDoNotMatch'));
      return;
    }

    try {
      await requireElevation('security', () =>
        changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      );
      setSuccess(t('editProfile.success.passwordChanged'));
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setIsChangingPassword(false);
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        t('editProfile.error.failedToChangePassword');
      setError(msg);
    }
  };

  const loadPasskeys = useCallback(async () => {
    setPasskeysLoading(true);
    try {
      const res = await api.get(routes.auth.passkeys.list());
      setPasskeys(Array.isArray(res.data?.passkeys) ? res.data.passkeys : []);
    } catch (err) {
      console.error('Failed to load passkeys:', err);
      setPasskeys([]);
    } finally {
      setPasskeysLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPasskeys();
  }, [loadPasskeys]);

  const formatPasskeyDate = (value) => {
    if (!value) return t('editProfile.passkeys.never');
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return t('editProfile.passkeys.never');
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  const handleAddPasskey = async () => {
    try {
      const data = await requireElevation('security', () => registerPasskey());
      if (data?.cancelled) return;
      toast.success(t('editProfile.passkeys.addSuccess'));
      await loadPasskeys();
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      toast.error(
        err?.response?.data?.message || err?.message || t('editProfile.passkeys.addError'),
      );
    }
  };

  const handleRenamePasskey = async (passkey) => {
    const next = window.prompt(t('editProfile.passkeys.renamePrompt'), passkey.name);
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === passkey.name) return;
    setPasskeyBusyId(passkey.id);
    try {
      await api.patch(routes.auth.passkeys.byId(passkey.id), { name: trimmed });
      await loadPasskeys();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || err?.message || t('editProfile.passkeys.addError'),
      );
    } finally {
      setPasskeyBusyId(null);
    }
  };

  const handleDeletePasskey = async (passkey) => {
    if (!window.confirm(t('editProfile.passkeys.deleteConfirm', { name: passkey.name }))) {
      return;
    }
    setPasskeyBusyId(passkey.id);
    try {
      await requireElevation('security', () =>
        api.delete(routes.auth.passkeys.byId(passkey.id)),
      );
      toast.success(t('editProfile.passkeys.deleteSuccess'));
      await loadPasskeys();
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      toast.error(
        err?.response?.data?.message || err?.message || t('editProfile.passkeys.deleteError'),
      );
    } finally {
      setPasskeyBusyId(null);
    }
  };

  const handleProviderLink = async (provider) => {
    try {
      setError('');
      setSuccess('');
      await linkProvider(provider);
      setSuccess(t('editProfile.success.accountLinked', { provider }));
    } catch (err) {
      setError(
        err.response?.data?.error || t('editProfile.error.failedToLinkAccount', { provider }),
      );
    }
  };

  const handleProviderUnlink = async (provider) => {
    try {
      await requireElevation('security', () => unlinkProvider(provider));
      setSuccess(t('editProfile.success.accountUnlinked', { provider }));
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          t('editProfile.error.failedToUnlinkAccount', { provider }),
      );
    }
  };

  const isLastProvider = user?.password === null && user?.providers?.length === 1;

  const hasPendingDeletion = Boolean(user?.deletionExecuteAt && user?.deletionScheduledAt);

  const formatDeletionInstant = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
  };

  const handleScheduleAccountDeletion = async () => {
    if (!window.confirm(t('editProfile.dangerZone.confirmDelete'))) return;
    setIsDeletionBusy(true);
    try {
      await requireElevation('security', () =>
        api.post(`${routes.auth.profile.root()}/me/delete`, {
          deletionIncludeCreator:
            Boolean(user?.creatorId) && Boolean(deletionIncludeCreator),
        }),
      );
      await fetchUser(true);
      setDeletionIncludeCreator(false);
      toast.success(t('editProfile.dangerZone.successScheduled'));
    } catch (err) {
      if (err?.code === 'ELEVATION_CANCELLED') return;
      toast.error(
        err.response?.data?.error ||
          err.response?.data?.message ||
          t('editProfile.dangerZone.errorSchedule'),
      );
    } finally {
      setIsDeletionBusy(false);
    }
  };

  const handleCancelAccountDeletion = async () => {
    if (!window.confirm(t('editProfile.dangerZone.confirmCancel'))) return;
    setIsDeletionBusy(true);
    try {
      await api.post(`${routes.auth.profile.root()}/me/delete/cancel`);
      await fetchUser(true);
      toast.success(t('editProfile.dangerZone.successCanceled'));
    } catch (err) {
      toast.error(
        err.response?.data?.error || t('editProfile.dangerZone.errorCancel'),
      );
    } finally {
      setIsDeletionBusy(false);
    }
  };

  const addPasswordUnchanged = useMemo(
    () => !formData.newPassword.trim() && !formData.confirmPassword.trim(),
    [formData.newPassword, formData.confirmPassword],
  );

  const changePasswordUnchanged = useMemo(
    () =>
      !formData.currentPassword.trim() &&
      !formData.newPassword.trim() &&
      !formData.confirmPassword.trim(),
    [formData.currentPassword, formData.newPassword, formData.confirmPassword],
  );

  return (
    <div className="settings-sub-page settings-security-page page-content-600">
      <h2 className="settings-sub-page__title">{t('settings.security.title')}</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="settings-security-page__section">
        <h3 className="settings-security-page__section-title">
          {hasNoPassword
            ? t('editProfile.password.addPassword')
            : t('editProfile.password.title')}
        </h3>
        {hasNoPassword ? (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="security-newPassword">{t('editProfile.password.newPassword')}</label>
              <input
                className="input-field"
                type="password"
                id="security-newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="security-confirmPassword">
                {t('editProfile.password.confirmPassword')}
              </label>
              <input
                className="input-field"
                type="password"
                id="security-confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <button
              type="submit"
              className="save-button btn-fill-primary"
              disabled={addPasswordUnchanged}
            >
              {t('editProfile.password.createPassword')}
            </button>
          </form>
        ) : !isChangingPassword ? (
          <button
            type="button"
            className="change-password-button btn-fill-secondary"
            onClick={() => setIsChangingPassword(true)}
          >
            {t('editProfile.password.changePassword')}
          </button>
        ) : (
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label htmlFor="security-currentPassword">
                {t('editProfile.password.currentPassword')}
              </label>
              <input
                className="input-field"
                type="password"
                id="security-currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="security-newPassword-change">
                {t('editProfile.password.newPassword')}
              </label>
              <input
                className="input-field"
                type="password"
                id="security-newPassword-change"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="security-confirmPassword-change">
                {t('editProfile.password.confirmNewPassword')}
              </label>
              <input
                className="input-field"
                type="password"
                id="security-confirmPassword-change"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            <button
              type="submit"
              className="save-button btn-fill-primary"
              disabled={changePasswordUnchanged}
            >
              {t('editProfile.password.updatePassword')}
            </button>
            <button
              type="button"
              className="change-password-button btn-fill-secondary"
              onClick={() => setIsChangingPassword(false)}
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
          </form>
        )}
      </div>

      <div className="settings-security-page__section">
        <h3 className="settings-security-page__section-title">
          {t('editProfile.passkeys.title')}
        </h3>
        <p className="passkeys-subtitle">{t('editProfile.passkeys.subtitle')}</p>
        {passkeysLoading ? (
          <p className="passkeys-empty">
            {t('loading.loading', { ns: 'common', defaultValue: 'Loading…' })}
          </p>
        ) : passkeys.length === 0 ? (
          <p className="passkeys-empty">{t('editProfile.passkeys.empty')}</p>
        ) : (
          <ul className="passkeys-list">
            {passkeys.map((passkey) => (
              <li key={passkey.id} className="passkeys-row">
                <div className="passkeys-row-main">
                  <div className="passkeys-row-title">
                    <span className="passkeys-name">{passkey.name}</span>
                    {passkey.backedUp ? (
                      <span className="passkeys-badge">{t('editProfile.passkeys.synced')}</span>
                    ) : null}
                  </div>
                  <div className="passkeys-meta">
                    <span>
                      {t('editProfile.passkeys.added')}: {formatPasskeyDate(passkey.createdAt)}
                    </span>
                    <span>
                      {t('editProfile.passkeys.lastUsed')}: {formatPasskeyDate(passkey.lastUsedAt)}
                    </span>
                  </div>
                </div>
                <div className="passkeys-row-actions">
                  <button
                    type="button"
                    className="settings-sub-page__btn btn-fill-secondary"
                    onClick={() => handleRenamePasskey(passkey)}
                    disabled={passkeyBusyId === passkey.id}
                  >
                    {t('editProfile.passkeys.rename')}
                  </button>
                  <button
                    type="button"
                    className="settings-sub-page__btn btn-fill-danger"
                    onClick={() => handleDeletePasskey(passkey)}
                    disabled={passkeyBusyId === passkey.id}
                  >
                    {t('editProfile.passkeys.delete')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {passkeysSupported ? (
          <button
            type="button"
            className="change-password-button btn-fill-secondary"
            onClick={handleAddPasskey}
          >
            {t('editProfile.passkeys.add')}
          </button>
        ) : (
          <p className="passkeys-empty">{t('editProfile.passkeys.unsupported')}</p>
        )}
      </div>

      <div className="settings-security-page__section">
        <h3 className="settings-security-page__section-title">
          {t('editProfile.linkedAccounts.title')}
        </h3>
        <div className="linked-accounts">
          {LINKABLE_PROVIDERS.map((item) => {
            const linked = user?.providers?.find((p) => p.name === item.id);
            if (linked) {
              return (
                <div className="provider-info" key={item.id}>
                  <div className="provider-details-column">
                    <div className="provider-details">
                      <ProviderIcon provider={item.id} size={32} />
                      <span>{t(`editProfile.linkedAccounts.${item.id}`)}</span>
                    </div>
                    {item.showProviderId &&
                      linked.providerId != null &&
                      linked.providerId !== '' && (
                        <span
                          className="provider-id-line"
                          title={t('editProfile.linkedAccounts.providerIdHint')}
                        >
                          {t('editProfile.linkedAccounts.providerId', {
                            id: String(linked.providerId),
                          })}
                        </span>
                      )}
                  </div>
                  <div className="unlink-container">
                    <button
                      type="button"
                      className={`unlink-button btn-fill-danger ${isLastProvider ? 'disabled' : ''}`}
                      onClick={() => handleProviderUnlink(item.id)}
                      disabled={isLastProvider}
                      data-tooltip-id="security-unlink-tooltip"
                      data-tooltip-content={
                        isLastProvider
                          ? t('editProfile.linkedAccounts.cannotUnlinkLastProvider')
                          : undefined
                      }
                    >
                      {t('editProfile.linkedAccounts.unlink')}
                      <UnlinkIcon color="#fff" size="24px" />
                    </button>
                    <Tooltip id="security-unlink-tooltip" />
                  </div>
                </div>
              );
            }
            return (
              <button
                type="button"
                key={item.id}
                className={item.linkClass}
                onClick={() => handleProviderLink(item.id)}
              >
                <ProviderIcon provider={item.id} size={16} />
                {t(`editProfile.linkedAccounts.link${item.id === 'discord' ? 'Discord' : 'Google'}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-security-page__section">
        <div className="danger-zone">
          <h3>{t('editProfile.dangerZone.title')}</h3>
          <p className="danger-zone__description">{t('editProfile.dangerZone.description')}</p>
          {hasPendingDeletion ? (
            <div className="danger-zone__pending">
              <p className="danger-zone__pending-title">{t('editProfile.dangerZone.pendingTitle')}</p>
              <ul className="danger-zone__dates">
                <li>
                  {t('editProfile.dangerZone.scheduledAt', {
                    date: formatDeletionInstant(user.deletionScheduledAt),
                  })}
                </li>
                <li>
                  {t('editProfile.dangerZone.executesAt', {
                    date: formatDeletionInstant(user.deletionExecuteAt),
                  })}
                </li>
                {user.deletionIncludeCreator ? (
                  <li className="danger-zone__dates-note">
                    {t('editProfile.dangerZone.pendingIncludesCreator')}
                  </li>
                ) : null}
              </ul>
              <div className="danger-zone__actions">
                <button
                  type="button"
                  className="button danger-zone__button danger-zone__button--secondary btn-fill-neutral-heavy"
                  onClick={handleCancelAccountDeletion}
                  disabled={isDeletionBusy}
                >
                  {isDeletionBusy
                    ? t('editProfile.dangerZone.canceling')
                    : t('editProfile.dangerZone.cancelButton')}
                </button>
              </div>
            </div>
          ) : (
            <div className="danger-zone__schedule-block">
              {user?.creatorId ? (
                <label className="danger-zone__include-creator">
                  <input
                    type="checkbox"
                    checked={deletionIncludeCreator}
                    onChange={(e) => setDeletionIncludeCreator(e.target.checked)}
                    disabled={isDeletionBusy}
                  />
                  <span>{t('editProfile.dangerZone.includeCreatorCheckbox')}</span>
                </label>
              ) : null}
              <div className="danger-zone__actions">
                <button
                  type="button"
                  className="button danger-zone__button danger-zone__button--destructive btn-fill-danger"
                  onClick={handleScheduleAccountDeletion}
                  disabled={isDeletionBusy}
                >
                  {isDeletionBusy
                    ? t('editProfile.dangerZone.scheduling')
                    : t('editProfile.dangerZone.deleteButton')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsSecurityPage;

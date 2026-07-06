// tuf-search: #AccountStatusBanners #accountStatusBanners #account
import { useTranslation } from 'react-i18next';
import { hasFlag, permissionFlags } from '@/utils/UserPermissions';
import { hasAccountEmail } from '@/utils/accountEmail';
import { StatusBanner } from '@/components/common/display/StatusBanner/StatusBanner';

const formatDeletionInstant = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
};

/**
 * Account status ribbons for profile (own) and edit profile.
 * Pending deletion takes priority over ban during grace.
 */
export function AccountStatusBanners({ variant = 'edit', user, navigate }) {
  const { t } = useTranslation('pages');
  if (!user) return null;

  const hasPendingDeletion = Boolean(user.deletionExecuteAt && user.deletionScheduledAt);

  if (hasPendingDeletion) {
    const withCreator = Boolean(user.deletionIncludeCreator);
    return (
      <StatusBanner dismissible tone="warning" placement="dock" role="status">
        {withCreator
          ? t('profile.accountScheduledDeletionWithCreator', {
              date: formatDeletionInstant(user.deletionExecuteAt),
            })
          : t('profile.accountScheduledDeletion', {
              date: formatDeletionInstant(user.deletionExecuteAt),
            })}
      </StatusBanner>
    );
  }

  if (hasFlag(user, permissionFlags.BANNED)) {
    return (
      <StatusBanner dismissible tone="danger" placement="dock" role="status">
        {t('profile.banned')}
      </StatusBanner>
    );
  }

  if (hasFlag(user, permissionFlags.SUBMISSIONS_PAUSED)) {
    return (
      <StatusBanner dismissible tone="caution" placement="dock" role="status">
        {t('profile.submissionSuspended')}
      </StatusBanner>
    );
  }

  if (!hasAccountEmail(user)) {
    return (
      <StatusBanner
        tone="accent"
        placement="dock"
        interactive
        onClick={() => navigate?.('/settings/account')}
        role="button"
      >
        {t('profile.emailMissing')}
        <span className="status-banner__arrow" aria-hidden>
          ➔
        </span>
      </StatusBanner>
    );
  }

  if (!hasFlag(user, permissionFlags.EMAIL_VERIFIED)) {
    return (
      <StatusBanner
        tone="accent"
        placement="dock"
        interactive
        onClick={() => navigate?.('/profile/verify-email')}
        role="button"
      >
        {t('profile.emailVerification')}
        <span className="status-banner__arrow" aria-hidden>
          ➔
        </span>
      </StatusBanner>
    );
  }

  return null;
}

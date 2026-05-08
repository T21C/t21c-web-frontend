// tuf-search: #StatusBanner #statusBanner #display
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseButton } from '@/components/common/buttons';
import './statusBanner.css';

const placementClass = (placement) =>
  placement === 'default' ? 'status-banner-slot' : `status-banner-slot status-banner-slot--${placement}`;

/**
 * Full-width ribbon status strip.
 *
 * `tone`: danger | dangerGradient | neutral | muted | warning | caution | accent
 * `placement` (slot layout):
 * - default — minimal wrapper, full width
 * - content — align to main content column (--content-max-width)
 * - centered — horizontally centered block (narrow danger/muted variants)
 * - dock — pin to top of a positioned ancestor (e.g. profile shell)
 * - stack — full width with bottom margin (e.g. above a form column)
 *
 * Pass `icon` for a leading graphic (SVG or icon component).
 * Pass `dismissible` to show a dismiss control; optional `onDismiss` runs after hide.
 */
export function StatusBanner({
  tone = 'danger',
  placement = 'default',
  icon = null,
  children,
  interactive = false,
  onClick,
  dismissible = false,
  onDismiss,
  dismissAriaLabel,
  className = '',
  slotClassName = '',
  role,
  tabIndex,
  ...props
}) {
  const { t } = useTranslation('common');
  const [userDismissed, setUserDismissed] = useState(false);

  const dismissLabel = dismissAriaLabel ?? t('buttons.close');

  const handleDismissClick = useCallback(
    (e) => {
      e.stopPropagation();
      setUserDismissed(true);
      onDismiss?.(e);
    },
    [onDismiss],
  );

  const slotClasses = [placementClass(placement), slotClassName].filter(Boolean).join(' ');
  const bannerClasses = [
    'status-banner',
    `status-banner--tone-${tone}`,
    interactive && 'status-banner--interactive',
    dismissible && 'status-banner--dismissible',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const mainContent = (
    <>
      {icon != null ? <span className="status-banner__icon">{icon}</span> : null}
      <span className="status-banner__label">{children}</span>
    </>
  );

  const dismissControl =
    dismissible ? (
      <CloseButton
        type="button"
        variant="floating"
        placement="top-end"
        size="sm"
        className="status-banner__dismiss"
        style={{ top: 'unset' }}
        aria-label={dismissLabel}
        onClick={handleDismissClick}
      />
    ) : null;

  const innerContent = dismissible ? (
    <>
      <div className="status-banner__main">{mainContent}</div>
      {dismissControl}
    </>
  ) : (
    mainContent
  );

  const handleKeyDown = (e) => {
    if (!interactive || !onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

  if (userDismissed && dismissible) {
    return null;
  }

  if (interactive && onClick) {
    return (
      <div className={slotClasses}>
        <div
          {...props}
          className={bannerClasses}
          role={role ?? 'button'}
          tabIndex={tabIndex ?? 0}
          onClick={onClick}
          onKeyDown={handleKeyDown}
        >
          {innerContent}
        </div>
      </div>
    );
  }

  return (
    <div className={slotClasses}>
      <div className={bannerClasses} role={role ?? 'status'} {...props}>
        {innerContent}
      </div>
    </div>
  );
}

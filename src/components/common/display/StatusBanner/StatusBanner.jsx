// tuf-search: #StatusBanner #statusBanner #display
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
 */
export function StatusBanner({
  tone = 'danger',
  placement = 'default',
  icon = null,
  children,
  interactive = false,
  onClick,
  className = '',
  slotClassName = '',
  role,
  tabIndex,
  ...props
}) {
  const slotClasses = [placementClass(placement), slotClassName].filter(Boolean).join(' ');
  const bannerClasses = [
    'status-banner',
    `status-banner--tone-${tone}`,
    interactive && 'status-banner--interactive',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon != null ? <span className="status-banner__icon">{icon}</span> : null}
      <span className="status-banner__label">{children}</span>
    </>
  );

  const handleKeyDown = (e) => {
    if (!interactive || !onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  };

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
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={slotClasses}>
      <div className={bannerClasses} role={role ?? 'status'} {...props}>
        {content}
      </div>
    </div>
  );
}

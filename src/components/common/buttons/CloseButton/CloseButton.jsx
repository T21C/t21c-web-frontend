// tuf-search: #CloseButton #closeButton #buttons
import { CrossIcon } from '@/components/common/icons';
import './closebutton.css';

const SIZE_PX = { sm: 16, md: 20, lg: 24 };

/**
 * Dismiss control with CrossIcon. Pass aria-label from i18n at call sites.
 * variant="floating": absolutely positioned in a corner; the containing block must be position: relative (or fixed/sticky as appropriate).
 */
export default function CloseButton({
  onClick,
  'aria-label': ariaLabel,
  variant = 'inline',
  placement = 'top-end',
  inset,
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
  ...rest
}) {
  const iconPx = typeof size === 'number' ? size : SIZE_PX[size] ?? SIZE_PX.md;

  const classes = [
    'tuf-close-button',
    `tuf-close-button--${variant}`,
    variant === 'floating' ? `tuf-close-button--placement-${placement}` : '',
    typeof size === 'string' ? `tuf-close-button--size-${size}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const placementStyle =
    variant === 'floating' && inset && typeof inset === 'object'
      ? {
          ...(['top', 'right', 'bottom', 'left'].reduce((acc, key) => {
            if (inset[key] != null) acc[key] = inset[key];
            return acc;
          }, {})),
        }
      : undefined;

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      style={placementStyle}
      {...rest}
    >
      <span className="tuf-close-button__icon" aria-hidden>
        <CrossIcon color="currentColor" size={iconPx} />
      </span>
    </button>
  );
}

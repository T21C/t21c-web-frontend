// tuf-search: #ExternalLink #linkConfirm
import { navigateExternal } from '@/utils/externalNavigationGate';

/**
 * Anchor for absolute http(s) URLs. Prefer this over raw <a href="https://...">
 * so ESLint `tuf/no-ungated-external-navigation` stays clean; navigation still
 * goes through the exit-warning gate (approved hosts skip the modal).
 */
export function ExternalLink({
  href,
  children,
  className,
  target = '_blank',
  rel = 'noopener noreferrer',
  onClick,
  ...rest
}) {
  return (
    <a
      href={href}
      className={className}
      target={target}
      rel={rel}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        void navigateExternal(href, { newTab: target === '_blank' });
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

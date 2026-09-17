// tuf-search: #DevelopersAppIcon
// tuf-search: #DevelopersAppIcon
import { ICON_SIZE, selectIconSize } from '@/utils/Utility';

/**
 * @param {{ name?: string, iconUrl?: string | null, size?: 'sm' | 'md' | 'lg', className?: string }} props
 */
const DevelopersAppIcon = ({ name = '?', iconUrl, size = 'md', className = '' }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const sizeClass =
    size === 'lg'
      ? 'developers-portal__app-icon--lg'
      : size === 'sm'
        ? 'developers-portal__app-icon--sm'
        : 'developers-portal__app-icon--md';

  if (iconUrl) {
    return (
      <img
        src={size === 'sm' ? selectIconSize(iconUrl, ICON_SIZE.SMALL) : selectIconSize(iconUrl, ICON_SIZE.MEDIUM)}
        alt=""
        className={`developers-portal__app-icon ${sizeClass} ${className}`.trim()}
      />
    );
  }

  return (
    <span
      className={`developers-portal__app-icon developers-portal__app-icon--fallback ${sizeClass} ${className}`.trim()}
      aria-hidden
    >
      {initial}
    </span>
  );
};

export default DevelopersAppIcon;

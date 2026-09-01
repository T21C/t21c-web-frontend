// tuf-search: #StartGuideCta #startGuideCta #display
import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CLIENT_PREF_KEYS } from '@/utils/clientPreferences';
import { useClientPreference } from '@/hooks/useClientPreference';
import adofaiTufStartIcon from '@/assets/icons/ADOFAI_TUF_START_ICON.png';
import './StartGuideCta.css';

const DEFAULT_TO = '/resources';
const DEFAULT_APPEAR_FROM = 'right';
const DEFAULT_DELAY = 1;
const DEFAULT_DURATION = 0.75;

export default function StartGuideCta({
  title,
  subtitle,
  dismissLabel,
  iconAlt,
  to = DEFAULT_TO,
  icon = adofaiTufStartIcon,
  dismissPreferenceKey = CLIENT_PREF_KEYS.HOME_RESOURCES_CTA_DISMISSED,
  appearFrom = DEFAULT_APPEAR_FROM,
  appearDelay = DEFAULT_DELAY,
  appearDuration = DEFAULT_DURATION,
  className = '',
}) {
  const [dismissed, setDismissed] = useClientPreference(dismissPreferenceKey, false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  if (dismissed) return null;

  const fromX = appearFrom === 'left' ? '-1rem' : '1rem';
  const classes = ['tuf-start-guide-cta', className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{
        '--tuf-start-guide-cta-delay': `${appearDelay}s`,
        '--tuf-start-guide-cta-duration': `${appearDuration}s`,
        '--tuf-start-guide-cta-from-x': fromX,
      }}
    >
      <Link to={to} className="tuf-start-guide-cta__link">
        <img src={icon} alt={iconAlt} className="tuf-start-guide-cta__icon" />
        <span className="tuf-start-guide-cta__text">
          <span className="tuf-start-guide-cta__title">{title}</span>
          <span className="tuf-start-guide-cta__subtitle">{subtitle}</span>
        </span>
      </Link>
      <button
        type="button"
        className="tuf-start-guide-cta__dismiss"
        onClick={handleDismiss}
      >
        {dismissLabel}
      </button>
    </div>
  );
}

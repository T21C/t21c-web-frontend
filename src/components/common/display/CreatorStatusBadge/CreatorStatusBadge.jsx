// tuf-search: #CreatorStatusBadge #creatorStatusBadge #display
import React from 'react';
import { useTranslation } from 'react-i18next';
import './creatorStatusBadge.css';

const VALID_STATUSES = new Set(['declined', 'pending', 'conditional', 'allowed']);

export const CreatorStatusBadge = ({
  status,
  showLabel = true,
  className = '',
  size = 'medium',
}) => {
  const { t } = useTranslation('common');
  const normalized = VALID_STATUSES.has(status) ? status : 'pending';
  const label = t(`verification.${normalized}`, { defaultValue: normalized });

  return (
    <span
      className={[
        'creator-status-badge',
        `creator-status-badge--${normalized}`,
        `creator-status-badge--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={label}
      data-status={normalized}
    >
      <span className="creator-status-badge__dot" aria-hidden="true" />
      {showLabel && <span className="creator-status-badge__label">{label}</span>}
    </span>
  );
};

export default CreatorStatusBadge;

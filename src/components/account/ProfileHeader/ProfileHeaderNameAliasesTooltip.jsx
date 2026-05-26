import PropTypes from 'prop-types';
import { Tooltip } from 'react-tooltip';
import { useTranslation } from 'react-i18next';

/**
 * Name hover tooltip: current display name, optional "a.k.a." alias list.
 */
const ProfileHeaderNameAliasesTooltip = ({
  tooltipId,
  displayName,
  aliasNames = [],
  place = 'bottom-start',
  className = '',
  style,
}) => {
  const { t } = useTranslation('pages');
  const nameText = displayName == null ? '' : String(displayName).trim();
  if (!tooltipId || !nameText) return null;

  const aliases = Array.isArray(aliasNames) ? aliasNames.filter(Boolean) : [];

  return (
    <Tooltip
      id={tooltipId}
      place={place}
      noArrow
      className={className}
      style={{
        maxWidth: 'min(24rem, 92vw)',
        zIndex: 20,
        marginTop: '-0.5rem',
        ...style,
      }}
    >
      <div className="profile-header__name-tooltip">
        <div className="profile-header__name-tooltip-display">{nameText}</div>
        {aliases.length > 0 ? (
          <div className="profile-header__name-tooltip-aka">
            <div className="profile-header__name-tooltip-aka-label">{t('profile.header.aka')}</div>
            <ul className="profile-header__name-tooltip-aka-list">
              {aliases.map((alias) => (
                <li key={alias} className="profile-header__name-tooltip-aka-item">
                  {alias}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Tooltip>
  );
};

ProfileHeaderNameAliasesTooltip.propTypes = {
  tooltipId: PropTypes.string.isRequired,
  displayName: PropTypes.string,
  aliasNames: PropTypes.arrayOf(PropTypes.string),
  place: PropTypes.string,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default ProfileHeaderNameAliasesTooltip;

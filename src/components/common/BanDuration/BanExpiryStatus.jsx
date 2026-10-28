import PropTypes from 'prop-types';
import { formatBanInstant } from './banDuration';

const BanExpiryStatus = ({ until, untilText, permanentText, className }) => (
  <p className={className}>
    {until ? untilText(formatBanInstant(until)) : permanentText}
  </p>
);

BanExpiryStatus.propTypes = {
  until: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  untilText: PropTypes.func.isRequired,
  permanentText: PropTypes.string.isRequired,
  className: PropTypes.string,
};

export default BanExpiryStatus;

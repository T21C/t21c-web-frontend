import React from 'react';
import UserManagementPopup from '../UserManagementPopup/UserManagementPopup';
import PropTypes from 'prop-types';

// Backward compatibility wrapper
const RaterManagementPopup = (props) => {
  return <UserManagementPopup {...props} initialMode="rater" />;
};

RaterManagementPopup.propTypes = {
  onClose: PropTypes.func.isRequired,
  currentUser: PropTypes.shape({
    username: PropTypes.string.isRequired
  }).isRequired
};

export default RaterManagementPopup; 
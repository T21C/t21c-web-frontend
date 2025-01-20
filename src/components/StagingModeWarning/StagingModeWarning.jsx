import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import './stagingmodewarning.css';

const StagingModeWarning = ({ className }) => {
  return (
    <div className={`staging-mode-warning ${className || ''}`}>
      <div className="warning-icon">⚠️</div>
      <div className="warning-content">
        <h4>Warning! This page is in staging mode.</h4>
        <p>This page is currently in staging mode. Any changes you make will not be reflected on the live site, please go to <a href="https://www.tuforums.com">tuforums.com</a> to make changes.</p>
      </div>
    </div>
  );
};

StagingModeWarning.propTypes = {
  className: PropTypes.string
};

export default StagingModeWarning;

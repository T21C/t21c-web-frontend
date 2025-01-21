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
        <p>Submissions are <b>DISABLED</b>, anything you submit won't go through, please go to <a href="https://tuforums.com">tuforums.com</a>.</p>
      </div>
    </div>
  );
};

StagingModeWarning.propTypes = {
  className: PropTypes.string
};

export default StagingModeWarning;

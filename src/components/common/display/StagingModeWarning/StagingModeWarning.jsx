// tuf-search: #StagingModeWarning #stagingModeWarning #display
import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from '@/components/common/LinkConfirm';
import './stagingmodewarning.css';

const StagingModeWarning = ({ className }) => {
  return (
    <div className={`staging-mode-warning ${className || ''}`}>
      <div className="warning-icon">⚠️</div>
      <div className="warning-content">
        <h4>Warning! This page is in staging mode.</h4>
        <p>Submissions are <b>DISABLED</b>, anything you submit won&apos;t go through, please go to <ExternalLink href="https://tuforums.com" target="_self">tuforums.com</ExternalLink>.</p>
      </div>
    </div>
  );
};

StagingModeWarning.propTypes = {
  className: PropTypes.string
};

export default StagingModeWarning;

// tuf-search: #PassHelpPopup #passHelpPopup #popups #passes #passHelp
import React from 'react';
import { SearchHelpPopup } from '@/components/common/SearchHelpPopup';
import { PASS_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/passSearchHelpSections';

export const PassHelpPopup = ({ onClose }) => (
  <SearchHelpPopup
    onClose={onClose}
    titleKey="pass.helpPopup.title"
    subtitleKey="pass.helpPopup.v2.subtitle"
    closeButtonKey="pass.helpPopup.closeButton"
    examplesTitleKey="pass.helpPopup.v2.examplesTitle"
    sections={PASS_SEARCH_HELP_SECTIONS}
    defaultOpenSection="basics"
  />
);

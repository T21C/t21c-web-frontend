// tuf-search: #LevelHelpPopup #levelHelpPopup #popups #levels #levelHelp
import React from 'react';
import { SearchHelpPopup } from '@/components/common/SearchHelpPopup';
import { LEVEL_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/levelSearchHelpSections';

export const LevelHelpPopup = ({ onClose }) => (
  <SearchHelpPopup
    onClose={onClose}
    titleKey="level.helpPopup.title"
    subtitleKey="level.helpPopup.v2.subtitle"
    closeButtonKey="level.helpPopup.closeButton"
    examplesTitleKey="level.helpPopup.v2.examplesTitle"
    sections={LEVEL_SEARCH_HELP_SECTIONS}
    defaultOpenSection="basics"
  />
);

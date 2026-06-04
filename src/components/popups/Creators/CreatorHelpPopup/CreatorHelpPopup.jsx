// tuf-search: #CreatorHelpPopup #creatorHelpPopup #popups #creators #creatorHelp
import React from 'react';
import { SearchHelpPopup } from '@/components/common/SearchHelpPopup';
import { CREATOR_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/creatorSearchHelpSections';

export const CreatorHelpPopup = ({ onClose }) => (
  <SearchHelpPopup
    onClose={onClose}
    titleKey="creator.helpPopup.title"
    subtitleKey="creator.helpPopup.v2.subtitle"
    closeButtonKey="creator.helpPopup.closeButton"
    examplesTitleKey="creator.helpPopup.v2.examplesTitle"
    sections={CREATOR_SEARCH_HELP_SECTIONS}
    defaultOpenSection="basics"
  />
);

// tuf-search: #AdvancedSearch #searchProfiles #searchHelp
import { CREATOR_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/creatorSearchHelpSections';
import { LEVEL_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/levelSearchHelpSections';
import { PACK_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/packSearchHelpSections';
import { PASS_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/passSearchHelpSections';
import { REQUEST_SEARCH_HELP_SECTIONS } from '@/components/common/SearchHelpPopup/requestSearchHelpSections';

export const SEARCH_PROFILES = {
  level: {
    titleKey: 'level.helpPopup.title',
    subtitleKey: 'level.helpPopup.v2.subtitle',
    closeButtonKey: 'level.helpPopup.closeButton',
    examplesTitleKey: 'level.helpPopup.v2.examplesTitle',
    sections: LEVEL_SEARCH_HELP_SECTIONS,
    defaultOpenSection: 'basics',
    translationNs: 'components',
  },
  pass: {
    titleKey: 'pass.helpPopup.title',
    subtitleKey: 'pass.helpPopup.v2.subtitle',
    closeButtonKey: 'pass.helpPopup.closeButton',
    examplesTitleKey: 'pass.helpPopup.v2.examplesTitle',
    sections: PASS_SEARCH_HELP_SECTIONS,
    defaultOpenSection: 'basics',
    translationNs: 'components',
  },
  creator: {
    titleKey: 'creator.helpPopup.title',
    subtitleKey: 'creator.helpPopup.v2.subtitle',
    closeButtonKey: 'creator.helpPopup.closeButton',
    examplesTitleKey: 'creator.helpPopup.v2.examplesTitle',
    sections: CREATOR_SEARCH_HELP_SECTIONS,
    defaultOpenSection: 'basics',
    translationNs: 'components',
  },
  pack: {
    titleKey: 'packHelpPopup.title',
    subtitleKey: 'packHelpPopup.v2.subtitle',
    closeButtonKey: 'packHelpPopup.closeButton',
    examplesTitleKey: 'packHelpPopup.v2.examplesTitle',
    sections: PACK_SEARCH_HELP_SECTIONS,
    defaultOpenSection: 'basics',
    translationNs: 'components',
  },
  request: {
    titleKey: 'levelRequests.helpPopup.title',
    subtitleKey: 'levelRequests.helpPopup.v2.subtitle',
    closeButtonKey: 'levelRequests.helpPopup.closeButton',
    examplesTitleKey: 'levelRequests.helpPopup.v2.examplesTitle',
    sections: REQUEST_SEARCH_HELP_SECTIONS,
    defaultOpenSection: 'basics',
    translationNs: 'pages',
  },
};

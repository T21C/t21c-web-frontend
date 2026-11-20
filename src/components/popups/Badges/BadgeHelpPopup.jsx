import SearchHelpPopup from '@/components/common/SearchHelpPopup';
import { BADGE_HELP_SECTIONS } from './badgeHelpSections';

const BadgeHelpPopup = ({ onClose, defaultOpenSection = 'lists' }) => (
  <SearchHelpPopup
    onClose={onClose}
    titleKey="badges.help.title"
    subtitleKey="badges.help.subtitle"
    closeButtonKey="badges.help.close"
    examplesTitleKey="badges.help.examplesTitle"
    sections={BADGE_HELP_SECTIONS}
    defaultOpenSection={defaultOpenSection}
    translationNs="pages"
  />
);

export default BadgeHelpPopup;

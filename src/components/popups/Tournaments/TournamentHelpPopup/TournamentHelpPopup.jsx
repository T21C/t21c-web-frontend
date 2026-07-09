// tuf-search: #TournamentHelpPopup #tournamentHelpPopup #popups #tournaments
import SearchHelpPopup from "@/components/common/SearchHelpPopup";
import { TOURNAMENT_HELP_SECTIONS } from "./tournamentHelpSections";

const TournamentHelpPopup = ({ onClose }) => (
  <SearchHelpPopup
    onClose={onClose}
    titleKey="tournamentManagement.help.title"
    subtitleKey="tournamentManagement.help.subtitle"
    closeButtonKey="tournamentManagement.help.close"
    sections={TOURNAMENT_HELP_SECTIONS}
    defaultOpenSection="modes"
    translationNs="pages"
  />
);

export default TournamentHelpPopup;

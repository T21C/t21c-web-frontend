// tuf-search: #AdminPlayerPopup #adminPlayerPopup #popups #users #adminPlayer
import { CreatorManagementPopup } from '@/components/popups/Creators';
import PropTypes from 'prop-types';

/**
 * Player admin management — uses shared tabbed UI with creator management.
 */
const AdminPlayerPopup = ({ player = {}, onClose, onUpdate, onCreatorUserLinkedUpdate }) => {
  if (!player?.id) {
    console.error('Player prop is undefined or missing id');
    return null;
  }

  return (
    <CreatorManagementPopup
      player={player}
      onClose={onClose}
      onUpdate={onUpdate}
      onCreatorUserLinkedUpdate={onCreatorUserLinkedUpdate}
    />
  );
};

AdminPlayerPopup.propTypes = {
  player: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string,
    country: PropTypes.string,
    isBanned: PropTypes.bool,
    isSubmissionsPaused: PropTypes.bool,
    isRatingBanned: PropTypes.bool,
    user: PropTypes.object,
    playerAliases: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number,
        name: PropTypes.string,
      }),
    ),
  }),
  onClose: PropTypes.func.isRequired,
  onUpdate: PropTypes.func,
  onCreatorUserLinkedUpdate: PropTypes.func,
};

AdminPlayerPopup.defaultProps = {
  player: {
    name: '',
    country: 'XX',
    isBanned: false,
    isSubmissionsPaused: false,
    isRatingBanned: false,
  },
};

export default AdminPlayerPopup;

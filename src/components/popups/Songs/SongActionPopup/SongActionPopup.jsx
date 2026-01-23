import React from 'react';
import { EntityActionPopup } from '@/components/popups';

export const SongActionPopup = ({ song, onClose, onUpdate }) => {
  return (
    <EntityActionPopup
      song={song}
      onClose={onClose}
      onUpdate={onUpdate}
      type="song"
    />
  );
};

export default SongActionPopup;

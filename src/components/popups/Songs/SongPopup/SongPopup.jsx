import React from 'react';
import { EntityPopup } from '@/components/popups';

export const SongPopup = ({ song, onClose }) => {
  return (
    <EntityPopup
      song={song}
      onClose={onClose}
      type="song"
    />
  );
};

export default SongPopup;

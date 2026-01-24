import React from 'react';
import { EntityActionPopup } from '@/components/popups';

export const ArtistActionPopup = ({ artist, onClose, onUpdate }) => {
  return (
    <EntityActionPopup
      artist={artist}
      onClose={onClose}
      onUpdate={onUpdate}
      type={'artist'}
    />
  );
};

export default ArtistActionPopup;

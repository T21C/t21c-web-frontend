import React from 'react';
import { EntityPopup } from '@/components/popups/Entities';

export const ArtistPopup = ({ artist, onClose }) => {
  return (
    <EntityPopup
      artist={artist}
      onClose={onClose}
      type="artist"
    />
  );
};

export default ArtistPopup;

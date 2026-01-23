import React from 'react';
import { EntityActionPopup } from '@/components/popups';

export const ArtistActionPopup = ({ artist, song, onClose, onUpdate, type = 'artist' }) => {
  return (
    <EntityActionPopup
      artist={artist}
      song={song}
      onClose={onClose}
      onUpdate={onUpdate}
      type={type}
    />
  );
};

export default ArtistActionPopup;

import React from 'react';
import levelIcon from '@/assets/icons/chart.png';

export const LevelIcon = ({ size=24, ...props }) => {
  return (
    <img {...props} width={size} height={size} src={levelIcon} alt="level-icon" />
  );
};


import React from 'react';

export const LevelIcon = ({ size=24, ...props }) => {
  return (
    <img {...props} width={size} height={size} src="/src/assets/icons/chart.png" alt="level-icon" />
  );
};


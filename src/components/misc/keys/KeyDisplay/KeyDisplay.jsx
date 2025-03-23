import React from 'react';
import './keydisplay.css';

const KeyDisplay = ({ 
  keyText, 
  size = 'medium',
  className = ''
}) => {
  return (
    <span className={`keyContainer ${size} ${className}`}>
      {keyText}
    </span>
  );
};

export default KeyDisplay; 
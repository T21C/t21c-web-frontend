import React from 'react';
import KeyDisplay from '../KeyDisplay/KeyDisplay';
import './keycombo.css';


const KeyCombo = ({ 
  keys, 
  size = 'medium',
  className = '' 
}) => {
  return (
    <span className={`comboContainer ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="plus">+</span>}
          <KeyDisplay keyText={key} size={size} />
        </React.Fragment>
      ))}
    </span>
  );
};

export default KeyCombo; 
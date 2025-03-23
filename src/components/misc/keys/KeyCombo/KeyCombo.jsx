import React, { useState, useEffect, useCallback } from 'react';
import KeyDisplay from '../KeyDisplay/KeyDisplay';
import './keycombo.css';

const KeyCombo = ({ 
  keys, 
  size = 'medium',
  className = '',
  actualKeys, // Array of actual keys to listen for (optional)
  onComboTriggered = () => {} // Callback when combo is successfully triggered
}) => {
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [flash, setFlash] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  const handleKeyPressed = useCallback((key) => {
    setPressedKeys(prev => new Set([...prev, key]));
  }, []);

  const handleKeyReleased = useCallback((key) => {
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  }, []);

  // Check if combo is complete
  useEffect(() => {
    if (pressedKeys.size === keys.length && 
        keys.every(key => pressedKeys.has(key))) {
      onComboTriggered();
      setFlash(true);
      setAnimationKey(prev => prev + 1);
      // Reset flash after animation duration
      const timer = setTimeout(() => {
        setFlash(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pressedKeys, keys, onComboTriggered]);

  return (
    <span className={`combo-container ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={`${index}-${animationKey}`}>
          {index > 0 && <span className="plus">+</span>}
          <KeyDisplay 
            keyText={key} 
            size={size}
            actualKey={actualKeys?.[index]}
            isPressed={pressedKeys.has(key)}
            onKeyPressed={handleKeyPressed}
            onKeyReleased={handleKeyReleased}
            flash={flash}
            elementKey={`${key}-${animationKey}`}
          />
        </React.Fragment>
      ))}
    </span>
  );
};

export default KeyCombo; 
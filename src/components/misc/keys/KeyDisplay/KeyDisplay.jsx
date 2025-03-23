import React, { useState, useEffect } from 'react';
import './keydisplay.css';


const KeyDisplay = ({ 
  keyText, 
  size = 'medium',
  className = '',
  actualKey, // The actual key to listen for (optional)
  isPressed = false, // Allow external control of pressed state
  onKeyPressed = () => {}, // Callback when key is pressed
  onKeyReleased = () => {}, // Callback when key is released
  flash = false, // Control flash animation from parent
  elementKey // Key for forcing animation reruns
}) => {
  const [isKeyPressed, setIsKeyPressed] = useState(false);
  
  useEffect(() => {
    const keysToMatch = actualKey ? [actualKey] : (KEY_MAP[keyText] || [keyText]);

    const handleKeyDown = (e) => {
      if (keysToMatch.includes(e.key) || keysToMatch.includes(e.code)) {
        e.preventDefault();
        setIsKeyPressed(true);
        onKeyPressed(keyText);
      }
    };

    const handleKeyUp = (e) => {
      if (keysToMatch.includes(e.key) || keysToMatch.includes(e.code)) {
        e.preventDefault();
        setIsKeyPressed(false);
        onKeyReleased(keyText);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyText, actualKey, onKeyPressed, onKeyReleased]);

  return (
    <span 
      key={elementKey}
      className={`keyContainer ${size} ${className} ${(isKeyPressed || isPressed) ? 'pressed' : ''} ${flash ? 'flash' : ''}`}
      data-actual-key={actualKey || KEY_MAP[keyText]?.join(',') || keyText}
    >
      {keyText}
    </span>
  );
};

export default KeyDisplay; 
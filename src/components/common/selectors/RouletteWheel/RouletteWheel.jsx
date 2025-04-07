import React, { useState, useRef, useEffect } from 'react';
import './roulettewheel.css';
import { createEventSystem } from '@/utils/Utility';


export const RouletteWheel = ({ 
  items, 
  onSelect, 
  onClose,
  colors = ['#4a90e2', '#e74c3c'], // Default alternating colors for text mode
  enableGimmicks = false,
  mode: initialMode = 'icon'
}) => {
  const filteredItems = items.filter(item => item.name !== 'bus' && item.name !== 'epic');
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [hue, setHue] = useState(0);
  const [activeGimmick, setActiveGimmick] = useState(null);
  const [mode, setMode] = useState(initialMode);
  const [plateImage, setPlateImage] = useState(null);
  const [temporaryItems, setTemporaryItems] = useState(null);
  const [spinConfig, setSpinConfig] = useState({
    duration: 7000,
    rotations: 0,
    targetIndex: -1,
    finalRotation: 0
  });
  const wheelRef = useRef(null);
  const imageWheelRef = useRef(null);
  const dataRef = useRef(null);
  const defaultSpinDuration = 7000;
  const spinEasing = 'cubic-bezier(0.12, 0.67, 0.15, 1)';
  const busEasing = 'cubic-bezier(0.22,0.63,0.66,0.9)';
  const [countdown, setCountdown] = useState('08:00:00');

  const sectorWidth = 870 / (items.length + 1);
  const gimmickEvents = createEventSystem({
    'long': 2,      
    'backwards': 5, 
    'bus': 0.25,
    'epic': 1
  });




  // Color cycling effect
  useEffect(() => {
    if (selectedItem) {
      const interval = setInterval(() => {
        setHue(prevHue => (prevHue + 100) % 360);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [selectedItem]);

  const getCyclingColor = () => {
    return `hsl(${hue}, 100%, 50%)`;
  };

  const applyBackwardsAnimation = (element, finalRotation) => {
    const overshootAmount = 20 + Math.random() * 25; // Random overshoot
    const initialDuration = 7000; // 7 seconds for initial spin
    const pauseDuration = 1000; // 1 second pause
    const returnDuration = 500; // quick return

    // Initial spin with overshoot
    element.style.transition = `transform ${initialDuration}ms ${spinEasing}`;
    element.style.transform = `rotate(${finalRotation + overshootAmount}deg)`;

    // Schedule the return animation after pause
    setTimeout(() => {
      element.style.transition = `transform ${returnDuration}ms ease-in-out`;
      element.style.transform = `rotate(${finalRotation}deg)`;
    }, initialDuration + pauseDuration);

    // Return total animation duration
    return initialDuration + pauseDuration + returnDuration;
  };

  // Format time to HH:MM:SS with padding
  const formatTime = (ms) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Effect to handle countdown timer
  useEffect(() => {
    let intervalId;
    
    if (isSpinning && activeGimmick === 'bus') {
      const startTime = Date.now();
      const duration = spinConfig.duration;
      
      intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        
        if (remaining <= 0) {
          clearInterval(intervalId);
          setCountdown('');
        } else {
          setCountdown(formatTime(remaining));
        }
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isSpinning, activeGimmick, spinConfig.duration]);

  // Effect to handle spin configuration when spinning starts
  useEffect(() => {
    if (isSpinning) {
      const gimmick = enableGimmicks ? gimmickEvents() : null;
      const randomIndex = Math.floor(Math.random() * filteredItems.length);
      
      let duration = defaultSpinDuration;
      let rotations = 8 + Math.floor(Math.random() * 7);
      
      // Configure spin parameters based on gimmick
      switch (gimmick) {
        case 'long':
          duration = 300000; // 5 minutes
          rotations = 300;
          break;
        case 'bus':
          duration = 28800000; // 8 hours
          rotations = 9000;
          break;
        case 'backwards':
          duration = 8500; // Total animation will be handled separately
          break;
      }

      const anglePerItem = 360 / filteredItems.length;
      const targetAngle = (-anglePerItem * randomIndex) - (anglePerItem * 5/6) * Math.random() + anglePerItem/2;
      const finalRotation = (rotations * 360) + targetAngle;

      setSpinConfig({
        duration,
        rotations,
        targetIndex: randomIndex,
        finalRotation
      });
      
      setActiveGimmick(gimmick);
    }
  }, [isSpinning, filteredItems.length, enableGimmicks]);

  // Effect to handle spin animation after configuration is set
  useEffect(() => {
    if (isSpinning && spinConfig.targetIndex !== -1) {
      applyGimmick(activeGimmick);
      
      const wheelElements = [wheelRef.current, imageWheelRef.current].filter(Boolean);
      
      wheelElements.forEach(element => {
        if (element) {
          element.style.animation = 'none';
          element.offsetHeight; // Force reflow
          
          let totalDuration = spinConfig.duration;
          
          if (activeGimmick === 'backwards') {
            totalDuration = applyBackwardsAnimation(element, spinConfig.finalRotation);
          } else if (activeGimmick === 'bus') {
            element.style.transition = `transform ${spinConfig.duration}ms ${busEasing}`;
            element.style.transform = `rotate(${spinConfig.finalRotation}deg)`;
          } else {
            element.style.transition = `transform ${spinConfig.duration}ms ${spinEasing}`;
            element.style.transform = `rotate(${spinConfig.finalRotation}deg)`;
          }
          
        }
      });

      // Set selected item and show result after animation
      const totalDuration = spinConfig.duration;

      setTimeout(() => {
        const currentItems = temporaryItems || filteredItems;
        if (activeGimmick === 'bus') {
          setSelectedItem(items.find(item => item.name === 'bus'));
        } else if (activeGimmick === 'epic') {
          setSelectedItem(items.find(item => item.name === 'epic'));
        } else {
          setSelectedItem(currentItems[spinConfig.targetIndex]);
        }
        setIsSpinning(false);
        setShowResult(true);
        if (dataRef.current) {
          dataRef.current.classList.add('reveal');
        }
        // Reset gimmick effects but keep mode if it was changed
        setActiveGimmick(null);
        setTemporaryItems(null);
        setSpinConfig(prev => ({ ...prev, targetIndex: -1 }));
        setCountdown(''); // Reset countdown when spin completes
      }, totalDuration);
    }
  }, [spinConfig, isSpinning]);

  const applyGimmick = (gimmickType) => {
    switch (gimmickType) {
      case 'bus':
        const busItem = items.find(item => item.name === 'bus');
        if (busItem) {
          setPlateImage(busItem.icon);
          setMode('image');
          setTemporaryItems(Array(items.length).fill(busItem));
          if (dataRef.current) {
            dataRef.current.classList.add('reveal');
          }
        }
        break;
      case 'epic':
        const epicItem = items.find(item => item.name === 'epic');
        if (epicItem) {
          setPlateImage(epicItem.icon);
          setMode('image');
          setTemporaryItems(Array(items.length).fill(epicItem));
        }
        break;
    }
  };

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setShowResult(false);
  };

  const handleConfirm = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onClose();
    }
  };

  // Reset wheel position and result when closing
  useEffect(() => {
    return () => {
      if (wheelRef.current) {
        wheelRef.current.style.transition = 'none';
        wheelRef.current.style.transform = 'rotate(0deg)';
      }
      if (dataRef.current) {
        dataRef.current.classList.remove('reveal');
      }
      setShowResult(false);
      setHue(0);
    };
  }, []);

  return (
    <div className="roulette-wheel-popup">
      <div className="roulette-wheel-container">
        <button 
          className="close-button" 
          onClick={onClose}
          disabled={isSpinning}
          style={{ 
            opacity: isSpinning ? 0.5 : 1,
            cursor: isSpinning ? 'not-allowed' : 'pointer'
          }}
        >×</button>
        <div className="roulette-wheel-content">
          <div className="wheel-container">
            <div className="wheel-pointer"></div>
            <div className="plate">
              <div 
                className={`plate-image ${mode === 'image' ? 'visible' : ''}`}
                ref={imageWheelRef}
                style={{ 
                  backgroundImage: plateImage ? `url(${plateImage})` : 'none',
                  opacity: mode === 'image' ? 1 : 0,
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  transition: 'opacity 0.3s ease',
                  transformOrigin: '50.22% 50.22%'
                }}
              />
              <ul 
                className="inner" 
                ref={wheelRef}
                style={{
                  opacity: mode === 'image' ? 0 : 1,
                  transition: 'opacity 0.3s ease'
                }}
              >
                {(temporaryItems || filteredItems).map((item, index) => {
                  const angle = 360 / filteredItems.length;
                  let itemValue = mode === 'icon' ? item : { id: index, name: item, color: colors[index % colors.length] };

                  return (
                    <React.Fragment key={mode === 'icon' ? item.id : index}>
                      <li 
                        className="background-number"
                        style={{
                          transform: `rotateZ(${angle * index}deg)`,
                          borderTopColor: (itemValue === selectedItem || itemValue?.name === selectedItem) 
                            ? getCyclingColor() 
                            : itemValue.color,
                          borderLeft: `${sectorWidth}px solid transparent`,
                          borderRight: `${sectorWidth}px solid transparent`,
                          left: `calc(50% - ${sectorWidth}px + 5.1px)`
                        }}
                      >
                      </li>
                      <li 
                        className="number"
                        style={{
                          transform: `rotateZ(${angle * index}deg)`,
                          borderTopColor: 'transparent',
                          borderLeft: `${sectorWidth}px solid transparent`,
                          borderRight: `${sectorWidth}px solid transparent`,
                          left: `calc(50% - ${sectorWidth}px + 5.1px)`
                        }}
                      >
                        <label>
                          <input type="radio" name="item" value={itemValue.name} />
                          <span className={`pit ${mode === 'text' ? 'text-mode' : ''}`}>
                            {mode === 'icon' && itemValue !== selectedItem && (
                              <img 
                                src={itemValue.icon} 
                                alt={itemValue.name}
                                className="item-icon"
                              />
                            )}
                            {mode === 'text' && (
                              <span className="text-value">{itemValue.name}</span>
                            )}
                          </span>
                        </label>
                      </li>
                    </React.Fragment>
                  );
                })}
              </ul>
              <div className="data" ref={dataRef}>
                <div className="data-inner">
                  <div className="mask">Spin!</div>
                  <div className="result">
                    {selectedItem && (
                      <>
                        <div className="result-number">
                          {(mode === 'icon' || mode === 'image') && (
                            <img 
                              src={selectedItem.icon || selectedItem} 
                              alt={typeof selectedItem === 'string' ? selectedItem : selectedItem.name}
                              className="result-icon"
                            />
                          )}
                        </div>
                        <div className={`result-message ${mode === 'text' ? 'text-mode' : ''}`}>
                          {mode === 'text' ? selectedItem : (selectedItem.name || selectedItem)}
                        </div>
                      </>
                    )}
                    {activeGimmick === 'bus' && (
                      <>
                        <div className="message">
                          You're in for one hell of a ride pal...
                        </div>
                        <div className="countdown" style={{
                          fontSize: '2em',
                          fontFamily: 'monospace',
                          marginTop: '10px',
                          color: '#ff4444'
                        }}>
                          {countdown}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="wheel-controls">
            {!showResult ? (
              <button 
                className="spin-button"
                onClick={handleSpin}
                disabled={isSpinning}
              >
                {isSpinning ? 'Spinning...' : 'Spin!'}
                </button>
            ) : (
              <button 
                className="confirm-button"
                onClick={handleConfirm}
              >
                Confirm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 
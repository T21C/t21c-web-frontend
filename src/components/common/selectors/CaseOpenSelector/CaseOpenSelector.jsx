import React, { useState, useEffect, useRef } from 'react';
import './caseopenselector.css';
import { toast } from 'react-hot-toast';
import api from '@/utils/api';
import { createEventSystem } from '@/utils/Utility';
import { useAuth } from '@/contexts/AuthContext';

const TOTAL_ITEMS = 50; // Total items in the strip
const INITIAL_ITEMS = 20; // Number of items to pre-generate
const VISIBLE_ITEMS = 4; // Number of visible items
const ITEM_WIDTH = 160; // Width of each item in pixels
const ANIMATION_DURATION = 12000; // 6 seconds
const STRIP_OFFSET = -Math.floor(VISIBLE_ITEMS/3) * ITEM_WIDTH+20-(Math.random()*ITEM_WIDTH); // Center the winning item
const WINNING_POSITION = Math.floor(TOTAL_ITEMS * 0.7); // Position where winning item will land
const COOLDOWN_SECONDS = 300; // Cooldown between spins
const INITIAL_SHIFT = 6; // Number of items to shift initially

const isNonStackable = [
  'player_swap',
  'ban_hammer',
  'super_admin',
  'king_of_castle'
]

const baseItemStyle = {
  flex: '0 0 160px',
  height: '100%',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  margin: '0 2px',
  transition: 'all 0.3s ease',
  position: 'relative',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
};

const stripStyle = {
  display: 'flex',
  position: 'absolute',
  left: '50%',
  top: 0,
  height: '100%',
  willChange: 'transform',
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
};

export const CaseOpenSelector = ({ targetPlayerId, onClose, isSpinning: parentIsSpinning }) => {
  const { user } = useAuth();
  const [isInitialSpin, setIsInitialSpin] = useState(true);
  const [modifiers, setModifiers] = useState([]);
  const [probabilities, setProbabilities] = useState({});
  const [isSpinning, setIsSpinning] = useState(false);
  const [items, setItems] = useState([]);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isSelfRoll, setIsSelfRoll] = useState(false);
  const stripRef = useRef(null);
  const eventSystemRef = useRef(null);
  const cooldownIntervalRef = useRef(null);
  const [stripTransform, setStripTransform] = useState(`translateX(${-ITEM_WIDTH * INITIAL_SHIFT}px)`);
  const [stripTransition, setStripTransition] = useState('none');

  // Update parent's spinning state
  useEffect(() => {
    if (typeof parentIsSpinning === 'function') {
      parentIsSpinning(isSpinning);
    }
  }, [isSpinning, parentIsSpinning]);

  useEffect(() => {
    fetchModifiers();
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [targetPlayerId]);

  useEffect(() => {
    if (Object.keys(probabilities).length > 0) {
      // Create event system when probabilities are loaded
      eventSystemRef.current = createEventSystem(probabilities);
      // Generate initial items
      generateInitialItems();
    }
  }, [probabilities]);

  const generateInitialItems = () => {
    const initialItems = [];
    
    // Generate initial items with shift
    for (let i = 0; i < INITIAL_ITEMS + INITIAL_SHIFT; i++) {
      const type = eventSystemRef.current();
      initialItems.push({
        id: i,
        type: type,
        label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        probability: probabilities[type]
      });
    }

    setItems(initialItems);
  };

  const reloadModifiers = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_PLAYERS}/${targetPlayerId}/modifiers`);
      setModifiers(response.data.modifiers);
      
    } catch (error) {
      console.error('Error fetching modifiers:', error);
      toast.error('Failed to fetch modifiers');
    }
  };

  const fetchModifiers = async () => {
    try {
      const response = await api.get(`${import.meta.env.VITE_PLAYERS}/${targetPlayerId}/modifiers`);
      setModifiers(response.data.modifiers);
      setProbabilities(response.data.probabilities);
      
      // Handle cooldown from response
      if (response.data.cooldown) {
        const { remainingSeconds, isSelfRoll: serverIsSelfRoll } = response.data.cooldown;
        setIsSelfRoll(serverIsSelfRoll);
        
        if (remainingSeconds > 0) {
          setCooldownSeconds(remainingSeconds);
          
          // Clear any existing interval
          if (cooldownIntervalRef.current) {
            clearInterval(cooldownIntervalRef.current);
          }
          
          // Start new interval
          cooldownIntervalRef.current = setInterval(() => {
            setCooldownSeconds(prev => {
              if (prev <= 1) {
                clearInterval(cooldownIntervalRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error fetching modifiers:', error);
      toast.error('Failed to fetch modifiers');
    }
  };

  const completeStripWithWinningItem = (winningItem) => {
    
    // Keep the initial items
    const completeStrip = [...items];
    
    // Generate items up to the winning position
    while (completeStrip.length < WINNING_POSITION) {
      const type = eventSystemRef.current();
      completeStrip.push({
        id: completeStrip.length,
        type: type,
        label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        probability: probabilities[type],
        position: completeStrip.length,
        isGenerated: true
      });
    }

    // Insert winning item
    completeStrip[WINNING_POSITION] = {
      id: WINNING_POSITION,
      type: winningItem.type,
      label: winningItem.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      probability: probabilities[winningItem.type],
      position: WINNING_POSITION,
      isWinning: true // Mark the winning item
    };

    // Generate remaining items
    while (completeStrip.length < TOTAL_ITEMS) {
      const type = eventSystemRef.current();
      completeStrip.push({
        id: completeStrip.length,
        type: type,
        label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        probability: probabilities[type],
        position: completeStrip.length,
        isGenerated: true
      });
    }

    return completeStrip;
  };

  const handleSpin = async () => {
    if (isSpinning || !eventSystemRef.current || cooldownSeconds > 0) return;
    
    setIsSpinning(true);
    // Reset strip position and regenerate items immediately
    if (!isInitialSpin) {
      setStripTransition('none');
      setStripTransform(`translateX(${-ITEM_WIDTH * INITIAL_SHIFT}px)`);
      generateInitialItems();
    }
    else {
      setIsInitialSpin(false);
    }

    try {
      const response = await api.post(`${import.meta.env.VITE_PLAYERS}/modifiers/generate`, {
        targetPlayerId
      });
      const newModifier = response.data.modifier;
      
      if (newModifier) {
        // Force a reflow to ensure the reset is applied
        if (stripRef.current) {
          stripRef.current.offsetHeight;
        }

        const completeStrip = completeStripWithWinningItem({
          type: newModifier.type,
          value: newModifier.value
        });
        setItems(completeStrip);

        // Force another reflow to ensure the new items are rendered
        if (stripRef.current) {
          stripRef.current.offsetHeight;
        }

        // Start the animation
        const finalOffset = -(ITEM_WIDTH * WINNING_POSITION) + STRIP_OFFSET;
        setStripTransition(`transform ${ANIMATION_DURATION}ms cubic-bezier(0.1, 0.6, 0.2, 1)`);
        setStripTransform(`translateX(${finalOffset}px)`);

        setTimeout(() => {
          setIsSpinning(false);
          reloadModifiers();
          
          toast.success(`You got a ${newModifier.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}!`);
          
          // Set cooldown based on whether it's a self-roll or not
          const cooldownTime = isSelfRoll ? 60 : 600; // 1 minute for self-roll, 10 minutes for others
          setCooldownSeconds(cooldownTime);
          cooldownIntervalRef.current = setInterval(() => {
            setCooldownSeconds(prev => {
              if (prev <= 1) {
                clearInterval(cooldownIntervalRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, ANIMATION_DURATION);
      } else {
        setIsSpinning(false);
        toast.info('Better luck next time!');
      }
    } catch (error) {
      console.error('Error during spin:', error);
      setIsSpinning(false);
      
      if (error.response?.status === 429 && error.response?.data?.remainingSeconds) {
        const { remainingSeconds, isSelfRoll: serverIsSelfRoll } = error.response.data;
        setIsSelfRoll(serverIsSelfRoll);
        setCooldownSeconds(remainingSeconds);
        
        // Clear any existing interval
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
        }
        
        // Start new interval
        cooldownIntervalRef.current = setInterval(() => {
          setCooldownSeconds(prev => {
            if (prev <= 1) {
              clearInterval(cooldownIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        toast.error(`Spin cooldown active (${remainingSeconds}s remaining)`);
      } else {
        toast.error('Failed to generate modifier');
      }
    }
  };

  const formatModifierValue = (modifier) => {
    switch (modifier.type) {
      case 'ranked_add':
        return `+${modifier.value.toFixed(2)} to ranked score`;
      case 'ranked_multiply':
        return `${modifier.value?.toFixed(2)}x ranked score`;
      case 'score_combine':
        return 'Combines all scores';
      case 'player_swap':
        return `Swap identity with #${parseInt(targetPlayerId) === modifier.playerId? modifier.value : modifier.playerId}`;
      case 'oops_all_miss':
        return 'Add 25 misses to all clears';
      case 'ban_hammer':
        return 'Temporary ban';
      case 'super_admin':
        return '5 minutes of super admin';
      case 'score_flip':
        return 'Flip ranked score numbers';
      case 'king_of_castle':
        return 'Remove others from a WF';
      default:
        return modifier.type;
    }
  };

  const formatExpiration = (expiresAt) => {
    if (!expiresAt) return null;
    
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Add effect to handle modifier expiration
  useEffect(() => {
    if (!modifiers.length) return;

    const interval = setInterval(() => {
      const now = new Date();
      const activeModifiers = modifiers.filter(mod => new Date(mod.expiresAt) > now);
      setModifiers(activeModifiers);
    }, 1000);

    return () => clearInterval(interval);
  }, [modifiers]);

  const getItemStyle = (item) => {
    let style = { ...baseItemStyle };

    // Add rarity-based class
    const itemClass = item.type.toLowerCase();
    style.className = `case-open-selector__item ${itemClass}`;
    
    if (item.isWinning) {
      style.className += ' winning';
    }

    return style;
  };

  return (
    <div className={`case-open-selector ${isSpinning ? 'case-open-selector--spinning' : ''}`}>
      <div className="case-open-selector__container">
        <div className="case-open-selector__viewport">
          <div className="case-open-selector__marker"></div>
          <div 
            ref={stripRef}
            style={{
              ...stripStyle,
              transform: stripTransform,
              transition: stripTransition,
            }}
          >
            {items.map(item => (
              <div 
                key={item.id} 
                {...getItemStyle(item)}
              >
                <span style={{ 
                  fontSize: '1rem', 
                  color: '#fff', 
                  fontWeight: 500, 
                  marginBottom: '0.5rem' 
                }}>
                  {item.label}
                </span>
                <span style={{ 
                  fontSize: '0.8rem', 
                  color: 'rgba(255, 255, 255, 0.6)', 
                  fontFamily: 'monospace' 
                }}>
                  {item.probability}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <button 
          className="case-open-selector__spin-button" 
          onClick={handleSpin}
          disabled={isSpinning || !eventSystemRef.current || cooldownSeconds > 0 || !user}
        >
          {user ? (
            <>
              {isSpinning ? 'Opening...' : cooldownSeconds > 0 ? 
                `Wait ${cooldownSeconds}s (${isSelfRoll ? 'Self Roll' : 'Other Roll'})` : 
                'Open Case'}
            </>
          ) : (
            'Login Required'
          )}
        </button>
      </div>

      <div className="case-open-selector__modifiers">
        <h3>Active Modifiers</h3>
        {modifiers.length === 0 ? (
          <p>No active modifiers</p>
        ) : (
          <ul className="case-open-selector__modifier-list">
            {modifiers.map(modifier => {
              const timeRemaining = formatExpiration(modifier.expiresAt);
              if (!timeRemaining) return null;
              
              return (
                <li key={modifier.id} className="case-open-selector__modifier-item">
                  <div className="case-open-selector__modifier-info">
                    <span className="case-open-selector__modifier-type">
                      {formatModifierValue(modifier)}
                    </span>
                    <span className="case-open-selector__modifier-expiry">
                      {timeRemaining}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isSpinning && onClose && (
        <button 
          className="case-open-selector__close-button"
          onClick={onClose}
        >
          ✖
        </button>
      )}
    </div>
  );
};
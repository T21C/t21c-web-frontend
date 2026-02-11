import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import './statedisplay.css';

const StateDisplay = ({ 
  currentState, 
  states = ['hide', 'show', 'only'], 
  onChange,
  label,
  width = 56,
  height = 24,
  padding = 0,
  showLabel = true,
  showValue = true,
  className = ''
}) => {
  const { t } = useTranslation('components');

  // Calculate dimensions based on props
  const dimensions = useMemo(() => {
    const thumbSize = Math.floor(height-padding)-2;
    const horizontalPadding = thumbSize/2 + padding;
    const verticalPadding = (height - thumbSize) / 2;
    const trackWidth = width - (horizontalPadding * 2);
    const stepCount = Math.max(1, states.length - 1); // Ensure at least 1 step
    const stepSize = trackWidth / stepCount;

    // Calculate positions for any number of states
    const positions = states.map((_, index) => 
      horizontalPadding + (index * stepSize)
    );

    return {
      thumbSize,
      horizontalPadding,
      verticalPadding,
      trackWidth,
      stepSize,
      positions
    };
  }, [width, height, padding, states.length]);

  const handleClick = () => {
    const currentIndex = states.indexOf(currentState);
    const nextIndex = (currentIndex + 1) % states.length;
    onChange(states[nextIndex]);
  };

  const style = {
    '--thumb-size': `${dimensions.thumbSize}px`,
    '--horizontal-padding': `${dimensions.horizontalPadding}px`,
    '--vertical-padding': `${dimensions.verticalPadding}px`,
    '--track-width': `${dimensions.trackWidth}px`,
    '--current-position': `${dimensions.positions[states.indexOf(currentState)]}px`,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: `${height/2}px`,
    padding: `${dimensions.verticalPadding}px ${dimensions.horizontalPadding}px`
  };

  return (
    <div className={`state-display-toggle ${className}`}>
      {showLabel && label && <span className="toggle-label">{label}</span>}
      <div className="state-display-container">
        <div 
          className="state-display"
          data-state={currentState}
          onClick={handleClick}
          style={style}
        />
        {showValue && (
          <span className="state-value">
            {t('stateDisplay.states.' + currentState)}
          </span>
        )}
      </div>
    </div>
  );
};

StateDisplay.propTypes = {
  currentState: PropTypes.string.isRequired,
  states: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  label: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  padding: PropTypes.number,
  showLabel: PropTypes.bool,
  showValue: PropTypes.bool,
  className: PropTypes.string
};

export default StateDisplay; 
import './slotmachine.css';
import { useState, useEffect } from 'react';

export const SlotMachine = ({ onComplete, onClose, slots }) => {
    const [digits, setDigits] = useState(Array(slots).fill(0));
    const [isSpinning, setIsSpinning] = useState(false);
    const [isStarted, setIsStarted] = useState(false);
    const [spinningIndex, setSpinningIndex] = useState(-1);
    const [finalDigits, setFinalDigits] = useState(Array(slots).fill(0));
    const [isComplete, setIsComplete] = useState(false);
  
    useEffect(() => {
      if (spinningIndex === slots - 1) {
        setTimeout(() => {
          setIsComplete(true);
          setTimeout(() => {
            onComplete(parseInt(finalDigits.join('')));
          }, 2500);
        }, 1200);
      }
    }, [spinningIndex, slots, onComplete, finalDigits]);
  
    const spinDigit = (index) => {
      if (index >= slots) {
        setIsSpinning(false);
        return;
      }
  
      setSpinningIndex(index);
      let count = 0;
      const finalDigit = Math.floor(Math.random() * 10);
      
      setFinalDigits(prev => {
        const newDigits = [...prev];
        newDigits[index] = finalDigit;
        return newDigits;
      });
  
      const interval = setInterval(() => {
        setDigits(prev => {
          const newDigits = [...prev];
          newDigits[index] = Math.floor(Math.random() * 10);
          return newDigits;
        });
        count++;
        if (count >= 20) {
          clearInterval(interval);
          setDigits(prev => {
            const newDigits = [...prev];
            newDigits[index] = finalDigit;
            return newDigits;
          });
          setTimeout(() => spinDigit(index + 1), 500);
        }
      }, 50);
    };
  
    const startSpinning = () => {
      setIsSpinning(true);
      setIsStarted(true);
      setIsComplete(false);
      setFinalDigits(Array(slots).fill(0));
      spinDigit(0);
    };
  
    return (
    <div className="slot-machine">
      <div className="slot-machine-container">
        <div className="slot-machine-content">
            <h3>
              {"BASESCORE TIME".split('').map((letter, index) => (
                <span key={index}>{letter === ' ' ? '\u00A0' : letter}</span>
              ))}
            </h3>
            <div className="content-wrapper" style={{height: isStarted ? "fit-content" : ""}}>
              <div className="slot-machine-display" style={{marginBottom: isStarted ? "0" : ""}}>
                {digits.map((digit, index) => (
                  <div 
                    key={index} 
                    className={`slot-digit ${spinningIndex === index ? 'spinning' : ''} ${isComplete ? 'complete' : ''}`}
                  >
                    {digit}
                  </div>
                ))}
              </div>
              <button 
                className={`spin-button ${isStarted ? 'hidden' : ''}`}
                onClick={startSpinning}
                disabled={isStarted}
              >
                Spin For Score
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};
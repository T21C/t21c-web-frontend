import React, {useState, useRef, useEffect, useContext} from 'react';
import { LevelContext } from '../../context/LevelContext';
import './MiscDiffPopover.css';

const MiscDiffPopover = ({ content, prompt }) => {
    const {
        hideUnranked, setHideUnranked,
        hideCensored, setHideCensored,
        hideEpic, setHideEpic
    } = useContext(LevelContext)

    const miscDiffs = [hideUnranked, hideCensored, hideEpic]

    let miscCount = 0;

    useEffect(() => {
        miscCount = 0;
        for (let diff in miscDiffs) {
            if (!diff) ++miscCount
            console.log(miscCount)
        }
    }, [hideUnranked, hideCensored, hideEpic]);

    const [isVisible, setIsVisible] = useState(false); // Manages the visibility state of the popover
    const popoverRef = useRef(null); // Reference to the popover element
    const triggerRef = useRef(null); // Reference to the button element that triggers the popover

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target) &&
                !triggerRef.current.contains(event.target)
            ) {
                setIsVisible(false); // Close the popover if clicked outside
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="popover-container">
            <button
                ref={triggerRef}
                onClick={toggleVisibility}
                className="popover-trigger"
                aria-haspopup="true"
                aria-expanded={isVisible}
                aria-controls="popover-content"
            >

                <div>{miscCount} Selected</div>
                <svg xmlns="http://www.w3.org/2000/svg" height="14" width="8.75"
                     viewBox="0 0 320 512"
                     style={ isVisible ? { rotate: 180, transition: 0.5 } : { rotate: 0, transition: 0.5 } }
                >
                    <path fill="#ffffff" d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z"/>
                </svg>

            </button>
            {isVisible && (
                <div
                    id="popover-content"
                    ref={popoverRef}
                    className="popover-content"
                    role="dialog"
                    aria-modal="true"
                >

                    {/*{content}*/}
                    <div>
                        Non-Standard Diffs
                    </div>

                </div>
            )}
        </div>
    );
};

export default MiscDiffPopover;
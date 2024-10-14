import { useEffect, useRef, useContext } from 'react'

import { LevelContext } from "../../context/LevelContext.jsx";
import { DiffSliderContext } from "../../context/DiffSliderContext.jsx";

import './DifficultySlider.css'

import { getLevelImage } from "../../Repository/RemoteRepository/index.js";

// eslint-disable-next-line react/prop-types
const DifficultySlider = ({min, max}) => {
    /* react ref for minVal state */
    const minValRef = useRef(null);
    // react ref for maxVal state
    const maxValRef = useRef(null);

    const {
        selectedLowFilterDiff, setSelectedLowFilterDiff,
        selectedHighFilterDiff, setSelectedHighFilterDiff,
        diffs
    } = useContext(LevelContext)

    let {
        minVal, setMinVal,
        maxVal, setMaxVal,
        minValIcon, setMinValIcon,
        maxValIcon, setMaxValIcon,
    } = useContext(DiffSliderContext)

    // Set min query diff and icon when minVal state changes
    useEffect(() => {
        setSelectedLowFilterDiff(diffs[minVal].value)
        setMinValIcon(getLevelImage("", "", diffs[minVal].label, ""))
    }, [minVal])

    // Set max query diff and icon when maxVal state changes
    useEffect(() => {
        setSelectedHighFilterDiff(diffs[maxVal].value)
        setMaxValIcon(getLevelImage("", "", diffs[maxVal].label, ""))
        console.log(diffs[maxVal].label)
    }, [maxVal])

    return (
        <div className="slider-container">
            <div className="input-container">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={minVal}
                    onChange={(event) => {
                        const value = Math.min(+event.target.value, maxVal)
                        setMinVal(value)
                        event.target.value = value.toString()
                    }}
                    className={minVal === 54 ? 'thumb thumb-zindex-3 thumb-zindex-5' : 'thumb thumb-zindex-3'}
                />

                <input
                    type="range"
                    min={min}
                    max={max}
                    value={maxVal}
                    onChange={(event) => {
                        let value = Math.max(+event.target.value, minVal)
                        setMaxVal(value)
                        event.target.value = value.toString()
                    }}
                    className={maxVal === min ? 'thumb thumb-zindex-4  thumb-zindex-5' : 'thumb thumb-zindex-4'}
                />
            </div>

            <div className="slider">
                <div className="slider-track"/>

                <div className="slider-values">
                    <div className="slider-left-value">
                        <p className="value-text">Min:</p>
                        <img className="value-icon" src={minValIcon} alt=""/>
                    </div>
                    <div className="slider-right-value">
                        <p className="value-text">Max:</p>
                        <img className="value-icon" src={maxValIcon} alt=""/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DifficultySlider

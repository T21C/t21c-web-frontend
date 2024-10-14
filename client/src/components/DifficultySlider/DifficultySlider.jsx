import { ChangeEvent, FC, useCallback, useEffect, useState, useRef, useContext } from 'react'

import { LevelContext } from "../../context/LevelContext.jsx";
import { DiffSliderContext } from "../../context/DiffSliderContext.jsx";

import './DifficultySlider.css'

import { getLevelImage } from "../../Repository/RemoteRepository/index.js";

//import { DifficultyIcon } from '../../index'

// eslint-disable-next-line react/prop-types
const DifficultySlider = ({min, max, onChange}) => {
    // console.log(min, ' ', max)

    // // state holding the current value of the left slider thumb, default passed in Levels.tsx
    // const [minVal, setMinVal] = useState(min)
    // // state holding the current value of the right slider thumb, default passed in Levels.tsx
    // const [maxVal, setMaxVal] = useState(54) // 54 = U14, cant go higher
    /* react ref for minVal state */
    const minValRef = useRef(null);
    // react ref for maxVal state
    const maxValRef = useRef(null);
    // react ref of the difference between minVal and maxVal
    const range = useRef(null);

    const {
        selectedLowFilterDiff, setSelectedLowFilterDiff,
        selectedHighFilterDiff, setSelectedHighFilterDiff,
        diffs
    } = useContext(LevelContext)

    let {
        minVal, setMinVal,
        maxVal, setMaxVal,
        // minValRef, maxValRef,
        // range
    } = useContext(DiffSliderContext)

    // const changeMinDiffIconRef = useRef(null)
    // const changeMaxDiffIconRef = useRef(null)
    //
    // function changeMinDiffIcon(newMinDiff) {
    //     changeMinDiffIconRef.current.changeMinDiff(newMinDiff)
    // }
    // function changeMaxDiffIcon(newMaxDiff) {
    //     changeMaxDiffIconRef.current.changeMaxDiff(newMaxDiff)
    // }

    // Convert to percentage
    const getPercent = useCallback(
        (value) => Math.round(((value - min) / (max - min)) * 100),
        [min, max]
    )

    // Set width of the range to decrease from the left side
    useEffect(() => {
        if (maxValRef.current) {
            const minPercent = getPercent(minVal)
            const maxPercent = getPercent(+maxValRef.current.value) // Precede with '+' to convert the value from type string to type number

            if (range.current) {
                // range.current.style.left = `${minPercent}%`
                // range.current.style.width = `${maxPercent - minPercent}%`
                range.current.style.left = `${90}%`
                range.current.style.width = `${10}%`
            }
        }
    }, [minVal, getPercent])

    // Set width of the range to decrease from the right side
    useEffect(() => {
        if (minValRef.current) {
            const minPercent = getPercent(+minValRef.current.value)
            const maxPercent = getPercent(maxVal)

            if (range.current) {
                // range.current.style.width = `${maxPercent - minPercent}%`
                range.current.style.width = `${10}%`

            }
        }
    }, [maxVal, getPercent])

    // Get min and max values when their state changes
    useEffect(() => {
        onChange({ min: minVal, max: maxVal })
    }, [minVal, maxVal, onChange])


    // Set min query diff and icon when minVal state changes
    useEffect(() => {
        setSelectedLowFilterDiff(diffs[minVal])
        // changeMinDiffIcon(convertDiffIndexToSystems(minVal, 'TUF'))
    }, [minVal])

    // Set max query diff and icon when maxVal state changes
    useEffect(() => {
        setSelectedHighFilterDiff(diffs[maxVal])
        // changeMaxDiffIcon(convertDiffIndexToSystems(maxVal, 'TUF'))
    }, [maxVal])

    return (
        <div className="slider-container">
            <div className="input-container">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={minVal}
                    ref={minValRef}
                    onChange={(event) => {
                        const value = Math.min(+event.target.value, maxVal)
                        setMinVal(value)
                        event.target.value = value.toString()
                        console.log(getPercent(minVal))
                    }}
                    className={minVal === 54 ? 'thumb thumb-zindex-3 thumb-zindex-5' : 'thumb thumb-zindex-3'}
                />

                <input
                    type="range"
                    min={min}
                    max={max}
                    value={maxVal}
                    ref={maxValRef}
                    onChange={(event) => {
                        let value = Math.max(+event.target.value, minVal)
                        // as there are no levels higher than difficulty 54 (U14), don't let the user filter higher than 54.
                        value = (value < 55) ? value : 54
                        setMaxVal(value)
                        event.target.value = value.toString()
                    }}
                    className={maxVal === min ? 'thumb thumb-zindex-4  thumb-zindex-5' : 'thumb thumb-zindex-4'}
                />
            </div>

            <div className="slider">
                <div className="slider-track">
                    <div ref={range} className="slider-range"></div>
                </div>

                <div className="slider-left-value">
                    {/*<img src={getLevelImage(newDiff, pdnDiff, pguDiff, legacy)} alt=""/>*/}
                    {/*<DifficultyIcon*/}
                    {/*    ref={changeMinDiffIconRef}*/}
                    {/*    difficulty={convertDiffIndexToSystems(minVal, ratingSystem)}*/}
                    {/*    size={'36px'}*/}
                    {/*    censored={false}*/}
                    {/*    rated={true}*/}
                    {/*    impossible={false}*/}
                    {/*/>*/}
                </div>
                <div className="slider-right-value">
                    {/*<img src={getLevelImage(newDiff, pdnDiff, pguDiff, legacy)} alt=""/>*/}
                    {/*<DifficultyIcon*/}
                    {/*    ref={changeMaxDiffIconRef}*/}
                    {/*    difficulty={convertDiffIndexToSystems(maxVal, ratingSystem)}*/}
                    {/*    size={'36px'}*/}
                    {/*    censored={false}*/}
                    {/*    rated={true}*/}
                    {/*    impossible={false}*/}
                    {/*/>*/}
                </div>
            </div>
        </div>
    )
}

export default DifficultySlider

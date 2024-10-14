/* eslint-disable react/prop-types */
import { createContext, useState, useRef } from 'react'

const DiffSliderContext = createContext()

const DiffSliderContextProvider = (props) => {
    // state holding the current value of the left slider thumb, default passed in Levels.tsx
    const [minVal, setMinVal] = useState(1);
    // state holding the current value of the right slider thumb, default passed in Levels.tsx
    const [maxVal, setMaxVal] = useState(54); // 54 = U14, cant go higher
    /* react ref for minVal state */
    const minValRef = useRef(null);
    // react ref for maxVal state
    const maxValRef = useRef(null);
    // react ref of the difference between minVal and maxVal
    const range = useRef(null);

    return (
        <DiffSliderContext.Provider value={{ minVal, setMinVal, maxVal, setMaxVal, minValRef, maxValRef, range }}>
            {props.children}
        </DiffSliderContext.Provider>
    )
}

export { DiffSliderContext, DiffSliderContextProvider }

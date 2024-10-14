/* eslint-disable react/prop-types */
import { createContext, useState, useRef } from 'react'

const DiffSliderContext = createContext()

const DiffSliderContextProvider = (props) => {
    // state holding the current value of the left slider thumb, default passed in Levels.tsx
    const [minVal, setMinVal] = useState(1);
    // state holding the current value of the right slider thumb, default passed in Levels.tsx
    const [maxVal, setMaxVal] = useState(60); // 54 = U14, cant go higher

    const [minValIcon, setMinValIcon] = useState(null);
    const [maxValIcon, setMaxValIcon] = useState(null);

    return (
        <DiffSliderContext.Provider
            value={{
                minVal, setMinVal,
                maxVal, setMaxVal,
                minValIcon, setMinValIcon,
                maxValIcon, setMaxValIcon,
            }}
        >
            {props.children}
        </DiffSliderContext.Provider>
    )
}

export { DiffSliderContext, DiffSliderContextProvider }

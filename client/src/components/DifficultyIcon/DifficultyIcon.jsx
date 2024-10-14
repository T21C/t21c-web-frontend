/* eslint-disable react/display-name */

import {
    FC,
    forwardRef,
    ForwardRefExoticComponent,
    MutableRefObject,
    useEffect,
    useImperativeHandle,
    useState
} from 'react'

// import icon asset paths as record glob
const icons = import.meta.glob('../../../assets/T21C-assets/*/*.png', {
    eager: true
})

// type interface for the passed properties, ensures both existence, type and range check
// interface DifficultyIconProps {
//     difficulty: string
//     size: string
//     censored: boolean
//     rated: boolean
//     impossible: boolean
//     ref?: any
// }

// forwardRef arrow function to allow for function references in parent component
const DifficultyIcon = forwardRef(
    ({ difficulty, size, censored, rated, impossible }, ref) => {
        // state storing the card icon's level's difficulty
        const [difficultyState, setDifficultyState] = useState(difficulty)
        // state storing whether the difficulty is a censored difficulty value
        const [censoredState, setCensoredState] = useState(censored)
        // state storing whether the difficulty is rated, i.e. not an unrated difficulty value
        const [ratedState, setRatedState] = useState(rated)
        // state storing whether the difficulty is an impossible difficulty value
        const [impossibleState, setImpossibleState] = useState(impossible)

        // define function handler functions to be referenced in parent component
        useImperativeHandle(ref, () => ({
            changeMinDiff: (newMinDiff) => {
                setDifficultyState(newMinDiff)
                console.log('set min diff icon state to: ' + newMinDiff)
            },

            changeMaxDiff: (newMaxDiff) => {
                setDifficultyState(newMaxDiff)
                console.log('set max diff icon state to: ' + newMaxDiff)
            }
        }))

        // define the image file path using the passed properties
        // const url = (
        //     icons[
        //         `../../../assets/T21C-assets/${ // from the git module assets path
        //             !ratedState // if the level is NOT rated
        //                 ? 'miscDiff/Unranked' : censoredState // if the level is censored
        //                     ? 'miscDiff/-2' : impossibleState // if the level is rated impossible
        //                         ? 'miscDiff/21-' : (difficultyState == 'MA') // if the level is a long level (marathon)
        //                             ? 'miscDiff/ma' : 'pguDiff/' + difficultyState // otherwise, the level is a standard difficulty
        //         }.png` // path (should be) to a .png file
        //     ] as { default: string } | undefined
        // )?.default

        // return an image element with the defined `url` string
        return (
            <img
                src=""// src={url}
                width={size}
                height={size}
                alt={difficultyState}
                draggable="false"
            />
        )
    }
)

export default DifficultyIcon

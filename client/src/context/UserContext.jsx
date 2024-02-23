/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const UserContext = createContext()

const UserContextProvider = (props) => {
    const[levelData, setLevelData] = useState([])

    return(
        <UserContext.Provider value={{levelData, setLevelData}}>
            {props.children}
        </UserContext.Provider>
    )
}

export {UserContext, UserContextProvider}
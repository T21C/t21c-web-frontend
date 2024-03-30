/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const UserContext = createContext()

const UserContextProvider = (props) => {
    const[levelData, setLevelData] = useState([])
    const[playerData, setPlayerData] = useState([])

    return(
        <UserContext.Provider value={{levelData, setLevelData, playerData, setPlayerData}}>
            {props.children}
        </UserContext.Provider>
    )
}

export {UserContext, UserContextProvider}
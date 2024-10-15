/* eslint-disable react/prop-types */
import { createContext, useEffect, useState } from "react"

const UserContext = createContext()

const UserContextProvider = (props) => {
    const storedLanguage = localStorage.getItem('appLanguage') || 'us';
    const [language, setLanguage] = useState(storedLanguage)

    useEffect(() => {
        localStorage.setItem('appLanguage', language);
    }, [language]);
    

    return(
        <UserContext.Provider value={{ language, setLanguage }}>
            {props.children}
        </UserContext.Provider>
    )
}

export {UserContext, UserContextProvider}


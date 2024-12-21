/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const PlayerContext = createContext()

const PlayerContextProvider = (props) => {
    const [playerData, setPlayerData] = useState(null)
    const [sortOpen, setSortOpen] = useState(true);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("DESC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);
    const [sortBy, setSortBy] = useState("rankedScore")
    const [showBanned, setShowBanned] = useState("hide");

    return (
        <PlayerContext.Provider 
            value={{ 
                playerData, setPlayerData, 
                sortOpen, setSortOpen, 
                query, setQuery, 
                sortBy, setSortBy,
                sort, setSort, 
                hasMore, setHasMore, 
                pageNumber, setPageNumber,
                showBanned, setShowBanned
            }}
        >
            {props.children}
        </PlayerContext.Provider>
    )
}

export { PlayerContext, PlayerContextProvider }

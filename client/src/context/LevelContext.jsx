/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const LevelContext = createContext()

const LevelContextProvider = (props) => {
    const[levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(true);
    const [query, setQuery] = useState("");
    const [selectedFilterDiff, setSelectedFilterDiff] = useState(null);
    const [sort, setSort] = useState("RECENT_DESC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);

    return(
        <LevelContext.Provider value={{levelsData, setLevelsData, legacyDiff, setLegacyDiff, filterOpen, setFilterOpen, sortOpen, setSortOpen, query, setQuery,selectedFilterDiff, setSelectedFilterDiff, sort, setSort, hasMore, setHasMore, pageNumber, setPageNumber}}>
            {props.children}
        </LevelContext.Provider>
    )
}

export {LevelContext, LevelContextProvider}
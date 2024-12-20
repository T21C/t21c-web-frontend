/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const LevelContext = createContext()

const LevelContextProvider = (props) => {
    const [levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(true);
    const [query, setQuery] = useState("");
    const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState(null);
    const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState(null);
    const [sort, setSort] = useState("RECENT_DESC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);

    // Add new state for toggles
    const [hideUnranked, setHideUnranked] = useState(false);
    const [hideCensored, setHideCensored] = useState(false);
    const [hideEpic, setHideEpic] = useState(false);

    return (
        <LevelContext.Provider 
            value={{ 
                levelsData, setLevelsData, 
                legacyDiff, setLegacyDiff, 
                filterOpen, setFilterOpen, 
                sortOpen, setSortOpen, 
                query, setQuery, 
                selectedLowFilterDiff, setSelectedLowFilterDiff, 
                selectedHighFilterDiff, setSelectedHighFilterDiff, 
                hideUnranked, setHideUnranked, 
                hideCensored, setHideCensored, 
                hideEpic, setHideEpic,
                sort, setSort, 
                hasMore, setHasMore, 
                pageNumber, setPageNumber 
            }}
        >
            {props.children}
        </LevelContext.Provider>
    )
}

export { LevelContext, LevelContextProvider }

/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const LevelContext = createContext()

const LevelContextProvider = (props) => {
    const [levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(true);
    const [query, setQuery] = useState("");
    // Initialize with full PGU range
    const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState("P1");
    const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState("U20");
    const [sort, setSort] = useState("RECENT_DESC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);
    const [deletedFilter, setDeletedFilter] = useState("hide");
    const [clearedFilter, setClearedFilter] = useState("show");
    // Add new states for difficulty filtering with full PGU range
    const [sliderRange, setSliderRange] = useState([1, 60]); // P1 to U20
    const [selectedSpecialDiffs, setSelectedSpecialDiffs] = useState([]); // Empty array for no special difficulties

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
                sort, setSort, 
                hasMore, setHasMore, 
                pageNumber, setPageNumber,
                deletedFilter, setDeletedFilter,
                clearedFilter, setClearedFilter,
                // Add new states to context value
                sliderRange, setSliderRange,
                selectedSpecialDiffs, setSelectedSpecialDiffs
            }}
        >
            {props.children}
        </LevelContext.Provider>
    )
}

export { LevelContext, LevelContextProvider }

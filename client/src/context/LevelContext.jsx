/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const LevelContext = createContext()

const LevelContextProvider = (props) => {
    const [levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(false);
    const [filterOpen, setFilterOpen] = useState(true);
    const [sortOpen, setSortOpen] = useState(true);
    const [query, setQuery] = useState("");
    const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState("1");
    const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState("21.34");
    const [sort, setSort] = useState("RECENT_DESC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);

    // Add new state for toggles
    const [hideUnranked, setHideUnranked] = useState(false);
    const [hideCensored, setHideCensored] = useState(false);
    const [hideEpic, setHideEpic] = useState(false);
    
    // TODO: find better alternative for diff conversion in JSX
    const diffs = [
        { value: "0", label: "0" }, // only here for indexing purposes, never used
        { value: "1", label: "P1" },
        { value: "3", label: "P2" },
        { value: "4", label: "P3" },
        { value: "5", label: "P4" },
        { value: "6", label: "P5" },
        { value: "7", label: "P6" },
        { value: "8", label: "P7" },
        { value: "9", label: "P8" },
        { value: "10", label: "P9" },
        { value: "11", label: "P10" },
        { value: "12", label: "P11" },
        { value: "13", label: "P12" },
        { value: "14", label: "P13" },
        { value: "15", label: "P14" },
        { value: "16", label: "P15" },
        { value: "17", label: "P16" },
        { value: "18", label: "P17" },
        { value: "18.5", label: "P18" },
        { value: "19", label: "P19" },
        { value: "19.5", label: "P20" },
        { value: "20", label: "G1" },
        { value: "20.05", label: "G2" },
        { value: "20.1", label: "G3" },
        { value: "20.15", label: "G4" },
        { value: "20.2", label: "G5" },
        { value: "20.25", label: "G6" },
        { value: "20.3", label: "G7" },
        { value: "20.35", label: "G8" },
        { value: "20.4", label: "G9" },
        { value: "20.45", label: "G10" },
        { value: "20.5", label: "G11" },
        { value: "20.55", label: "G12" },
        { value: "20.6", label: "G13" },
        { value: "20.65", label: "G14" },
        { value: "20.7", label: "G15" },
        { value: "20.75", label: "G16" },
        { value: "20.8", label: "G17" },
        { value: "20.85", label: "G18" },
        { value: "20.9", label: "G19" },
        { value: "20.95", label: "G20" },
        { value: "21", label: "U1" },
        { value: "21.04", label: "U2" },
        { value: "21.05", label: "U3" },
        { value: "21.09", label: "U4" },
        { value: "21.1", label: "U5" },
        { value: "21.14", label: "U6" },
        { value: "21.15", label: "U7" },
        { value: "21.19", label: "U8" },
        { value: "21.2", label: "U9" },
        { value: "21.24", label: "U10" },
        { value: "21.25", label: "U11" },
        { value: "21.29", label: "U12" },
        { value: "21.3", label: "U13" },
        { value: "21.34", label: "U14" },
        { value: "21.35", label: "U15" },
        { value: "21.39", label: "U16" },
        { value: "21.4", label: "U17" },
        { value: "21.44", label: "U18" },
        { value: "21.45", label: "U19" },
        { value: "21.49", label: "U20" },
      ];
    
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
                diffs,
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

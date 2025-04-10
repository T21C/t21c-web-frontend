/* eslint-disable react/prop-types */
import { createContext, useState, useEffect } from "react"
import { useDifficultyContext } from "./DifficultyContext";
const LevelContext = createContext()

const LevelContextProvider = (props) => {

    const { difficulties } = useDifficultyContext();




    const [levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(false);
    const [filterOpen, setFilterOpen] = useState(true);
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
    const [sliderRange, setSliderRange] = useState([1, 60]);
    const [sliderQRange, setSliderQRange] = useState(["Q1", "Q1"]);
    const [sliderQRangeDrag, setSliderQRangeDrag] = useState([1, 1]);
    const [selectedSpecialDiffs, setSelectedSpecialDiffs] = useState([]);
    const [qSliderVisible, setQSliderVisible] = useState(false);

    useEffect(() => {
        // Initialize with full PGU range
        setSliderRange([1, difficulties.find(d => d.name === "U20")?.sortOrder || 60]);
        
        // Initialize Q range with first and last Q difficulty
        const qDifficulties = difficulties
            .filter(d => d.name.startsWith('Q'))
            .sort((a, b) => a.sortOrder - b.sortOrder);
            
        if (qDifficulties.length > 0) {
            const firstQ = qDifficulties[0].name;
            const lastQ = qDifficulties[qDifficulties.length - 1].name;
            setSliderQRange([firstQ, lastQ]);
            setSliderQRangeDrag([qDifficulties[0].sortOrder, qDifficulties[qDifficulties.length - 1].sortOrder]);
        } else {
            // Fallback if no Q difficulties exist
            setSliderQRange(["Q1", "Q1"]);
            setSliderQRangeDrag([1, 1]);
        }
    }, [difficulties]);

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
                sliderRange, setSliderRange,
                sliderQRange, setSliderQRange,
                sliderQRangeDrag, setSliderQRangeDrag,
                selectedSpecialDiffs, setSelectedSpecialDiffs,
                qSliderVisible, setQSliderVisible
            }}
        >
            {props.children}
        </LevelContext.Provider>
    )
}

export { LevelContext, LevelContextProvider }

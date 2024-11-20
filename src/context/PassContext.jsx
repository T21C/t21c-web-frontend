/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const PassContext = createContext()

const PassContextProvider = (props) => {
    const [passesData, setPassesData] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(true);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("RECENT_DESC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);

    // Pass-specific filters
    const [hideNHT, setHideNHT] = useState(false);
    const [hide12k, setHide12k] = useState(false);
    const [minAccuracy, setMinAccuracy] = useState(null);
    const [maxAccuracy, setMaxAccuracy] = useState(null);
    const [minScore, setMinScore] = useState(null);
    const [maxScore, setMaxScore] = useState(null);

    return (
        <PassContext.Provider 
            value={{ 
                passesData, setPassesData,
                filterOpen, setFilterOpen,
                sortOpen, setSortOpen,
                query, setQuery,
                hideNHT, setHideNHT,
                hide12k, setHide12k,
                minAccuracy, setMinAccuracy,
                maxAccuracy, setMaxAccuracy,
                minScore, setMinScore,
                maxScore, setMaxScore,
                sort, setSort,
                hasMore, setHasMore,
                pageNumber, setPageNumber
            }}
        >
            {props.children}
        </PassContext.Provider>
    )
}

export { PassContext, PassContextProvider } 
/* eslint-disable react/prop-types */
import { createContext, useState } from "react"

const UserContext = createContext()

const UserContextProvider = (props) => {
    const[levelsData, setLevelsData] = useState([])
    const [filterOpen, setFilterOpen] = useState(false);
    const [sortOpen, setSortOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedFilterDiff, setSelectedFilterDiff] = useState(null);
    const [sort, setSort] = useState("RECENT_DESC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);

    return(
        <UserContext.Provider value={{levelsData, setLevelsData, filterOpen, setFilterOpen, sortOpen, setSortOpen, query, setQuery,selectedFilterDiff, setSelectedFilterDiff, sort, setSort, hasMore, setHasMore, pageNumber, setPageNumber}}>
            {props.children}
        </UserContext.Provider>
    )
}

export {UserContext, UserContextProvider}
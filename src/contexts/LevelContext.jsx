/* eslint-disable react/prop-types */
import { createContext, useState, useEffect } from "react"
import { useDifficultyContext } from "./DifficultyContext";

const STORAGE_KEYS = {
    LEGACY_DIFF: 'level_legacy_diff',
    FILTER_OPEN: 'level_filter_open',
    SORT_OPEN: 'level_sort_open',
    QUERY: 'level_query',
    LOW_FILTER_DIFF: 'level_low_filter_diff',
    HIGH_FILTER_DIFF: 'level_high_filter_diff',
    SORT: 'level_sort',
    ORDER: 'level_order',
    DELETED_FILTER: 'level_deleted_filter',
    CLEARED_FILTER: 'level_cleared_filter',
    AVAILABLE_DL_FILTER: 'level_available_dl_filter',
    SLIDER_RANGE: 'level_slider_range',
    SLIDER_Q_RANGE: 'level_slider_q_range',
    SLIDER_Q_RANGE_DRAG: 'level_slider_q_range_drag',
    SELECTED_SPECIAL_DIFFS: 'level_selected_special_diffs',
    Q_SLIDER_VISIBLE: 'level_q_slider_visible',
    ONLY_MY_LIKES: 'level_only_my_likes',
    SELECTED_CURATION_TYPES: 'level_selected_curation_types',
    SELECTED_TAGS: 'level_selected_tags'
};

const LevelContext = createContext()

const LevelContextProvider = (props) => {
    const { noLegacyDifficulties: difficulties } = useDifficultyContext();

    const [levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(() => localStorage.getItem(STORAGE_KEYS.LEGACY_DIFF) === 'true');
    const [filterOpen, setFilterOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.FILTER_OPEN) !== 'false');
    const [sortOpen, setSortOpen] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT_OPEN) !== 'false');
    const [query, setQuery] = useState(() => localStorage.getItem(STORAGE_KEYS.QUERY) || "");
    const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState(() => localStorage.getItem(STORAGE_KEYS.LOW_FILTER_DIFF) || "P1");
    const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState(() => localStorage.getItem(STORAGE_KEYS.HIGH_FILTER_DIFF) || "U20");
    const [sort, setSort] = useState(() => localStorage.getItem(STORAGE_KEYS.SORT) || "RECENT");
    const [order, setOrder] = useState(() => localStorage.getItem(STORAGE_KEYS.ORDER) || "ASC");
    const [hasMore, setHasMore] = useState(true);
    const [totalLevels, setTotalLevels] = useState(0);
    const [pageNumber, setPageNumber] = useState(0);
    const [deletedFilter, setDeletedFilter] = useState(() => localStorage.getItem(STORAGE_KEYS.DELETED_FILTER) || "hide");
    const [availableDlFilter, setAvailableDlFilter] = useState(() => localStorage.getItem(STORAGE_KEYS.AVAILABLE_DL_FILTER) || "show");
    const [clearedFilter, setClearedFilter] = useState(() => localStorage.getItem(STORAGE_KEYS.CLEARED_FILTER) || "show");
    const [sliderRange, setSliderRange] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SLIDER_RANGE);
        return saved ? JSON.parse(saved) : [1, 9999];
    });
    const [sliderQRange, setSliderQRange] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SLIDER_Q_RANGE);
        return saved ? JSON.parse(saved) : [];
    });
    const [sliderQRangeDrag, setSliderQRangeDrag] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG);
        return saved ? JSON.parse(saved) : [1, 9999];
    });
    const [selectedSpecialDiffs, setSelectedSpecialDiffs] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_SPECIAL_DIFFS);
        return saved ? JSON.parse(saved) : [];
    });
    const [qSliderVisible, setQSliderVisible] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.Q_SLIDER_VISIBLE);
        return saved != null ? saved === 'true' : true;
    });
    const [onlyMyLikes, setOnlyMyLikes] = useState(() => localStorage.getItem(STORAGE_KEYS.ONLY_MY_LIKES) === 'true');
    const [selectedCurationTypes, setSelectedCurationTypes] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_CURATION_TYPES);
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedTags, setSelectedTags] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_TAGS);
        return saved ? JSON.parse(saved) : [];
    });
    // Effect to validate and adjust ranges based on difficulties
    useEffect(() => {
        if (difficulties.length > 0) {
            const maxDifficulty = difficulties.find(d => d.name === "U20")?.sortOrder || 60;
            
            // Validate and adjust sliderRange if needed
            const currentRange = [...sliderRange];
            if (currentRange[0] < 1 || currentRange[1] > maxDifficulty) {
                const newRange = [1, maxDifficulty];
                setSliderRange(newRange);
                localStorage.setItem(STORAGE_KEYS.SLIDER_RANGE, JSON.stringify(newRange));
            }
            
            // Get available Q difficulties (includes GQ)
            const qDifficulties = difficulties
                .filter(d => d.name.includes('Q'))
                .sort((a, b) => a.sortOrder - b.sortOrder);

            if (qDifficulties.length > 0) {
                const availableQNames = qDifficulties.map(d => d.name);
                const minQOrder = qDifficulties[0].sortOrder;
                const maxQOrder = qDifficulties[qDifficulties.length - 1].sortOrder;

                // Validate and adjust sliderQRange if needed
                const currentQRange = [...sliderQRange];
                const currentQRangeDrag = [...sliderQRangeDrag];
                
                const needsQRangeReset = currentQRange.length === 0 || 
                    !currentQRange.every(q => availableQNames.includes(q));
                
                const needsDragReset = currentQRangeDrag[0] < minQOrder || 
                    currentQRangeDrag[1] > maxQOrder;

                if (needsQRangeReset) {
                    setSliderQRange(availableQNames);
                    localStorage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE, JSON.stringify(availableQNames));
                }

                if (needsDragReset) {
                    setSliderQRangeDrag([minQOrder, maxQOrder]);
                    localStorage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify([minQOrder, maxQOrder]));
                }
            } else {
                setSliderQRange([]);
                setSliderQRangeDrag([1, 9999]);
                localStorage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE, JSON.stringify([]));
                localStorage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify([1, 9999]));
            }
        }
    }, [difficulties]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.LEGACY_DIFF, legacyDiff);
    }, [legacyDiff]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.FILTER_OPEN, filterOpen);
    }, [filterOpen]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SORT_OPEN, sortOpen);
    }, [sortOpen]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.QUERY, query);
    }, [query]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.LOW_FILTER_DIFF, selectedLowFilterDiff);
    }, [selectedLowFilterDiff]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.HIGH_FILTER_DIFF, selectedHighFilterDiff);
    }, [selectedHighFilterDiff]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SORT, sort);
    }, [sort]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.ORDER, order);
    }, [order]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.DELETED_FILTER, deletedFilter);
    }, [deletedFilter]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.CLEARED_FILTER, clearedFilter);
    }, [clearedFilter]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.AVAILABLE_DL_FILTER, availableDlFilter);
    }, [availableDlFilter]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SLIDER_RANGE, JSON.stringify(sliderRange));
    }, [sliderRange]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE, JSON.stringify(sliderQRange));
    }, [sliderQRange]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify(sliderQRangeDrag));
    }, [sliderQRangeDrag]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SELECTED_SPECIAL_DIFFS, JSON.stringify(selectedSpecialDiffs));
    }, [selectedSpecialDiffs]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.Q_SLIDER_VISIBLE, qSliderVisible);
    }, [qSliderVisible]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.ONLY_MY_LIKES, onlyMyLikes);
    }, [onlyMyLikes]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEYS.SELECTED_CURATION_TYPES, JSON.stringify(selectedCurationTypes));
    }, [selectedCurationTypes]);

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
                order, setOrder,
                hasMore, setHasMore, 
                totalLevels, setTotalLevels,
                pageNumber, setPageNumber,
                deletedFilter, setDeletedFilter,
                clearedFilter, setClearedFilter,
                availableDlFilter, setAvailableDlFilter,
                sliderRange, setSliderRange,
                sliderQRange, setSliderQRange,
                sliderQRangeDrag, setSliderQRangeDrag,
                selectedSpecialDiffs, setSelectedSpecialDiffs,
                qSliderVisible, setQSliderVisible,
                onlyMyLikes, setOnlyMyLikes,
                selectedCurationTypes, setSelectedCurationTypes,
                selectedTags, setSelectedTags
            }}
        >
            {props.children}
        </LevelContext.Provider>
    )
}

export { LevelContext, LevelContextProvider }

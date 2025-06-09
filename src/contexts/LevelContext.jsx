/* eslint-disable react/prop-types */
import { createContext, useState, useEffect } from "react"
import { useDifficultyContext } from "./DifficultyContext";
import Cookies from 'js-cookie';

const LevelContext = createContext()

const LevelContextProvider = (props) => {
    const { difficulties } = useDifficultyContext();

    // Cookie keys
    const COOKIE_KEYS = {
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
        ONLY_MY_LIKES: 'level_only_my_likes'
    };

    const [levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(() => Cookies.get(COOKIE_KEYS.LEGACY_DIFF) === 'true');
    const [filterOpen, setFilterOpen] = useState(() => Cookies.get(COOKIE_KEYS.FILTER_OPEN) !== 'false');
    const [sortOpen, setSortOpen] = useState(() => Cookies.get(COOKIE_KEYS.SORT_OPEN) !== 'false');
    const [query, setQuery] = useState(() => Cookies.get(COOKIE_KEYS.QUERY) || "");
    const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState(() => Cookies.get(COOKIE_KEYS.LOW_FILTER_DIFF) || "P1");
    const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState(() => Cookies.get(COOKIE_KEYS.HIGH_FILTER_DIFF) || "U20");
    const [sort, setSort] = useState(() => Cookies.get(COOKIE_KEYS.SORT) || "RECENT");
    const [order, setOrder] = useState(() => Cookies.get(COOKIE_KEYS.ORDER) || "ASC");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);
    const [deletedFilter, setDeletedFilter] = useState(() => Cookies.get(COOKIE_KEYS.DELETED_FILTER) || "hide");
    const [availableDlFilter, setAvailableDlFilter] = useState(() => Cookies.get(COOKIE_KEYS.AVAILABLE_DL_FILTER) || "show");
    const [clearedFilter, setClearedFilter] = useState(() => Cookies.get(COOKIE_KEYS.CLEARED_FILTER) || "show");
    const [sliderRange, setSliderRange] = useState(() => {
        const saved = Cookies.get(COOKIE_KEYS.SLIDER_RANGE);
        return saved ? JSON.parse(saved) : [1, 60];
    });
    const [sliderQRange, setSliderQRange] = useState(() => {
        const saved = Cookies.get(COOKIE_KEYS.SLIDER_Q_RANGE);
        return saved ? JSON.parse(saved) : [];
    });
    const [sliderQRangeDrag, setSliderQRangeDrag] = useState(() => {
        const saved = Cookies.get(COOKIE_KEYS.SLIDER_Q_RANGE_DRAG);
        return saved ? JSON.parse(saved) : [1, 1];
    });
    const [selectedSpecialDiffs, setSelectedSpecialDiffs] = useState(() => {
        const saved = Cookies.get(COOKIE_KEYS.SELECTED_SPECIAL_DIFFS);
        return saved ? JSON.parse(saved) : [];
    });
    const [qSliderVisible, setQSliderVisible] = useState(() => Cookies.get(COOKIE_KEYS.Q_SLIDER_VISIBLE) === 'true');
    const [onlyMyLikes, setOnlyMyLikes] = useState(() => Cookies.get(COOKIE_KEYS.ONLY_MY_LIKES) === 'true');

    // Effect to validate and adjust ranges based on difficulties
    useEffect(() => {
        if (difficulties.length > 0) {
            const maxDifficulty = difficulties.find(d => d.name === "U20")?.sortOrder || 60;
            
            // Validate and adjust sliderRange if needed
            const currentRange = [...sliderRange];
            if (currentRange[0] < 1 || currentRange[1] > maxDifficulty) {
                const newRange = [1, maxDifficulty];
                setSliderRange(newRange);
                Cookies.set(COOKIE_KEYS.SLIDER_RANGE, JSON.stringify(newRange));
            }
            
            // Get available Q difficulties
            const qDifficulties = difficulties
                .filter(d => d.name.startsWith('Q'))
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
                    Cookies.set(COOKIE_KEYS.SLIDER_Q_RANGE, JSON.stringify(availableQNames));
                }

                if (needsDragReset) {
                    setSliderQRangeDrag([minQOrder, maxQOrder]);
                    Cookies.set(COOKIE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify([minQOrder, maxQOrder]));
                }
            } else {
                // Only reset if there are no Q difficulties
                setSliderQRange([]);
                setSliderQRangeDrag([1, 1]);
                Cookies.set(COOKIE_KEYS.SLIDER_Q_RANGE, JSON.stringify([]));
                Cookies.set(COOKIE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify([1, 1]));
            }
        }
    }, [difficulties]);

    // Effects to save state changes to cookies
    useEffect(() => {
        Cookies.set(COOKIE_KEYS.LEGACY_DIFF, legacyDiff);
    }, [legacyDiff]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.FILTER_OPEN, filterOpen);
    }, [filterOpen]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SORT_OPEN, sortOpen);
    }, [sortOpen]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.QUERY, query);
    }, [query]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.LOW_FILTER_DIFF, selectedLowFilterDiff);
    }, [selectedLowFilterDiff]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.HIGH_FILTER_DIFF, selectedHighFilterDiff);
    }, [selectedHighFilterDiff]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SORT, sort);
    }, [sort]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.ORDER, order);
    }, [order]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.DELETED_FILTER, deletedFilter);
    }, [deletedFilter]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.CLEARED_FILTER, clearedFilter);
    }, [clearedFilter]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.AVAILABLE_DL_FILTER, availableDlFilter);
    }, [availableDlFilter]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SLIDER_RANGE, JSON.stringify(sliderRange));
    }, [sliderRange]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SLIDER_Q_RANGE, JSON.stringify(sliderQRange));
    }, [sliderQRange]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify(sliderQRangeDrag));
    }, [sliderQRangeDrag]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SELECTED_SPECIAL_DIFFS, JSON.stringify(selectedSpecialDiffs));
    }, [selectedSpecialDiffs]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.Q_SLIDER_VISIBLE, qSliderVisible);
    }, [qSliderVisible]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.ONLY_MY_LIKES, onlyMyLikes);
    }, [onlyMyLikes]);

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
                pageNumber, setPageNumber,
                deletedFilter, setDeletedFilter,
                clearedFilter, setClearedFilter,
                availableDlFilter, setAvailableDlFilter,
                sliderRange, setSliderRange,
                sliderQRange, setSliderQRange,
                sliderQRangeDrag, setSliderQRangeDrag,
                selectedSpecialDiffs, setSelectedSpecialDiffs,
                qSliderVisible, setQSliderVisible,
                onlyMyLikes, setOnlyMyLikes
            }}
        >
            {props.children}
        </LevelContext.Provider>
    )
}

export { LevelContext, LevelContextProvider }

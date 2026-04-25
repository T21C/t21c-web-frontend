/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useRef } from "react"
import { useDifficultyContext } from "./DifficultyContext";
import { migrateLegacyNamesToFacet } from "@/utils/facetQueryCodec";

const BASE_STORAGE_KEYS = {
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
    /** @deprecated migrated to LEVEL_FACET_V1 */
    SELECTED_CURATION_TYPES: 'level_selected_curation_types',
    /** @deprecated migrated to LEVEL_FACET_V1 */
    SELECTED_TAGS: 'level_selected_tags',
    LEVEL_FACET_V1: 'level_facet_v1',
};

/**
 * Build a prefixed copy of the storage key map. The prefix lets us mount
 * multiple isolated LevelContextProviders (e.g. one global + one per
 * creator profile) without their state colliding in storage.
 */
function buildStorageKeys(prefix) {
    if (!prefix) return BASE_STORAGE_KEYS;
    const out = {};
    for (const k of Object.keys(BASE_STORAGE_KEYS)) {
        out[k] = `${prefix}${BASE_STORAGE_KEYS[k]}`;
    }
    return out;
}

const LevelContext = createContext()

function loadLevelFacetV1(STORAGE_KEYS, storage) {
    try {
        const r = storage.getItem(STORAGE_KEYS.LEVEL_FACET_V1);
        if (r) {
            const p = JSON.parse(r);
            if (p && typeof p === 'object') {
                return {
                    tags: p.tags ?? null,
                    curationTypes: p.curationTypes ?? null,
                    combine: p.combine === 'or' ? 'or' : 'and',
                };
            }
        }
    } catch { /* ignore */ }
    return { tags: null, curationTypes: null, combine: 'and' };
}

const LevelContextProvider = (props) => {
    const { storagePrefix = '' } = props;
    // Stable per-mount key map. The prefix is treated as an immutable identity
    // for the provider; if it changes the provider should be re-mounted (new key).
    const STORAGE_KEYS = useRef(buildStorageKeys(storagePrefix)).current;
    // Prefixed providers are scoped to a single embed (e.g. one creator profile).
    // Persisting their per-id state to storage would accumulate forever, so
    // we route them through sessionStorage instead — settings live for the tab
    // session and disappear when it closes. The unprefixed global provider keeps
    // using storage so the main /levels page state still persists.
    const storage = useRef(storagePrefix ? sessionStorage : localStorage).current;

    const {
        noLegacyDifficulties: difficulties,
        tags,
        curationTypes,
        tagsLoading,
        curationTypesLoading,
    } = useDifficultyContext();

    const [levelsData, setLevelsData] = useState([])
    const [legacyDiff, setLegacyDiff] = useState(() => storage.getItem(STORAGE_KEYS.LEGACY_DIFF) === 'true');
    const [filterOpen, setFilterOpen] = useState(() => storage.getItem(STORAGE_KEYS.FILTER_OPEN) !== 'false');
    const [sortOpen, setSortOpen] = useState(() => storage.getItem(STORAGE_KEYS.SORT_OPEN) !== 'false');
    const [query, setQuery] = useState(() => storage.getItem(STORAGE_KEYS.QUERY) || "");
    const [selectedLowFilterDiff, setSelectedLowFilterDiff] = useState(() => storage.getItem(STORAGE_KEYS.LOW_FILTER_DIFF) || "P1");
    const [selectedHighFilterDiff, setSelectedHighFilterDiff] = useState(() => storage.getItem(STORAGE_KEYS.HIGH_FILTER_DIFF) || "U20");
    const [sort, setSort] = useState(() => storage.getItem(STORAGE_KEYS.SORT) || "RECENT");
    const [order, setOrder] = useState(() => storage.getItem(STORAGE_KEYS.ORDER) || "ASC");
    const [hasMore, setHasMore] = useState(true);
    const [totalLevels, setTotalLevels] = useState(0);
    const [pageNumber, setPageNumber] = useState(0);
    const [deletedFilter, setDeletedFilter] = useState(() => storage.getItem(STORAGE_KEYS.DELETED_FILTER) || "hide");
    const [availableDlFilter, setAvailableDlFilter] = useState(() => storage.getItem(STORAGE_KEYS.AVAILABLE_DL_FILTER) || "show");
    const [clearedFilter, setClearedFilter] = useState(() => storage.getItem(STORAGE_KEYS.CLEARED_FILTER) || "show");
    const [sliderRange, setSliderRange] = useState(() => {
        const saved = storage.getItem(STORAGE_KEYS.SLIDER_RANGE);
        return saved ? JSON.parse(saved) : [1, 9999];
    });
    const [sliderQRange, setSliderQRange] = useState(() => {
        const saved = storage.getItem(STORAGE_KEYS.SLIDER_Q_RANGE);
        return saved ? JSON.parse(saved) : [];
    });
    const [sliderQRangeDrag, setSliderQRangeDrag] = useState(() => {
        const saved = storage.getItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG);
        return saved ? JSON.parse(saved) : [1, 9999];
    });
    const [selectedSpecialDiffs, setSelectedSpecialDiffs] = useState(() => {
        const saved = storage.getItem(STORAGE_KEYS.SELECTED_SPECIAL_DIFFS);
        return saved ? JSON.parse(saved) : [];
    });
    const [qSliderVisible, setQSliderVisible] = useState(() => {
        const saved = storage.getItem(STORAGE_KEYS.Q_SLIDER_VISIBLE);
        return saved != null ? saved === 'true' : true;
    });
    const [onlyMyLikes, setOnlyMyLikes] = useState(() => storage.getItem(STORAGE_KEYS.ONLY_MY_LIKES) === 'true');
    const [levelFacetFilters, setLevelFacetFilters] = useState(() => loadLevelFacetV1(STORAGE_KEYS, storage));
    const levelFacetMigrationDoneRef = useRef(false);
    // Effect to validate and adjust ranges based on difficulties
    useEffect(() => {
        if (difficulties.length > 0) {
            const maxDifficulty = difficulties.find(d => d.name === "U20")?.sortOrder || 60;
            
            // Validate and adjust sliderRange if needed
            const currentRange = [...sliderRange];
            if (currentRange[0] < 1 || currentRange[1] > maxDifficulty) {
                const newRange = [1, maxDifficulty];
                setSliderRange(newRange);
                storage.setItem(STORAGE_KEYS.SLIDER_RANGE, JSON.stringify(newRange));
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
                    storage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE, JSON.stringify(availableQNames));
                }

                if (needsDragReset) {
                    setSliderQRangeDrag([minQOrder, maxQOrder]);
                    storage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify([minQOrder, maxQOrder]));
                }
            } else {
                setSliderQRange([]);
                setSliderQRangeDrag([1, 9999]);
                storage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE, JSON.stringify([]));
                storage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify([1, 9999]));
            }
        }
    }, [difficulties]);

    /** One-time: legacy name arrays -> level_facet_v1 (must run before persisting empty state) */
    useEffect(() => {
        if (tagsLoading || curationTypesLoading) return;
        if (levelFacetMigrationDoneRef.current) return;
        levelFacetMigrationDoneRef.current = true;
        if (storage.getItem(STORAGE_KEYS.LEVEL_FACET_V1)) return;
        try {
            const rawT = storage.getItem(STORAGE_KEYS.SELECTED_TAGS);
            const rawC = storage.getItem(STORAGE_KEYS.SELECTED_CURATION_TYPES);
            const tagNames = rawT ? JSON.parse(rawT) : [];
            const ctNames = rawC ? JSON.parse(rawC) : [];
            const next = migrateLegacyNamesToFacet(
                Array.isArray(tagNames) ? tagNames : [],
                Array.isArray(ctNames) ? ctNames : [],
                tags || [],
                curationTypes || []
            );
            setLevelFacetFilters(next);
            storage.setItem(STORAGE_KEYS.LEVEL_FACET_V1, JSON.stringify(next));
        } catch (e) {
            console.error('Level facet migration failed', e);
            const fallback = { tags: null, curationTypes: null, combine: 'and' };
            setLevelFacetFilters(fallback);
            storage.setItem(STORAGE_KEYS.LEVEL_FACET_V1, JSON.stringify(fallback));
        }
    }, [tagsLoading, curationTypesLoading, tags, curationTypes]);

    useEffect(() => {
        if (!levelFacetMigrationDoneRef.current) return;
        storage.setItem(STORAGE_KEYS.LEVEL_FACET_V1, JSON.stringify(levelFacetFilters));
    }, [levelFacetFilters]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.LEGACY_DIFF, legacyDiff);
    }, [legacyDiff]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.FILTER_OPEN, filterOpen);
    }, [filterOpen]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.SORT_OPEN, sortOpen);
    }, [sortOpen]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.QUERY, query);
    }, [query]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.LOW_FILTER_DIFF, selectedLowFilterDiff);
    }, [selectedLowFilterDiff]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.HIGH_FILTER_DIFF, selectedHighFilterDiff);
    }, [selectedHighFilterDiff]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.SORT, sort);
    }, [sort]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.ORDER, order);
    }, [order]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.DELETED_FILTER, deletedFilter);
    }, [deletedFilter]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.CLEARED_FILTER, clearedFilter);
    }, [clearedFilter]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.AVAILABLE_DL_FILTER, availableDlFilter);
    }, [availableDlFilter]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.SLIDER_RANGE, JSON.stringify(sliderRange));
    }, [sliderRange]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE, JSON.stringify(sliderQRange));
    }, [sliderQRange]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.SLIDER_Q_RANGE_DRAG, JSON.stringify(sliderQRangeDrag));
    }, [sliderQRangeDrag]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.SELECTED_SPECIAL_DIFFS, JSON.stringify(selectedSpecialDiffs));
    }, [selectedSpecialDiffs]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.Q_SLIDER_VISIBLE, qSliderVisible);
    }, [qSliderVisible]);

    useEffect(() => {
        storage.setItem(STORAGE_KEYS.ONLY_MY_LIKES, onlyMyLikes);
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
                levelFacetFilters, setLevelFacetFilters
            }}
        >
            {props.children}
        </LevelContext.Provider>
    )
}

export { LevelContext, LevelContextProvider }

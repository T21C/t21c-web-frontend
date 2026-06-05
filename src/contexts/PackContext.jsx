// tuf-search: #PackContext #packContext
/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import axios from "axios";
import api from '@/utils/api';
import { routes } from '@/api/routes';
import { useDebouncedRequest } from '@/hooks/useDebouncedRequest';
import { useAuth } from './AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { LevelPackViewModes } from "@/utils/constants";
import { parseHashtagPackQuery } from '@/utils/normalizeEntitySearchQuery';

const PackContext = createContext()

const PackContextProvider = (props) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);

    const [favorites, setFavorites] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    
    const [filters, setFilters] = useState(() => ({
        query: localStorage.getItem('pack_query') || "",
        viewMode: localStorage.getItem('pack_viewMode') || LevelPackViewModes.PUBLIC,
        sort: localStorage.getItem('pack_sort') || "RECENT",
        order: localStorage.getItem('pack_order') || "DESC",
        myLikesOnly: localStorage.getItem('pack_myLikesOnly') === 'true' || false
    }));
    
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    useEffect(() => {
        Object.entries(filters).forEach(([key, value]) => {
            const str = value === null || value === undefined ? '' : String(value);
            localStorage.setItem(`pack_${key}`, str);
        });
    }, [filters]);

    // Force update state for triggering re-fetches
    const [forceUpdate, setForceUpdate] = useState(false);

    const applyPresetQuery = useCallback((query, { force = false } = {}) => {
        const trimmed = typeof query === 'string' ? query.trim() : '';
        if (!force && filtersRef.current.query === trimmed) {
            return;
        }
        const nextFilters = { ...filtersRef.current, query: trimmed };
        filtersRef.current = nextFilters;
        setFilters(nextFilters);
        setPageNumber(0);
        setPacks([]);
        setError(false);
        setForceUpdate((f) => !f);
    }, []);

    // Preset searches from router state, window context, or URL (?levelId=)
    useEffect(() => {
        const stateQuery = location.state?.packSearchQuery;
        if (typeof stateQuery === 'string' && stateQuery.trim()) {
            applyPresetQuery(stateQuery, { force: true });
            navigate(
                { pathname: location.pathname, search: location.search },
                { replace: true, state: null },
            );
            return;
        }

        if (window.packSearchContext?.query) {
            const contextQuery = window.packSearchContext.query;
            delete window.packSearchContext;
            applyPresetQuery(contextQuery, { force: true });
            return;
        }

        const urlParams = new URLSearchParams(location.search);
        const levelId = urlParams.get('levelId');
        if (levelId) {
            applyPresetQuery(`levelId:${levelId}`);
        }
    }, [location.pathname, location.search, location.key, location.state, applyPresetQuery, navigate]);

    // Debounced + cancellation-aware request runner. Filter / query changes
    // wait 500ms (collapsing rapid keystrokes into one request); pagination
    // bypasses the debounce via `runRequest.flush`.
    const runRequest = useDebouncedRequest(500);

    // Pack browsing function (page-exclusive)
    const fetchPacks = useCallback(async () => {
        setLoading(true);
        setError(false);

        const currentFilters = filtersRef.current;
        const trimmedQuery = currentFilters.query.trim();
        const packLookupId = parseHashtagPackQuery(trimmedQuery);
        const runner = pageNumber > 0 ? runRequest.flush : runRequest;

        if (packLookupId && pageNumber === 0) {
            try {
                const response = await runner(({ signal }) =>
                    api.get(routes.database.levels.packs.byId(packLookupId), { signal })
                );
                const pack = response.data;
                setPacks(pack ? [pack] : []);
                setHasMore(false);
                setLoading(false);
                return;
            } catch (error) {
                if (axios.isCancel(error)) return;
                setPacks([]);
                setHasMore(false);
                setLoading(false);
                if (error.response?.status !== 404) {
                    console.error('Error fetching pack by id:', error);
                }
                return;
            }
        }

        const params = {
            offset: pageNumber * 30,
            limit: 30,
            sort: currentFilters.sort,
            order: currentFilters.order
        };

        // Add search parameters
        if (trimmedQuery) params.query = trimmedQuery;
        if (currentFilters.viewMode !== 'all') params.viewMode = currentFilters.viewMode;
        if (currentFilters.myLikesOnly) params.myLikesOnly = currentFilters.myLikesOnly;

        try {
            const response = await runner(({ signal }) =>
                api.get(routes.database.levels.packs.root(), { params, signal })
            );
            const newPacks = response.data.packs || [];

            // Use functional updates to avoid race conditions
            setPacks(prevPacks => {
                if (pageNumber === 0) {
                    return newPacks;
                } else {
                    return [...prevPacks, ...newPacks];
                }
            });
            setHasMore(newPacks.length === 30);
            setLoading(false);
        } catch (error) {
            if (axios.isCancel(error)) return; // superseded by a newer request
            console.error('Error fetching packs:', error);
            setError(true);
            setLoading(false);
        }
    }, [pageNumber, runRequest]);

    // Centralized refresh function
    const triggerRefresh = useCallback(() => {
        setPageNumber(0);
        setPacks([]);
        setError(false);
        if (filtersRef.current.viewMode === 'favorites') {
            setFavorites([]);
        }
        setForceUpdate(f => !f);
    }, []);

    // Retry function for infinite scroll errors
    const retryLoadMore = useCallback(() => {
        if (error) {
            setError(false);
            setForceUpdate(f => !f);
        }
    }, [error]);

    // Load more function
    const loadMore = useCallback(() => {
        if (filtersRef.current.viewMode === 'favorites') {
            // Favorites don't support pagination, do nothing
            return;
        }
        if (hasMore && !loading && !error) {
            setPageNumber(prev => prev + 1);
        }
    }, [hasMore, error]);


    // Favorites operations
    const fetchFavorites = useCallback(async () => {
        if (!user) {
            setFavorites([]);
            return;
        }

        setFavoritesLoading(true);
        setError(false);
        try {
            const response = await api.get(routes.database.levels.packs.favorites());
            setFavorites(response.data.packs || []);
        } catch (error) {
            console.error('Error fetching favorites:', error);
            setError(true);
            setFavorites([]);
        } finally {
            setFavoritesLoading(false);
        }
    }, [user]);

    // Effect to fetch packs when dependencies change
    useEffect(() => {
        if (filtersRef.current.viewMode === 'favorites') {
            fetchFavorites();
        } else {
            fetchPacks();
        }
    }, [fetchPacks, fetchFavorites, forceUpdate]);

    // General pack operations (for page use)
    const createPack = async (packData) => {
        try {
            const response = await api.post(routes.database.levels.packs.root(), packData);
            // Refresh page pack list
            triggerRefresh();
            return response.data;
        } catch (error) {
            console.error('Error creating pack:', error);
            throw error;
        }
    };

    const updatePack = async (packId, updateData) => {
        try {
            const response = await api.put(routes.database.levels.packs.byId(packId), updateData);
            triggerRefresh();
            return response.data;
        } catch (error) {
            console.error('Error updating pack:', error);
            throw error;
        }
    };

    const deletePack = async (packId) => {
        try {
            await api.delete(routes.database.levels.packs.byId(packId));
            triggerRefresh();
        } catch (error) {
            console.error('Error deleting pack:', error);
            throw error;
        }
    };

    // Add level to pack
    const addLevelToPack = async (packId, levelId, sortOrder = null) => {
        try {
            const response = await api.post(routes.database.levels.packs.levels(packId), {
                levelId,
                sortOrder
            });
            return response.data;
        } catch (error) {
            console.error('Error adding level to pack:', error);
            throw error;
        }
    };

    // Remove level from pack
    const removeLevelFromPack = async (packId, levelId) => {
        try {
            await api.delete(routes.database.levels.packs.level(packId, levelId));
        } catch (error) {
            console.error('Error removing level from pack:', error);
            throw error;
        }
    };

    // Reorder levels in pack
    const reorderPackLevels = async (packId, levelOrders) => {
        try {
            await api.put(routes.database.levels.packs.levelsReorder(packId), {
                levelOrders
            });
        } catch (error) {
            console.error('Error reordering pack levels:', error);
            throw error;
        }
    };

    // Filter management
    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setFilters({
            query: "",
            viewMode: LevelPackViewModes.PUBLIC,
            sort: "RECENT",
            order: "DESC",
            myLikesOnly: false
        });
    };

    const toggleFavorite = useCallback(async (packId) => {
        try {
            // Determine desired state based on current favorite status
            const currentlyFavorited = packs.some(pack => pack.id === packId && pack.isFavorited);
            const desiredFavorited = !currentlyFavorited;
            
            const response = await api.put(routes.database.levels.packs.favorite(packId), { 
                favorited: desiredFavorited 
            });

            // Update the pack in the main packs list if it exists
            if (response.data.success) {
                setPacks(prevPacks =>
                    prevPacks.map(pack =>
                        pack.id === packId
                            ? { ...pack, isFavorited: response.data.favorited }
                            : pack
                    )
                );
            }

            return { success: true, isFavorited: response.data.favorited };
        } catch (error) {
            console.error('Error toggling favorite:', error);
            return { success: false};
        }
    }, [packs]);

    const getPackById = useCallback((packId) => {
        return packs.find(pack => pack.id === packId);
    }, [packs]);

    // Handle my likes toggle
    const handleMyLikesToggle = useCallback(() => {
        setFilters(prev => ({ ...prev, myLikesOnly: !prev.myLikesOnly }));
        triggerRefresh();
    }, [triggerRefresh]);

    const contextValue = {
        // Page-exclusive state for browsing/filtering
        packs,
        filters,
        loading,
        error,
        hasMore,
        pageNumber,

        // Favorites state
        favorites,
        favoritesLoading,

        // Page browsing actions
        fetchPacks,
        triggerRefresh,
        loadMore,
        retryLoadMore,
        updateFilter,
        resetFilters,

        // Favorites operations
        getPackById,
        toggleFavorite,
        handleMyLikesToggle,

        // General pack operations (for page use)
        createPack,
        updatePack,
        deletePack,
        addLevelToPack,
        removeLevelFromPack,
        reorderPackLevels
    };

    return (
        <PackContext.Provider value={contextValue}>
            {props.children}
        </PackContext.Provider>
    )
}

// Hook for consuming the PackContext
export const usePackContext = () => {
    const context = useContext(PackContext);
    if (!context) {
        throw new Error('usePackContext must be used within a PackContextProvider');
    }
    return context;
};

export { PackContext, PackContextProvider }
export default PackContext

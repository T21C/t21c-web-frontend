/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react"
import Cookies from 'js-cookie';
import api from '@/utils/api';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';

const PackContext = createContext()

const PackContextProvider = (props) => {
    const { user } = useAuth();
    const location = useLocation();
    
    // Page-exclusive state for pack browsing/filtering
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    // Pagination state
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);

    // Favorites state
    const [favorites, setFavorites] = useState([]);
    const [favoritesLoading, setFavoritesLoading] = useState(false);
    
    // Filter state (with cookie persistence)
    const [filters, setFilters] = useState(() => ({
        query: Cookies.get('pack_query') || "",
        viewMode: Cookies.get('pack_view_mode') || "all",
        sort: Cookies.get('pack_sort') || "RECENT",
        order: Cookies.get('pack_order') || "DESC"
    }));
    
    // Use ref to access current filters without causing re-renders
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    // Save filters to cookies
    useEffect(() => {
        Object.entries(filters).forEach(([key, value]) => {
            Cookies.set(`pack_${key}`, value, { expires: 365 });
        });
    }, [filters]);

    // Handle URL query parameters
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const levelId = urlParams.get('levelId');
        
        if (levelId) {
            // Set query to search for this level ID
            const levelQuery = `levelId:${levelId}`;
            setFilters(prev => ({ ...prev, query: levelQuery }));
        }
    }, [location.search]);

    // Force update state for triggering re-fetches
    const [forceUpdate, setForceUpdate] = useState(false);

    // Pack browsing function (page-exclusive)
    const fetchPacks = useCallback(async () => {
        if (loading) return;
        
        setLoading(true);
        setError(false);

        try {
            const currentFilters = filtersRef.current;
            const params = {
                offset: pageNumber * 30,
                limit: 30,
                sort: currentFilters.sort === 'RECENT' ? 'createdAt' : currentFilters.sort === 'NAME' ? 'name' : 'createdAt',
                order: currentFilters.order
            };

            // Add search parameters
            if (currentFilters.query.trim()) params.query = currentFilters.query.trim();
            if (currentFilters.viewMode !== 'all') params.viewMode = currentFilters.viewMode;

            const response = await api.get('/v2/database/levels/packs', { params });
            const newPacks = response.data.packs || [];

            if (pageNumber === 0) {
                setPacks(newPacks);
            } else {
                setPacks(prev => [...prev, ...newPacks]);
            }
            setHasMore(newPacks.length === 30);

        } catch (error) {
            console.error('Error fetching packs:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [pageNumber]);

    // Centralized refresh function
    const triggerRefresh = useCallback(() => {
        setPageNumber(0);
        setPacks([]);
        if (filtersRef.current.viewMode === 'favorites') {
            setFavorites([]);
        }
        setForceUpdate(f => !f);
    }, []);

    // Load more function
    const loadMore = useCallback(() => {
        if (filtersRef.current.viewMode === 'favorites') {
            // Favorites don't support pagination, do nothing
            return;
        }
        if (hasMore && !loading) {
            setPageNumber(prev => prev + 1);
        }
    }, [hasMore, loading]);


    // Favorites operations
    const fetchFavorites = useCallback(async () => {
        if (!user) {
            setFavorites([]);
            return;
        }

        setFavoritesLoading(true);
        try {
            const response = await api.get('/v2/database/levels/packs/favorites');
            setFavorites(response.data.packs || []);
        } catch (error) {
            console.error('Error fetching favorites:', error);
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
            const response = await api.post('/v2/database/levels/packs', packData);
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
            const response = await api.put(`/v2/database/levels/packs/${packId}`, updateData);
            triggerRefresh();
            return response.data;
        } catch (error) {
            console.error('Error updating pack:', error);
            throw error;
        }
    };

    const deletePack = async (packId) => {
        try {
            await api.delete(`/v2/database/levels/packs/${packId}`);
            triggerRefresh();
        } catch (error) {
            console.error('Error deleting pack:', error);
            throw error;
        }
    };

    // Add level to pack
    const addLevelToPack = async (packId, levelId, sortOrder = null) => {
        try {
            const response = await api.post(`/v2/database/levels/packs/${packId}/levels`, {
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
            await api.delete(`/v2/database/levels/packs/${packId}/levels/${levelId}`);
        } catch (error) {
            console.error('Error removing level from pack:', error);
            throw error;
        }
    };

    // Reorder levels in pack
    const reorderPackLevels = async (packId, levelOrders) => {
        try {
            await api.put(`/v2/database/levels/packs/${packId}/levels/reorder`, {
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
            viewMode: "all",
            sort: "RECENT",
            order: "DESC"
        });
    };

    const toggleFavorite = useCallback(async (packId) => {
        try {
            // Determine desired state based on current favorite status
            const currentlyFavorited = packs.some(pack => pack.id === packId && pack.isFavorited);
            const desiredFavorited = !currentlyFavorited;
            
            const response = await api.put(`/v2/database/levels/packs/${packId}/favorite`, { 
                favorited: desiredFavorited 
            });

            console.log(response);
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

            return true;
        } catch (error) {
            console.error('Error toggling favorite:', error);
            return false;
        }
    }, [packs]);

    const getPackById = useCallback((packId) => {
        return packs.find(pack => pack.id === packId);
    }, [packs]);

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
        updateFilter,
        resetFilters,

        // Favorites operations
        getPackById,
        toggleFavorite,

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

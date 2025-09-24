/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useCallback, useRef } from "react"
import Cookies from 'js-cookie';
import api from '@/utils/api';
import { useAuth } from './AuthContext';

const PackContext = createContext()

const PackContextProvider = (props) => {
    const { user } = useAuth();
    
    // Page-exclusive state for pack browsing/filtering
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    
    // Pagination state
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);
    
    // Filter state (with cookie persistence)
    const [filters, setFilters] = useState(() => ({
        query: Cookies.get('pack_query') || "",
        viewMode: Cookies.get('pack_view_mode') || "all",
        sort: Cookies.get('pack_sort') || "RECENT",
        order: Cookies.get('pack_order') || "DESC",
        ownerUsername: Cookies.get('pack_owner_username') || ""
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

    // Pack browsing function (page-exclusive)
    const fetchPacks = useCallback(async (options = {}) => {
        const { 
            reset = false, 
            forceRefresh = false,
            customFilters = null
        } = options;
        
        if (loading && !forceRefresh) return;
        
        setLoading(true);
        setError(false);

        try {
            const currentFilters = customFilters || filtersRef.current;
            const params = {
                offset: reset ? 0 : pageNumber * 30,
                limit: 30,
                sort: currentFilters.sort === 'RECENT' ? 'createdAt' : currentFilters.sort === 'NAME' ? 'name' : 'createdAt',
                order: currentFilters.order
            };

            // Add search parameters
            if (currentFilters.query.trim()) params.query = currentFilters.query.trim();
            if (currentFilters.ownerUsername.trim()) params.ownerUsername = currentFilters.ownerUsername.trim();
            if (currentFilters.viewMode !== 'all') params.viewMode = currentFilters.viewMode;
            if (forceRefresh) params._t = Date.now();

            const response = await api.get('/v2/database/levels/packs', { params });
            const newPacks = response.data.packs || [];

            if (reset) {
                setPacks(newPacks);
                setPageNumber(0);
            } else {
                setPacks(prev => [...prev, ...newPacks]);
            }
            setHasMore(newPacks.length === 30);
            setPageNumber(prev => reset ? 1 : prev + 1);

        } catch (error) {
            console.error('Error fetching packs:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [loading, pageNumber]);

    // Convenience functions for page browsing
    const resetAndFetch = useCallback(() => fetchPacks({ reset: true }), [fetchPacks]);
    const loadMore = useCallback(() => {
        if (hasMore && !loading) fetchPacks({ reset: false });
    }, [hasMore, loading, fetchPacks]);

    // General pack operations (for page use)
    const createPack = async (packData) => {
        try {
            const response = await api.post('/v2/database/levels/packs', packData);
            // Refresh page pack list
            resetAndFetch();
            return response.data;
        } catch (error) {
            console.error('Error creating pack:', error);
            throw error;
        }
    };

    const updatePack = async (packId, updateData) => {
        try {
            const response = await api.put(`/v2/database/levels/packs/${packId}`, updateData);
            resetAndFetch();
            return response.data;
        } catch (error) {
            console.error('Error updating pack:', error);
            throw error;
        }
    };

    const deletePack = async (packId) => {
        try {
            await api.delete(`/v2/database/levels/packs/${packId}`);
            resetAndFetch();
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
            order: "DESC",
            ownerUsername: ""
        });
    };

    const contextValue = {
        // Page-exclusive state for browsing/filtering
        packs,
        filters,
        loading,
        error,
        hasMore,
        pageNumber,

        // Page browsing actions
        fetchPacks,
        resetAndFetch,
        loadMore,
        updateFilter,
        resetFilters,

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

export { PackContext, PackContextProvider }
export default PackContext

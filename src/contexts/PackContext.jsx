/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext, useCallback } from "react"
import Cookies from 'js-cookie';
import api from '@/utils/api';
import { useAuth } from './AuthContext';

const PackContext = createContext()

const PackContextProvider = (props) => {
    const { user } = useAuth();
    
    // Cookie keys
    const COOKIE_KEYS = {
        FILTER_OPEN: 'pack_filter_open',
        SORT_OPEN: 'pack_sort_open',
        QUERY: 'pack_query',
        VIEW_MODE: 'pack_view_mode',
        SORT: 'pack_sort',
        ORDER: 'pack_order',
        OWNER_USERNAME: 'pack_owner_username'
    };

    const [packsData, setPacksData] = useState([])
    const [filterOpen, setFilterOpen] = useState(() => Cookies.get(COOKIE_KEYS.FILTER_OPEN) !== 'false');
    const [sortOpen, setSortOpen] = useState(() => Cookies.get(COOKIE_KEYS.SORT_OPEN) !== 'false');
    const [query, setQuery] = useState(() => Cookies.get(COOKIE_KEYS.QUERY) || "");
    const [viewMode, setViewMode] = useState(() => Cookies.get(COOKIE_KEYS.VIEW_MODE) || "all");
    const [sort, setSort] = useState(() => Cookies.get(COOKIE_KEYS.SORT) || "RECENT");
    const [order, setOrder] = useState(() => Cookies.get(COOKIE_KEYS.ORDER) || "DESC");
    const [ownerUsername, setOwnerUsername] = useState(() => Cookies.get(COOKIE_KEYS.OWNER_USERNAME) || "");
    const [hasMore, setHasMore] = useState(true);
    const [pageNumber, setPageNumber] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [userPacks, setUserPacks] = useState([]);

    // Save to cookies when values change
    useEffect(() => {
        Cookies.set(COOKIE_KEYS.FILTER_OPEN, filterOpen, { expires: 365 });
    }, [filterOpen]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SORT_OPEN, sortOpen, { expires: 365 });
    }, [sortOpen]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.QUERY, query, { expires: 365 });
    }, [query]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.VIEW_MODE, viewMode, { expires: 365 });
    }, [viewMode]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.SORT, sort, { expires: 365 });
    }, [sort]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.ORDER, order, { expires: 365 });
    }, [order]);

    useEffect(() => {
        Cookies.set(COOKIE_KEYS.OWNER_USERNAME, ownerUsername, { expires: 365 });
    }, [ownerUsername]);

    // Fetch user's packs for the add to pack popup
    const fetchUserPacks = useCallback(async () => {
        try {
            const response = await api.get('/v2/database/levels/packs', {
                params: {
                    ownerUsername: user?.username,
                    limit: 100 // Get all user packs
                }
            });
            setUserPacks(response.data.packs || []);
        } catch (error) {
            console.error('Error fetching user packs:', error);
            setUserPacks([]);
        }
    }, [user?.username]);

    // Fetch packs with current filters
    const fetchPacks = useCallback(async (reset = false) => {
        if (loading) return;
        
        setLoading(true);
        setError(false);

        try {
            const params = {
                offset: reset ? 0 : pageNumber * 30,
                limit: 30,
                sort: sort === 'RECENT' ? 'createdAt' : sort === 'NAME' ? 'name' : 'createdAt',
                order: order
            };

            // Add search parameters
            if (query.trim()) {
                params.query = query.trim();
            }

            if (ownerUsername.trim()) {
                params.ownerUsername = ownerUsername.trim();
            }

            if (viewMode !== 'all') {
                params.viewMode = viewMode;
            }

            const response = await api.get('/v2/database/levels/packs', { params });
            const newPacks = response.data.packs || [];

            if (reset) {
                setPacksData(newPacks);
                setPageNumber(0);
            } else {
                setPacksData(prev => [...prev, ...newPacks]);
            }

            setHasMore(newPacks.length === 30);
            setPageNumber(prev => reset ? 1 : prev + 1);

        } catch (error) {
            console.error('Error fetching packs:', error);
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [loading, pageNumber, sort, order, query, ownerUsername, viewMode]);

    // Reset and fetch packs
    const resetAndFetch = useCallback(() => {
        setPageNumber(0);
        setHasMore(true);
        fetchPacks(true);
    }, [fetchPacks]);

    // Load more packs
    const loadMore = useCallback(() => {
        if (hasMore && !loading) {
            fetchPacks(false);
        }
    }, [hasMore, loading, fetchPacks]);

    // Create a new pack
    const createPack = async (packData) => {
        try {
            const response = await api.post('/v2/database/levels/packs', packData);
            // Refresh user packs and main pack list
            fetchUserPacks();
            resetAndFetch();
            return response.data;
        } catch (error) {
            console.error('Error creating pack:', error);
            throw error;
        }
    };

    // Update a pack
    const updatePack = async (packId, updateData) => {
        try {
            const response = await api.put(`/v2/database/levels/packs/${packId}`, updateData);
            // Refresh user packs and main pack list
            fetchUserPacks();
            resetAndFetch();
            return response.data;
        } catch (error) {
            console.error('Error updating pack:', error);
            throw error;
        }
    };

    // Delete a pack
    const deletePack = async (packId) => {
        try {
            await api.delete(`/v2/database/levels/packs/${packId}`);
            // Refresh user packs and main pack list
            fetchUserPacks();
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

    // Fetch user packs when user changes
    useEffect(() => {
        if (user) {
            fetchUserPacks();
        }
    }, [user?.id]); // Only depend on user ID, not the entire user object

    const contextValue = {
        // State
        packsData,
        setPacksData,
        filterOpen,
        setFilterOpen,
        sortOpen,
        setSortOpen,
        query,
        setQuery,
        viewMode,
        setViewMode,
        sort,
        setSort,
        order,
        setOrder,
        ownerUsername,
        setOwnerUsername,
        hasMore,
        pageNumber,
        loading,
        error,
        userPacks,

        // Actions
        fetchPacks,
        resetAndFetch,
        loadMore,
        createPack,
        updatePack,
        deletePack,
        addLevelToPack,
        removeLevelFromPack,
        reorderPackLevels,
        fetchUserPacks
    };

    return (
        <PackContext.Provider value={contextValue}>
            {props.children}
        </PackContext.Provider>
    )
}

export { PackContext, PackContextProvider }
export default PackContext

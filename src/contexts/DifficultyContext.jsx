/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext, useCallback } from "react";
import api from '../utils/api';
import axios from "axios";

const DifficultyContext = createContext();

export const useDifficultyContext = () => {
    const context = useContext(DifficultyContext);
    if (!context) {
        throw new Error('useDifficultyContext must be used within a DifficultyContextProvider');
    }
    return context;
};

const DifficultyContextProvider = (props) => {
    const [difficultyDict, setDifficultyDict] = useState({});
    const [difficulties, setDifficulties] = useState([]);
    const [rawDifficulties, setRawDifficulties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [iconCache, setIconCache] = useState(new Map());

    // Function to cache a single difficulty's icons
    const cacheDifficultyIcons = useCallback(async (diff) => {
        try {
            const iconUrl = diff.icon;
            const legacyIconUrl = diff.legacyIcon;
            let blobUrl = iconCache.get(iconUrl);
            let legacyBlobUrl = iconCache.get(legacyIconUrl);

            if (iconUrl && !blobUrl) {
                const iconResponse = await axios.get(iconUrl, {
                    responseType: 'blob'
                });
                const blob = iconResponse.data;
                blobUrl = URL.createObjectURL(blob);
                setIconCache(prev => new Map(prev).set(iconUrl, blobUrl));
            }

            if (legacyIconUrl && !legacyBlobUrl) {
                const legacyIconResponse = await axios.get(legacyIconUrl, {
                    responseType: 'blob'
                });
                const legacyBlob = legacyIconResponse.data;
                legacyBlobUrl = URL.createObjectURL(legacyBlob);
                setIconCache(prev => new Map(prev).set(legacyIconUrl, legacyBlobUrl));
            }

            return {
                ...diff,
                icon: blobUrl || iconUrl,
                legacyIcon: legacyBlobUrl || legacyIconUrl
            };
        } catch (err) {
            console.error(`Failed to load icons for ${diff.name}:`, err);
            return diff;
        }
    }, [iconCache]);

    // Function to get a cached difficulty with icons
    const getCachedDifficulty = useCallback(async (diffId) => {
        const diff = difficultyDict[diffId];
        if (!diff) return null;
        
        // If the difficulty exists but doesn't have cached icons, cache them
        if (!iconCache.has(diff.icon) || (diff.legacyIcon && !iconCache.has(diff.legacyIcon))) {
            const cachedDiff = await cacheDifficultyIcons(diff);
            setDifficultyDict(prev => ({
                ...prev,
                [diffId]: cachedDiff
            }));
            return cachedDiff;
        }
        
        return diff;
    }, [difficultyDict, iconCache, cacheDifficultyIcons]);

    const fetchDifficulties = async () => {
        try {
            setLoading(true);
            const response = await api.get(import.meta.env.VITE_DIFFICULTIES);
            const diffsArray = response.data;
            
            // Store raw difficulties
            setRawDifficulties(diffsArray);
            
            // Preload all icons and create blob URLs
            const preloadIcons = async (difficulties) => {
                return Promise.all(difficulties.map(cacheDifficultyIcons));
            };

            // Load icons and update state
            const diffsWithIcons = await preloadIcons(diffsArray);
            
            // Convert array to id-based dictionary
            const diffsDict = {};
            diffsWithIcons.forEach(diff => {
                diffsDict[diff.id] = diff;
            });

            setDifficulties(diffsWithIcons);
            setDifficultyDict(diffsDict);
            setError(null);
        } catch (err) {
            console.error('Error fetching difficulties:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDifficulties();

        // Cleanup blob URLs on unmount
        return () => {
            iconCache.forEach((blobUrl) => {
                if (blobUrl && blobUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(blobUrl);
                }
            });
        };
    }, []);

    return (
        <DifficultyContext.Provider 
            value={{ 
                difficulties,
                difficultyDict,
                rawDifficulties,
                loading,
                error,
                reloadDifficulties: fetchDifficulties,
                getCachedDifficulty,
                cacheDifficultyIcons
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
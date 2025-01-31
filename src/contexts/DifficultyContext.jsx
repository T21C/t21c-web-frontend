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

    // Function to convert blob to data URL
    const blobToDataUrl = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    // Function to cache a single difficulty's icons
    const cacheDifficultyIcons = useCallback(async (diff) => {
        try {
            const iconUrl = diff.icon;
            const legacyIconUrl = diff.legacyIcon;
            let dataUrl = iconCache.get(iconUrl);
            let legacyDataUrl = iconCache.get(legacyIconUrl);

            if (iconUrl && !dataUrl) {
                const iconResponse = await axios.get(iconUrl, {
                    responseType: 'blob'
                });
                const blob = iconResponse.data;
                dataUrl = await blobToDataUrl(blob);
                setIconCache(prev => new Map(prev).set(iconUrl, dataUrl));
            }

            if (legacyIconUrl && !legacyDataUrl) {
                const legacyIconResponse = await axios.get(legacyIconUrl, {
                    responseType: 'blob'
                });
                const legacyBlob = legacyIconResponse.data;
                legacyDataUrl = await blobToDataUrl(legacyBlob);
                setIconCache(prev => new Map(prev).set(legacyIconUrl, legacyDataUrl));
            }

            return {
                ...diff,
                icon: dataUrl || iconUrl,
                legacyIcon: legacyDataUrl || legacyIconUrl
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
            
            // Preload all icons and create data URLs
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
        // No need for cleanup since we're using data URLs now
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
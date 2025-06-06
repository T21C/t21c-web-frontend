/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

const isDevelopment = import.meta.env.VITE_OWN_URL === 'https://localhost:5173';

const DifficultyContext = createContext();

// Utility function to check if an image was loaded from cache
const checkImageCacheStatus = async (imageUrl) => {
    try {
        const startTime = performance.now();
        const response = await fetch(imageUrl, { 
            cache: 'force-cache',
            mode: isDevelopment ? 'no-cors' : 'cors'
        });
        const endTime = performance.now();
        
        // Get cache status from response
        const cacheStatus = response.headers.get('x-cache') || 
                          (response.headers.get('cf-cache-status') || 'unknown');
        
        // Check if it was a 304 Not Modified response
        const fromCache = response.status === 304 || 
                         cacheStatus.toLowerCase().includes('hit') ||
                         endTime - startTime < 50; // Very fast response likely from cache
        
        return {
            url: imageUrl,
            fromCache,
            cacheStatus,
            loadTime: endTime - startTime,
            status: response.status
        };
    } catch (error) {
        console.error('Error checking cache status:', error);
        return { url: imageUrl, error: error.message };
    }
};

// Function to preload an image
const preloadImage = async (url) => {
    try {
        const response = await fetch(url, {
            cache: 'force-cache',
            mode: isDevelopment ? 'no-cors' : 'cors'
        });

        console.log(response);
        
        // In no-cors mode, response is opaque and we can't check response.ok
        if (isDevelopment) {
            // Just check if we got a response
            return { url, success: true };
        }
        
        // In normal mode, we can check response status
        if (!response.ok) {
            throw new Error(`Failed to load image: ${response.statusText}`);
        }
        return { url, success: true };
    } catch (error) {
        console.error(`Failed to preload image ${url}:`, error);
        return { url, success: false, error: error.message };
    }
};

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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDifficulties = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);
            
            // Fetch fresh data from server
            const response = await fetch(import.meta.env.VITE_DIFFICULTIES, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                // Add no-cors mode in development
                ...(isDevelopment && {
                    mode: 'no-cors',
                    credentials: 'omit'
                })
            });
            const diffsArray = await response.json();
            
            if (!diffsArray || !Array.isArray(diffsArray)) {
                throw new Error('Invalid server response format');
            }
            
            // Create and set difficulty dictionary
            const diffsDict = {};
            diffsArray.forEach(diff => {
                diffsDict[diff.id] = diff;
            });
            
            // Update state
            setDifficulties(diffsArray);
            setDifficultyDict(diffsDict);

            // Preload all icons in parallel
            const iconUrls = diffsArray.reduce((urls, diff) => {
                if (diff.icon) urls.push(diff.icon);
                if (diff.legacyIcon) urls.push(diff.legacyIcon);
                return urls;
            }, []);

            // Load all icons in parallel
            const preloadPromises = iconUrls.map(url => preloadImage(url));
            const preloadResults = await Promise.all(preloadPromises);

            // Log cache status for all icons (development only)
            if (isDevelopment) {
                console.group('Icon Cache Status');
                const cacheStatusPromises = preloadResults
                    .filter(result => result.success)
                    .map(result => checkImageCacheStatus(result.url));
                
                const cacheStatuses = await Promise.all(cacheStatusPromises);
                cacheStatuses.forEach(status => {
                    console.log(`Icon ${status.url}:`, status);
                });
                console.groupEnd();
            }
            
        } catch (err) {
            console.error('Error fetching difficulties:', err);
            setError(err.message || 'Failed to fetch difficulties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDifficulties();
    }, []);

    return (
        <DifficultyContext.Provider 
            value={{ 
                difficulties,
                setDifficulties,
                difficultyDict,
                setDifficultyDict,
                loading,
                setLoading,
                error,
                setError,
                reloadDifficulties: fetchDifficulties,
                checkImageCacheStatus
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
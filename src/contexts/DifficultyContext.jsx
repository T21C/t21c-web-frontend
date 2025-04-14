/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext } from "react";
import api from '@/utils/api';
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
    const [currentHash, setCurrentHash] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Constants for cache keys
    const CACHE_KEY = 'difficulties_cache';
    const HASH_KEY = 'difficulties_hash';

    // Function to check if the current hash matches the server hash
    const checkHash = async () => {
        try {
            // Get the current hash from localStorage
            const storedHash = localStorage.getItem(HASH_KEY);
            
            if (!storedHash) {
                console.log('No stored hash found in localStorage');
                return false;
            }
            
            // Get the current hash from the server
            const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/hash`);
            const serverHash = response.data.hash;
            
            // Update the current hash state
            setCurrentHash(serverHash);
            
            // Compare the hashes
            const isMatch = storedHash === serverHash;
            console.log(`Hash check: stored=${storedHash}, server=${serverHash}, match=${isMatch}`);
            return isMatch;
        } catch (err) {
            console.error('Error checking hash:', err);
            return false;
        }
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };
    
    const base64ToBlob = (base64) => {
        try {
            // Handle data URLs (e.g., "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...")
            if (base64.startsWith('data:')) {
                const parts = base64.split(',');
                const mimeType = parts[0].split(':')[1].split(';')[0];
                const binaryString = atob(parts[1]);
                const ab = new ArrayBuffer(binaryString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < binaryString.length; i++) {
                    ia[i] = binaryString.charCodeAt(i);
                }
                return new Blob([ab], { type: mimeType });
            }
            
            // Handle raw base64 strings
            const binaryString = atob(base64);
            const ab = new ArrayBuffer(binaryString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < binaryString.length; i++) {
                ia[i] = binaryString.charCodeAt(i);
            }
            return new Blob([ab], { type: 'image/png' }); // Default to PNG if no mime type
        } catch (err) {
            console.error('Error converting base64 to blob:', err);
            return null;
        }
    };  

    const saveToCache = async (data, hash) => {
        try {
            console.log(`Saving ${data.difficulties.length} difficulties to cache with hash: ${hash}`);
            
            // Convert blob URLs to base64 before saving to cache
            const difficultiesWithBase64 = await Promise.all(data.difficulties.map(async diff => {
                let iconBase64 = null;
                let legacyIconBase64 = null;
                
                // Convert icon to base64 if it's a blob URL
                if (diff.icon && diff.icon.startsWith('blob:')) {
                    try {
                        console.log(`Converting blob URL to base64 for ${diff.name} icon`);
                        const response = await fetch(diff.icon);
                        const blob = await response.blob();
                        iconBase64 = await blobToBase64(blob);
                        console.log(`Successfully converted icon to base64 for ${diff.name}`);
                    } catch (err) {
                        console.error(`Error converting icon to base64 for ${diff.name}:`, err);
                    }
                } else if (diff.icon && diff.icon.startsWith('data:')) {
                    // Already a base64 string
                    iconBase64 = diff.icon;
                }
                
                // Convert legacy icon to base64 if it's a blob URL
                if (diff.legacyIcon && diff.legacyIcon.startsWith('blob:')) {
                    try {
                        console.log(`Converting blob URL to base64 for ${diff.name} legacy icon`);
                        const response = await fetch(diff.legacyIcon);
                        const blob = await response.blob();
                        legacyIconBase64 = await blobToBase64(blob);
                        console.log(`Successfully converted legacy icon to base64 for ${diff.name}`);
                    } catch (err) {
                        console.error(`Error converting legacy icon to base64 for ${diff.name}:`, err);
                    }
                } else if (diff.legacyIcon && diff.legacyIcon.startsWith('data:')) {
                    // Already a base64 string
                    legacyIconBase64 = diff.legacyIcon;
                }
                
                // Return the difficulty with base64 data instead of blob URLs
                return {
                    ...diff,
                    icon: iconBase64 || diff.icon,
                    legacyIcon: legacyIconBase64 || diff.legacyIcon
                };
            }));
            
            // Save the data to localStorage
            localStorage.setItem(CACHE_KEY, JSON.stringify({ difficulties: difficultiesWithBase64 }));
            localStorage.setItem(HASH_KEY, hash);
            
            // Update the current hash state
            setCurrentHash(hash);
        } catch (err) {
            console.error('Error saving to cache:', err);
        }
    };

    const loadCachedData = () => {  
        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                if (parsedData.difficulties && parsedData.difficulties.length > 0) {
                    console.log(`Loading ${parsedData.difficulties.length} difficulties from cache`);
                    
                    // Convert base64 data to blob URLs
                    const difficultiesWithBlobs = parsedData.difficulties.map(diff => {
                        let iconBlobUrl = null;
                        let legacyIconBlobUrl = null;
                        
                        // Convert icon base64 to blob URL
                        if (diff.icon && diff.icon.startsWith('data:')) {
                            try {
                                console.log(`Converting base64 to blob URL for ${diff.name} icon`);
                                const blob = base64ToBlob(diff.icon);
                                if (blob) {
                                    iconBlobUrl = URL.createObjectURL(blob);
                                    console.log(`Created blob URL for ${diff.name} icon: ${iconBlobUrl}`);
                                }
                            } catch (err) {
                                console.error(`Error converting base64 to blob for ${diff.name} icon:`, err);
                            }
                        }
                        
                        // Convert legacy icon base64 to blob URL
                        if (diff.legacyIcon && diff.legacyIcon.startsWith('data:')) {
                            try {
                                console.log(`Converting base64 to blob URL for ${diff.name} legacy icon`);
                                const blob = base64ToBlob(diff.legacyIcon);
                                if (blob) {
                                    legacyIconBlobUrl = URL.createObjectURL(blob);
                                    console.log(`Created blob URL for ${diff.name} legacy icon: ${legacyIconBlobUrl}`);
                                }
                            } catch (err) {
                                console.error(`Error converting base64 to blob for ${diff.name} legacy icon:`, err);
                            }
                        }
                        
                        // Return the difficulty with blob URLs
                        return {
                            ...diff,
                            icon: iconBlobUrl || diff.icon,
                            legacyIcon: legacyIconBlobUrl || diff.legacyIcon
                        };
                    });
                    
                    setDifficulties(difficultiesWithBlobs);
                    
                    // Create and set difficulty dictionary
                    const diffsDict = {};
                    difficultiesWithBlobs.forEach(diff => {
                        diffsDict[diff.id] = diff;
                    });
                    setDifficultyDict(diffsDict);
                    
                    return true;
                } else {
                    console.log('Cache exists but contains no difficulties');
                }
            } else {
                console.log('No cached data found');
            }
            return false;
        } catch (err) {
            console.error('Error loading cached data:', err);
            return false;
        }
    };

    const fetchDifficulties = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);
            
            console.log(`Fetching difficulties (forceRefresh=${forceRefresh})`);
            
            // If not forcing refresh, try to load from cache first
            if (!forceRefresh) {
                const isCacheValid = await checkHash();
                if (isCacheValid && loadCachedData()) {
                    console.log('Using cached data');
                    setLoading(false);
                    return;
                }
            }
            
            // Fetch fresh data from server
            console.log('Fetching fresh data from server');
            const response = await api.get(import.meta.env.VITE_DIFFICULTIES);
            const diffsArray = response.data;
            
            if (!diffsArray || !Array.isArray(diffsArray)) {
                throw new Error('Invalid server response format');
            }
            
            console.log(`Received ${diffsArray.length} difficulties from server`);
            
            // Get the hash from the server
            const hashResponse = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/hash`);
            const hash = hashResponse.data.hash;
            console.log(`Server hash: ${hash}`);
            
            // Cleanup old blob URLs to prevent memory leaks
            console.log('Cleaning up old blob URLs');
            difficulties.forEach(diff => {
                if (diff.icon && diff.icon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.icon);
                }
                if (diff.legacyIcon && diff.legacyIcon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.legacyIcon);
                }
            });
            
            // Process icons and create blob URLs
            console.log('Processing icons and creating blob URLs');
            const diffsWithIcons = await Promise.all(diffsArray.map(async (diff) => {
                try {
                    const iconUrl = diff.icon;
                    const legacyIconUrl = diff.legacyIcon;
                    let blobUrl = null;
                    let legacyBlobUrl = null;

                    if (iconUrl) {
                        if (iconUrl.startsWith('data:')) {
                            // Already a base64 string, convert to blob
                            console.log(`Converting base64 to blob for ${diff.name} icon`);
                            blobUrl = URL.createObjectURL(base64ToBlob(iconUrl));
                        } else if (iconUrl.startsWith('blob:')) {
                            // Already a blob URL, keep it
                            console.log(`Using existing blob URL for ${diff.name} icon`);
                            blobUrl = iconUrl;
                        } else {
                            // Fetch from URL
                            console.log(`Fetching icon from URL for ${diff.name}: ${iconUrl}`);
                            const iconResponse = await axios.get(iconUrl, {
                                responseType: 'blob'
                            });
                            blobUrl = URL.createObjectURL(iconResponse.data);
                            console.log(`Created blob URL for ${diff.name} icon: ${blobUrl}`);
                        }
                    }

                    if (legacyIconUrl) {
                        if (legacyIconUrl.startsWith('data:')) {
                            // Already a base64 string, convert to blob
                            console.log(`Converting base64 to blob for ${diff.name} legacy icon`);
                            legacyBlobUrl = URL.createObjectURL(base64ToBlob(legacyIconUrl));
                        } else if (legacyIconUrl.startsWith('blob:')) {
                            // Already a blob URL, keep it
                            console.log(`Using existing blob URL for ${diff.name} legacy icon`);
                            legacyBlobUrl = legacyIconUrl;
                        } else {
                            // Fetch from URL
                            console.log(`Fetching legacy icon from URL for ${diff.name}: ${legacyIconUrl}`);
                            const legacyIconResponse = await axios.get(legacyIconUrl, {
                                responseType: 'blob'
                            });
                            legacyBlobUrl = URL.createObjectURL(legacyIconResponse.data);
                            console.log(`Created blob URL for ${diff.name} legacy icon: ${legacyBlobUrl}`);
                        }
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
            }));
            
            // Create and set difficulty dictionary
            console.log('Creating difficulty dictionary');
            const diffsDict = {};
            diffsWithIcons.forEach(diff => {
                diffsDict[diff.id] = diff;
            });
            
            // Update state
            console.log('Updating state with processed difficulties');
            setDifficulties(diffsWithIcons);
            setDifficultyDict(diffsDict);
            
            // Save to cache with the correct hash
            console.log('Saving to cache');
            saveToCache({ difficulties: diffsWithIcons }, hash);
            
        } catch (err) {
            console.error('Error fetching difficulties:', err);
            setError(err.message || 'Failed to fetch difficulties');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDifficulties();

        // Cleanup blob URLs on unmount
        return () => {
            difficulties.forEach(diff => {
                if (diff.icon && diff.icon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.icon);
                }
                if (diff.legacyIcon && diff.legacyIcon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.legacyIcon);
                }
            });
        };
    }, []);

    return (
        <DifficultyContext.Provider 
            value={{ 
                difficulties,
                setDifficulties,
                difficultyDict,
                setDifficultyDict,
                rawDifficulties,
                setRawDifficulties,
                loading,
                setLoading,
                error,
                setError,
                reloadDifficulties: fetchDifficulties
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
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

    // Function to check if the current hash matches the server hash
    const checkHash = async () => {
        try {
            // Get the current hash from the server
            const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/hash`);
            const serverHash = response.data.hash;
            
            // Update the current hash state
            setCurrentHash(serverHash);
            
            // Compare with stored hash
            const storedHash = localStorage.getItem('difficulties_hash');
            return storedHash === serverHash;
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

    const fetchDifficulties = async (forceRefresh = false) => {
        try {
            setLoading(true);
            setError(null);
            
            // If not forcing refresh, check hash first
            if (!forceRefresh) {
                const isHashValid = await checkHash();
                if (isHashValid) {
                    // Load from localStorage if hash matches
                    const cachedData = localStorage.getItem('difficulties_data');
                    if (cachedData) {
                        const parsedData = JSON.parse(cachedData);
                        setDifficulties(parsedData);
                        
                        // Create and set difficulty dictionary
                        const diffsDict = {};
                        parsedData.forEach(diff => {
                            diffsDict[diff.id] = diff;
                        });
                        setDifficultyDict(diffsDict);
                        setLoading(false);
                        return;
                    }
                }
            }
            
            // Fetch fresh data from server
            const response = await api.get(import.meta.env.VITE_DIFFICULTIES);
            const diffsArray = response.data;
            
            if (!diffsArray || !Array.isArray(diffsArray)) {
                throw new Error('Invalid server response format');
            }
            
            // Get the hash from the server
            const hashResponse = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/hash`);
            const hash = hashResponse.data.hash;
            
            // Cleanup old blob URLs to prevent memory leaks
            difficulties.forEach(diff => {
                if (diff.icon && diff.icon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.icon);
                }
                if (diff.legacyIcon && diff.legacyIcon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.legacyIcon);
                }
            });
            
            // Process icons and create blob URLs
            const diffsWithIcons = await Promise.all(diffsArray.map(async (diff) => {
                try {
                    const iconUrl = diff.icon;
                    const legacyIconUrl = diff.legacyIcon;
                    let blobUrl = null;
                    let legacyBlobUrl = null;

                    if (iconUrl) {
                        if (iconUrl.startsWith('data:')) {
                            // Already a base64 string, convert to blob
                            blobUrl = URL.createObjectURL(base64ToBlob(iconUrl));
                        } else if (iconUrl.startsWith('blob:')) {
                            // Already a blob URL, keep it
                            blobUrl = iconUrl;
                        } else {
                            // Fetch from URL with cache control
                            const iconResponse = await fetch(iconUrl, {
                                cache: 'force-cache' // Use browser's cache
                            });
                            const blob = await iconResponse.blob();
                            blobUrl = URL.createObjectURL(blob);
                        }
                    }

                    if (legacyIconUrl) {
                        if (legacyIconUrl.startsWith('data:')) {
                            // Already a base64 string, convert to blob
                            legacyBlobUrl = URL.createObjectURL(base64ToBlob(legacyIconUrl));
                        } else if (legacyIconUrl.startsWith('blob:')) {
                            // Already a blob URL, keep it
                            legacyBlobUrl = legacyIconUrl;
                        } else {
                            // Fetch from URL with cache control
                            const legacyIconResponse = await fetch(legacyIconUrl, {
                                cache: 'force-cache' // Use browser's cache
                            });
                            const blob = await legacyIconResponse.blob();
                            legacyBlobUrl = URL.createObjectURL(blob);
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
            const diffsDict = {};
            diffsWithIcons.forEach(diff => {
                diffsDict[diff.id] = diff;
            });
            
            // Update state
            setDifficulties(diffsWithIcons);
            setDifficultyDict(diffsDict);
            
            // Save to localStorage
            localStorage.setItem('difficulties_data', JSON.stringify(diffsWithIcons));
            localStorage.setItem('difficulties_hash', hash);
            
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
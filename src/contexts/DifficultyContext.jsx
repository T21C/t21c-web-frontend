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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDifficulties = async () => {
        try {
            setLoading(true);
            const response = await api.get(import.meta.env.VITE_DIFFICULTIES);
            const diffsArray = response.data;
            
            // Store raw difficulties
            setRawDifficulties(diffsArray);
            
            // Cleanup old blob URLs
            difficulties.forEach(diff => {
                if (diff.icon && diff.icon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.icon);
                }
                if (diff.legacyIcon && diff.legacyIcon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.legacyIcon);
                }
            });
            
            // Preload all icons and create blob URLs
            const preloadIcons = async (difficulties) => {
                return Promise.all(difficulties.map(async (diff) => {
                    try {
                        const iconUrl = diff.icon;
                        const legacyIconUrl = diff.legacyIcon;
                        let blobUrl = null;
                        let legacyBlobUrl = null;

                        if (iconUrl) {
                            const iconResponse = await axios.get(iconUrl, {
                                responseType: 'blob'
                            });
                            const blob = iconResponse.data;
                            blobUrl = URL.createObjectURL(blob);
                        }

                        if (legacyIconUrl) {
                            const legacyIconResponse = await axios.get(legacyIconUrl, {
                                responseType: 'blob'
                            });
                            const legacyBlob = legacyIconResponse.data;
                            legacyBlobUrl = URL.createObjectURL(legacyBlob);
                        }

                        return { 
                            ...diff, 
                            icon: blobUrl || iconUrl,
                            legacyIcon: legacyBlobUrl || legacyIconUrl
                        };
                    } catch (err) {
                        if (err.message !== 'Network Error') {
                            console.error(`Failed to load icons for ${diff.name}:`, err);
                        }
                        return diff;
                    }
                }));
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
                difficultyDict,
                rawDifficulties,
                loading,
                error,
                reloadDifficulties: fetchDifficulties
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
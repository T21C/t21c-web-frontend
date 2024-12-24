/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext } from "react";
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDifficulties = async () => {
        try {
            setLoading(true);
            const response = await api.get(import.meta.env.VITE_DIFFICULTIES);
            const diffsArray = response.data;
            
            // Cleanup old blob URLs
            difficulties.forEach(diff => {
                if (diff.icon && diff.icon.startsWith('blob:')) {
                    URL.revokeObjectURL(diff.icon);
                }
            });
            
            // Preload all icons and create blob URLs
            const preloadIcons = async (difficulties) => {
                return Promise.all(difficulties.map(async (diff) => {
                    try {
                        const iconUrl = diff.icon;
                        
                        const iconResponse = await axios.get(iconUrl, {
                            responseType: 'blob'
                        });
                        
                        const blob = iconResponse.data;
                        const blobUrl = URL.createObjectURL(blob);
                        return { ...diff, icon: blobUrl };
                    } catch (err) {
                        console.error(`Failed to load icon for ${diff.name}:`, err);
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
            });
        };
    }, []);

    return (
        <DifficultyContext.Provider 
            value={{ 
                difficulties,
                difficultyDict,
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
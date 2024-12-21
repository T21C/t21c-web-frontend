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

    useEffect(() => {
        const fetchDifficulties = async () => {
            try {
                const response = await api.get(import.meta.env.VITE_DIFFICULTIES);
                const diffsArray = response.data;
                
                // Preload all icons and create blob URLs
                const preloadIcons = async (difficulties) => {
                    return Promise.all(difficulties.map(async (diff) => {
                        try {
                            // Add /icon/img.png to the icon URL if it doesn't already have it
                            const iconUrl =  diff.icon 
                            
                            const iconResponse = await axios.get(iconUrl, {
                                responseType: 'blob'  // Specify that we want binary data
                            });
                            
                            const blob = iconResponse.data;  // Access blob directly from data
                            const blobUrl = URL.createObjectURL(blob);
                            return { ...diff, icon: blobUrl };
                        } catch (err) {
                            console.error(`Failed to load icon for ${diff.name}:`, err);
                            return diff; // Keep original icon URL if failed
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
                setLoading(false);
            } catch (err) {
                console.error('Error fetching difficulties:', err);
                setError(err);
                setLoading(false);
            }
        };

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
                error
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
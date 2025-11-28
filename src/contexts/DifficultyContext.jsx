/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext } from "react";
import api from "@/utils/api";

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
    const [noLegacyDifficulties, setNoLegacyDifficulties] = useState([]);
    const [curationTypes, setCurationTypes] = useState([]);
    const [curationTypesDict, setCurationTypesDict] = useState({});
    const [loading, setLoading] = useState(true);
    const [curationTypesLoading, setCurationTypesLoading] = useState(true);
    const [error, setError] = useState(null);
    const [curationTypesError, setCurationTypesError] = useState(null);

    const fetchDifficulties = async (update = true) => {
        try {
            setLoading(true);
            setError(null);

            let diffsArray = [];
            if (update) {
                // Fetch fresh data from server
                const response = await api.get(import.meta.env.VITE_DIFFICULTIES, {
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });
                diffsArray = response.data;

                if (!diffsArray || !Array.isArray(diffsArray)) {
                    throw new Error('Invalid server response format');
                }
                // Use localStorage instead of cookies - cookies have 4KB limit, this data is ~32KB
                try {
                    localStorage.setItem('difficultyCache', JSON.stringify(diffsArray));
                } catch (storageError) {
                    console.error('Error setting difficulty cache in localStorage:', storageError);
                }
            }
            else {
                const cached = localStorage.getItem('difficultyCache');
                diffsArray = cached ? JSON.parse(cached) : [];
            }
            const diffsDict = {};
            diffsArray.forEach(diff => {   
                diffsDict[diff.id] = diff;
            });
            setDifficulties(diffsArray);
            setDifficultyDict(diffsDict);
        } catch (err) {
            console.error('Error fetching difficulties:', err);
            setError(err.message || 'Failed to fetch difficulties');
        } finally {
            setLoading(false);
        }
    };

    const fetchCurationTypes = async (update = true) => {
        try {
            setCurationTypesLoading(true);
            setCurationTypesError(null);

            let typesArray = [];
            if (update) {
                // Fetch fresh data from server with no-cache to ensure latest data
                const response = await api.get(`${import.meta.env.VITE_CURATIONS}/types`, {
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });
                typesArray = response.data;

                if (!typesArray || !Array.isArray(typesArray)) {
                    throw new Error('Invalid server response format for curation types');
                }
                // Use localStorage instead of cookies for larger data
                try {
                    localStorage.setItem('curationTypeCache', JSON.stringify(typesArray));
                } catch (storageError) {
                    console.error('Error setting curation type cache in localStorage:', storageError);
                }
            }
            else {
                const cached = localStorage.getItem('curationTypeCache');
                typesArray = cached ? JSON.parse(cached) : [];
            }
            const typesDict = {};
            typesArray.forEach(type => {
                typesDict[type.id] = type;
            });
            setCurationTypes(typesArray);
            setCurationTypesDict(typesDict);
        } catch (err) {
            console.error('Error fetching curation types:', err);
            setCurationTypesError(err.message || 'Failed to fetch curation types');
        } finally {
            setCurationTypesLoading(false);
        }
    };

    useEffect(() => {
        const runFetch = async () => {
            const hash = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/hash`).then(res => res.data?.hash);
            const storedHash = localStorage.getItem('difficultiesHash');
            const doUpdate = hash !== storedHash;
            console.log('doUpdate', doUpdate);
            await Promise.all([fetchDifficulties(doUpdate), fetchCurationTypes(doUpdate)]);
            localStorage.setItem('difficultiesHash', hash);
        }
        runFetch().catch(err => console.error('Error fetching difficulties and curation types:', err));
    }, []);

    // Ensure noLegacyDifficulties is always in sync with difficulties
    useEffect(() => {
        setNoLegacyDifficulties(difficulties.filter(d => d.type !== 'LEGACY'));
    }, [difficulties]);

    return (
        <DifficultyContext.Provider 
            value={{ 
                difficulties,
                noLegacyDifficulties,
                setDifficulties,
                difficultyDict,
                setDifficultyDict,
                curationTypes,
                setCurationTypes,
                curationTypesDict,
                setCurationTypesDict,
                loading,
                setLoading,
                curationTypesLoading,
                setCurationTypesLoading,
                error,
                setError,
                curationTypesError,
                setCurationTypesError,
                reloadDifficulties: fetchDifficulties,
                reloadCurationTypes: fetchCurationTypes
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
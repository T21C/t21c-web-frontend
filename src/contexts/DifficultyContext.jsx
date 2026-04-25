/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext, useRef } from "react";
import api from "@/utils/api";
import { selectIconSize } from "@/utils/Utility";

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
    const [tags, setTags] = useState([]);
    const [tagsDict, setTagsDict] = useState({});
    const [loading, setLoading] = useState(true);
    const [curationTypesLoading, setCurationTypesLoading] = useState(true);
    const [tagsLoading, setTagsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [curationTypesError, setCurationTypesError] = useState(null);
    const [tagsError, setTagsError] = useState(null);

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
            }
            else {
                const cached = localStorage.getItem('difficultyCache');
                diffsArray = cached ? JSON.parse(cached) : [];
            }
            const normalizedDiffs = diffsArray.map((diff) => ({
                ...diff,
                icon: selectIconSize(diff.icon, "medium"),
            }));
            if (update && normalizedDiffs.length) {
                try {
                    localStorage.setItem('difficultyCache', JSON.stringify(normalizedDiffs));
                } catch (storageError) {
                    console.error('Error setting difficulty cache in localStorage:', storageError);
                }
            }
            const diffsDict = {};
            normalizedDiffs.forEach((diff) => {
                diffsDict[diff.id] = diff;
            });
            setDifficulties(normalizedDiffs);
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
            }
            else {
                const cached = localStorage.getItem('curationTypeCache');
                typesArray = cached ? JSON.parse(cached) : [];
            }
            const normalizedTypes = typesArray.map((type) => ({
                ...type,
                icon: selectIconSize(type.icon, "small"),
            }));
            if (update && normalizedTypes.length) {
                try {
                    localStorage.setItem('curationTypeCache', JSON.stringify(normalizedTypes));
                } catch (storageError) {
                    console.error('Error setting curation type cache in localStorage:', storageError);
                }
            }
            const typesDict = {};
            normalizedTypes.forEach((type) => {
                typesDict[type.id] = type;
            });
            setCurationTypes(normalizedTypes);
            setCurationTypesDict(typesDict);
        } catch (err) {
            console.error('Error fetching curation types:', err);
            setCurationTypesError(err.message || 'Failed to fetch curation types');
        } finally {
            setCurationTypesLoading(false);
        }
    };

    const fetchTags = async (update = true) => {
        try {
            setTagsLoading(true);
            setTagsError(null);

            let tagsArray = [];
            if (update) {
                // Fetch fresh data from server with no-cache to ensure latest data
                const response = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/tags`, {
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });
                tagsArray = response.data;

                if (!tagsArray || !Array.isArray(tagsArray)) {
                    throw new Error('Invalid server response format for tags');
                }
            }
            else {
                const cached = localStorage.getItem('tagsCache');
                tagsArray = cached ? JSON.parse(cached) : [];
            }
            const normalizedTags = tagsArray.map((tag) => ({
                ...tag,
                icon: selectIconSize(tag.icon, "small"),
            }));
            if (update && normalizedTags.length) {
                try {
                    localStorage.setItem('tagsCache', JSON.stringify(normalizedTags));
                } catch (storageError) {
                    console.error('Error setting tags cache in localStorage:', storageError);
                }
            }
            const tagsDict = {};
            normalizedTags.forEach((tag) => {
                tagsDict[tag.id] = tag;
            });
            setTags(normalizedTags);
            setTagsDict(tagsDict);
        } catch (err) {
            console.error('Error fetching tags:', err);
            setTagsError(err.message || 'Failed to fetch tags');
        } finally {
            setTagsLoading(false);
        }
    };

    useEffect(() => {
        const runFetch = async () => {
            const hash = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/hash`).then(res => res.data?.hash);
            const storedHash = localStorage.getItem('difficultiesHash');
            const doUpdate = hash !== storedHash;
            await Promise.all([fetchDifficulties(doUpdate), fetchCurationTypes(doUpdate), fetchTags(doUpdate)]);
            localStorage.setItem('difficultiesHash', hash);
        }
        runFetch().catch(err => console.error('Error fetching difficulties, curation types, and tags:', err));
    }, []);

    // Ensure noLegacyDifficulties is always in sync with difficulties
    useEffect(() => {
        setNoLegacyDifficulties(difficulties.filter(d => d.type !== 'LEGACY'));
    }, [difficulties]);

    const validateHash = async () => {
        const hash = await api.get(`${import.meta.env.VITE_DIFFICULTIES}/hash`).then(res => res.data?.hash);
        const storedHash = localStorage.getItem('difficultiesHash');
        if(hash !== storedHash) {
            await Promise.all([fetchDifficulties(true), fetchCurationTypes(true), fetchTags(true)]);
            localStorage.setItem('difficultiesHash', hash);
        }
    };

    const intervalRef = useRef(null);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
            validateHash().catch(err => console.error('Error validating hash:', err));
        }, 10 * 1000 * 60);
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [validateHash]);
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
                tags,
                setTags,
                tagsDict,
                setTagsDict,
                loading,
                setLoading,
                curationTypesLoading,
                setCurationTypesLoading,
                tagsLoading,
                setTagsLoading,
                error,
                setError,
                curationTypesError,
                setCurationTypesError,
                tagsError,
                setTagsError,
                reloadDifficulties: fetchDifficulties,
                reloadCurationTypes: fetchCurationTypes,
                reloadTags: fetchTags
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
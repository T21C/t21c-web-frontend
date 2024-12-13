/* eslint-disable react/prop-types */
import { createContext, useState, useEffect, useContext } from "react";
import api from '../utils/api';

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
                
                // Convert array to id-based dictionary
                const diffsDict = {};
                diffsArray.forEach(diff => {
                    diffsDict[diff.id] = diff;
                });

                setDifficulties(diffsArray);
                setDifficultyDict(diffsDict);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching difficulties:', err);
                setError(err);
                setLoading(false);
            }
        };

        fetchDifficulties();
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
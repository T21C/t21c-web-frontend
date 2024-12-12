/* eslint-disable react/prop-types */
import { createContext, useState, useEffect } from "react";
import api from '../utils/api';

const DifficultyContext = createContext();

const DifficultyContextProvider = (props) => {
    const [difficulties, setDifficulties] = useState({});
    const [difficultyList, setDifficultyList] = useState([]);
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

                setDifficulties(diffsDict);
                setDifficultyList(diffsArray);
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
                difficultyList,
                loading,
                error
            }}
        >
            {props.children}
        </DifficultyContext.Provider>
    );
};

export { DifficultyContext, DifficultyContextProvider }; 
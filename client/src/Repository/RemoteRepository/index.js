import axios from 'axios';

async function fetchRecent(){
    try {
        const res = await axios.get(import.meta.env.VITE_ALL_LEVEL_URL);
        return res.data.results.slice(0, 3);
    } catch (error) {
        console.error(error)
        return []
    }
}


export {fetchRecent}
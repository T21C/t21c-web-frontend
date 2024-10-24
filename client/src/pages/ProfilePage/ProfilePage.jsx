import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"



const ProfilePage = () => {
    const {playerName} = useParams()
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    useEffect(() => {
        const fetchPlayer = async () => {
          setLoading(true);
          try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_PROFILE}?${new URLSearchParams({player: playerName})}`);
            
            // Store all the data
            console.log(response.data);
            
            setPlayerData(response.data);
            
          } catch (error) {
            setError(true);
            console.error('Error fetching player data:', error);
          } finally {
            setLoading(false);
          }
        };
      
        fetchPlayer();
      }, []);
    return (
    <div>
        {playerName}
    </div>)
}

export default ProfilePage
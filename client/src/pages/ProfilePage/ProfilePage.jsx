import "./profilePage.css"
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"
import { getVideoDetails } from "../../Repository/RemoteRepository";



const ProfilePage = () => {
    const {playerName} = useParams()
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const [pfpSrc, setPfpSrc] = useState("")
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
      <>
      {playerData && (
        <div className="profile-page">
        {playerData.player}
        <img src={playerData.pfp} alt="No picture" referrerPolicy="no-referrer"/>
        </div>)}
        </>)
}

export default ProfilePage
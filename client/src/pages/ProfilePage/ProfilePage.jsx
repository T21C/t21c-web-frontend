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

      useEffect(() => {
        if (playerData == null){
            return
        }
        const fetchVideoDetails = async () => {
      
          //const originalConsoleError = console.error;
          //console.error = () => {};
  
          for (const link of playerData.allScores) {
            if (link.vidLink) {
              try {
                const videoDetails = await getVideoDetails(link.vidLink);
                // Check if the videoDetails contain the needed data
                if (videoDetails && videoDetails.pfp) {
                  setPfpSrc(videoDetails.pfp); // Set data and stop the loop
                  break;
                }
              } catch (error) {
                console.error(error)
              }
            }
          }
          //console.error = originalConsoleError;
        };
        
        fetchVideoDetails();
      }, [playerData]);  
    return (
    <div className="profile-page">
        {playerName}
        <img src={pfpSrc} alt="No picture" referrerPolicy="no-referrer"/>
    </div>)
}

export default ProfilePage
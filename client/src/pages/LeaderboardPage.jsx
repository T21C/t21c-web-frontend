import React, { useContext, useEffect, useState } from "react";
import { CompleteNav } from "../components";
import { UserContext } from "../context/UserContext"; // Assuming you have a UserContext for managing leaderboard data
import { fetchPlayerData } from "../Repository/RemoteRepository"; // Assuming you have a function to fetch leaderboard data

const LeaderboardPage = () => {
  const { playerData, setPlayerData } = useContext(UserContext);

  // State for selected filters and loading indicator
  const [selectedSort, setSelectedSort] = useState("");
  const [selectedDirection, setSelectedDirection] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch leaderboard data when component mounts and when filters change
  useEffect(() => {
    fetchPlayerData();
  }, [selectedSort, selectedDirection]);

  // Function to fetch leaderboard data
  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      const data = await fetchPlayerData({
        sort: selectedSort,
        direction: selectedDirection,
      });
      setPlayerData(data);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter selection
  const handleSortClick = (value) => {
    setSelectedSort(value);
  };

  const handleDirectionClick = (value) => {
    setSelectedDirection(value);
  };

  return (
    <div className="level-page">
      <CompleteNav />
     
      <div className="background-level"></div>
    </div>
  );
};

export default LeaderboardPage;

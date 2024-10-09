import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // Assuming your AuthContext is in this path
import { useNavigate } from 'react-router-dom';
import './profile.css'; // Add your styles here

const ProfilePage = () => {
  const { profile, updateUsername } = useAuth(); // Assuming there's an updateUsername method
  const [newUsername, setNewUsername] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Construct the new username in email-username fashion
    
    updateUsername(newUsername); // Call your update function
    console.log(profile);
    navigate('/'); // Redirect to homepage or another page after updating
  };

  return (
    <div className="profile-settings">
      <h1>Profile Settings</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">New Username:</label>
        <input
          type="text"
          id="username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="Enter your new username"
          required
        />
        <button type="submit">Update Username</button>
      </form>
    </div>
  );
};

export default ProfilePage;

import React, { useEffect, useState } from 'react';
import './profile.css';
import { useAuth } from '../../context/AuthContext';


function Profile() {
  const { profile, login, logout } = useAuth(); // Access profile, login, and logout from the context
  const [imageUrl, setImageUrl] = useState(null); // State to store the fetched image URL

  useEffect(() => {
    if (profile && profile.picture) {
      // Fetch the image separately
      fetch(profile.picture, {
        mode: 'cors', // Enable CORS mode
      })
        .then((response) => response.blob())
        .then((blob) => {
          const objectURL = URL.createObjectURL(blob); // Convert the blob to an object URL
          setImageUrl(objectURL); // Set the image URL in state
        })
        .catch((error) => {
          console.error('Error fetching the image:', error);
        });
    }
  }, [profile]);

  return (
    <div className="profile-container">
      {profile ? (
        <div className="profile-details">
          <div className="profile-content">
            <h3>{profile.name}</h3>
            <h5>{profile.email}</h5>
          </div>
          {imageUrl ? ( // Render the fetched image once it's available
            <img src={imageUrl} alt="Profile" className="profile-avatar" />
          ) : (
            <p>Loading image...</p>
          )}
          <button className="btn-login profile-button" onClick={logout}>
            <img alt="Logout" src="/src/assets/icons/exit-svgrepo-com.png" className="btn-icon" />
          </button>
        </div>
      ) : (
        <div className="landing-container">
          <div className="landing-icon"></div>
          <button onClick={login} className="btn-login">
            Sign in (Google)
          </button>
        </div>
      )}
    </div>
  );
}

export default Profile;
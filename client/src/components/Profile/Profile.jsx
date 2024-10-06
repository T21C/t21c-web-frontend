import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext'; // Assuming your AuthContext is in this path
import './profile.css';

function Profile() {
  const { profile, login, logout } = useAuth(); // Access profile, login, and logout from the context
  const [imageSrc, setImageSrc] = useState(null); // Local state for image source


  useEffect(() => {
    if (profile && profile.imageBlob) {
      // Check if the image blob is valid (i.e., not empty)
      fetch(profile.imageBlob)
        .then((response) => response.blob())
        .then((blob) => {
            const objectURL = URL.createObjectURL(blob);
            
          if (blob.type != "text/html; charset=utf-8") {
            
            setImageSrc(objectURL);
          } 
          else {
            setImageSrc('failed'); 
          }
        })
        .catch((error) => {
          console.error('Error fetching the image:', error);
          setImageSrc('failed'); // Handle errors by resetting the image source
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
          {imageSrc ? (
            imageSrc == "failed" ? (
              <p>No image</p>
            ):(
               // Render the fetched image once it's available
            <img src={imageSrc} alt="Profile" className="profile-avatar" />)
          ) 
          : (
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

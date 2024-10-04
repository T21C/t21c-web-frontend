import React from 'react';
import './profile.css';
import { useAuth } from '../../context/AuthContext';


function Profile() {
  const { profile, login, logout } = useAuth(); // Access profile, login, and logout from the context

  return (
    <div className="profile-container">
      {profile ? ( // Check if the profile exists
        <div className="profile-details">
          <div className="profile-content">
            <h3>{profile.name}</h3>
            <h5>{profile.email}</h5>
          </div>
          <img src={profile.picture} alt="" className="profile-avatar" />
          <button className="btn-login profile-button" onClick={logout}>
            <img alt="Logout" src="src/assets/icons/exit-svgrepo-com.png" className="btn-icon" />
          </button>
        </div>
      ) : (
        <div className="landing-container">
          <div className="landing-icon"></div>
          <button onClick={login} className="btn-login">Sign in (Google)</button>
        </div>
      )}
    </div>
  );
}

export default Profile;

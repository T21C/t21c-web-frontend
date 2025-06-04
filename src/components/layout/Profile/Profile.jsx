import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './profile.css';
import { useTranslation } from 'react-i18next';
import { UserAvatar } from '@/components/layout';

function Profile() {
  const { user, logout, initiateLogin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('components');
  const tProfile = (key) => t(`profile.${key}`) || key;

  const login = () => {
    console.log(window.location.pathname);
    initiateLogin(window.location.pathname);
  };

  const openProfile = () => {
    navigate('/profile');
  };
  return (
    <div className="profile-inline-container">
      {user ? (
        <div className="profile-details">
          <div className="profile-content" onClick={openProfile}>
            <h3>{user?.nickname}</h3>
            <h5>@{user?.username}</h5>
          </div>
          <UserAvatar 
            primaryUrl={user?.avatarUrl}
            fallbackUrl={user?.pfp}
            className="profile-avatar"
          />
          <button className="btn-logout profile-button" onClick={logout}>
            <svg fill="#ffffff" viewBox="-9.6 -9.6 51.20 51.20" version="1.1" xmlns="http://www.w3.org/2000/svg" transform="rotate(180)" stroke="#ffffff" strokeWidth="1.536">
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
              <g id="SVGRepo_iconCarrier">
                <path d="M3.651 16.989h17.326c0.553 0 1-0.448 1-1s-0.447-1-1-1h-17.264l3.617-3.617c0.391-0.39 0.391-1.024 0-1.414s-1.024-0.39-1.414 0l-5.907 6.062 5.907 6.063c0.196 0.195 0.451 0.293 0.707 0.293s0.511-0.098 0.707-0.293c0.391-0.39 0.391-1.023 0-1.414zM29.989 0h-17c-1.105 0-2 0.895-2 2v9h2.013v-7.78c0-0.668 0.542-1.21 1.21-1.21h14.523c0.669 0 1.21 0.542 1.21 1.21l0.032 25.572c0 0.668-0.541 1.21-1.21 1.21h-14.553c-0.668 0-1.21-0.542-1.21-1.21v-7.824l-2.013 0.003v9.030c0 1.105 0.895 2 2 2h16.999c1.105 0 2.001-0.895 2.001-2v-28c-0-1.105-0.896-2-2-2z"></path>
              </g>
            </svg>
          </button>
        </div>
      ) : (
        <div className="landing-container">
          <div className="landing-icon"></div>
          <button onClick={login} className="btn-login">
            <div className="svg-container">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#000000"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M15 16.5V19C15 20.1046 14.1046 21 13 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3H13C14.1046 3 15 3.89543 15 5V8.0625M20 12L9 12M9 12L11.5 14.5M9 12L11.5 9.5" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
            </div>
            <span>{tProfile('signIn')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Profile;

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './profile.css';
import { useTranslation } from 'react-i18next';
import DefaultAvatar from '../Icons/DefaultAvatar';

function Profile() {
  const { user, loginDiscord, logout } = useAuth();
  const [imageSrc, setImageSrc] = useState(null);
  const navigate = useNavigate();
  const { t } = useTranslation('components');
  const tProfile = (key) => t(`profile.${key}`);

  useEffect(() => {
    if (user && user.imageBlob) {
      fetch(user.imageBlob)
        .then((response) => response.blob())
        .then((blob) => {
          if (blob.type !== "text/html; charset=utf-8") {
            const objectURL = URL.createObjectURL(blob);
            setImageSrc(objectURL);
          } else {
            setImageSrc('failed');
          }
        })
        .catch((error) => {
          console.error('Error fetching the image:', error);
          setImageSrc('failed');
        });
    }
  }, [user]);

  return (
    <div className="profile-container">
      {user ? (
        <div className="profile-details">
          <div className="profile-content">
            <h3>{user.global_name}</h3>
            <h5>@{user.username}</h5>
          </div>
          {imageSrc ? (
            imageSrc === "failed" ? (
              <p>{tProfile('noImg')}</p>
            ) : (
              <img src={imageSrc} alt="Profile" className="profile-avatar" />
            )
          ) : (
            <DefaultAvatar className="profile-avatar" />
          )}
          <button className="btn-login profile-button" onClick={logout}>
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
          <button onClick={loginDiscord} className="btn-login">
            <div className="svg-container">
              <svg viewBox="0 -28.5 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid" fill="#000000">
                <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <g id="SVGRepo_iconCarrier">
                  <g>
                    <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" fill="#5865F2" fillRule="nonzero"></path>
                  </g>
                </g>
              </svg>
            </div>
            <span>{tProfile('signIn')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Profile;

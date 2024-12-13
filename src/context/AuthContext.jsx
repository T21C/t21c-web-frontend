import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../utils/api';
import axios from 'axios';
const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user state
  const [accessToken, setAccessToken] = useState(null); // Access token state
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Function to parse and set user data


  const checkAdmin = async () => {
    const response = await api.get(import.meta.env.VITE_CHECK_ADMIN);
    setIsAdmin(response.data.isAdmin);
    setIsSuperAdmin(response.data.isSuperAdmin);
  };


  // Fetch the image URL when setting the user
  const fetchProfileImage = async (userData) => {
    if (userData && userData.id && userData.avatar) {
      const { id, avatar } = userData;

      // Construct the URL for the profile image
      const imageUrl = `https://cdn.discordapp.com/avatars/${id}/${avatar}`;

      try {
        
        const response = await fetch(imageUrl, { referrerPolicy: 'no-referrer' });
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        const blob = await response.blob();
        const objectURL = URL.createObjectURL(blob);
        return objectURL; // Return the image URL as a blob URL
      } catch (error) {
        console.error('Error fetching the image:', error);
        return null; // Handle error by returning null
      }
    }
    return null; // If no profile picture, return null
  };






  const setUserData = async (userData) => {
    
    if (userData) {
      const imageUrl = await fetchProfileImage(userData);
      const updatedUser = { ...userData, imageBlob: imageUrl }; // Add image URL to user

      setUser(updatedUser)
      setAccessToken(updatedUser.access_token)
      checkAdmin(updatedUser.access_token);
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };




  const handleAccessToken = (token) => {
    if(token){
      setAccessToken(token); // Set access token
    }
    else{
    }
  };




  useEffect(() => {
    if (accessToken) {
      getTokenData(accessToken);
    }
  }, [accessToken]);




  const getUserData = async (user) => {
    try {
        // Set the token in the API instance headers
        
        const response = await axios.get('https://discord.com/api/users/@me', 
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        );
        const { id, username, global_name, avatar } = response.data;

        const userData = {
          id,
          global_name: `${global_name}`,
          username: `${username}`,
          avatar,
          access_token: user.access_token,
        };
        
        setUserData(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Clear user data on error
    }
  };




  const getTokenData = async (token) => {
    try {
      const response = await axios.get('https://discord.com/api/users/@me', 
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const { id, username, global_name, avatar } = response.data;

      const userData = {
        id,
        global_name: `${global_name}`,
        username: `${username}`,
        avatar,
        access_token: token,
      };
      
      setUserData(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };



  // Check localStorage for user info on mount
  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'))
    if(storedUser) {
      getUserData(storedUser)
    }
  }, []);


  // Google login logic
  const loginGoogle = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const response = await api.post('/google-auth', {
          code: codeResponse,
        });

        if (response.data.valid) {
          await setUserData(response.data.user); // Parse user data on success
        } else {
          console.error('Invalid token');
        }
      } catch (error) {
        console.error('Error during login:', error);
      }
    },
    onError: (error) => console.error('Login Failed:', error),
  });

  const loginDiscord = () => {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const redirectUri = encodeURIComponent(import.meta.env.VITE_REDIRECT_URI);
    const scope = encodeURIComponent(import.meta.env.VITE_DISCORD_SCOPE);
    const discordAuthUrl = `${import.meta.env.VITE_DISCORD_LINK}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  
    window.location.href = discordAuthUrl; // Redirect user to Discord login page
  };

  // Logout logic
  const logout = () => {
    localStorage.removeItem('user');// Clear user from localStorage
    setUser(null);
    setAccessToken(null);
    setIsAdmin(false);
    setIsSuperAdmin(false);
  };

  // Provide state and functions to the entire app
  return (
    <AuthContext.Provider value={{ user, setUser, accessToken, loginDiscord, logout, handleAccessToken, isAdmin, isSuperAdmin}}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user state
  const [accessToken, setAccessToken] = useState(null); // Access token state

  // Function to parse and set user data



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
      //console.log("Access token received");
      getTokenData(accessToken);
    }
  }, [accessToken]);




  const getUserData = async (user) => {
    
    try {
      //console.log("getting data from user");
      if(user){
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          authorization: `Bearer ${user.access_token}`, // Use Bearer token format
        },
      });

      if (!response.ok) {
        throw new Error('failed response', response);
      }

      const profile = await response.json();
      const { id, username, global_name, avatar } = profile;

      // Create user object with the profile info
      const userData = {
        id,
        global_name: `${global_name}`,
        username: `${username}`,
        avatar,
        access_token: user.access_token, // Include the access token in user data
      };

      // Set the user in AuthContext
      
      setUserData(userData);
    }
    else{
      console.log("invalid user", user);
      
    }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };




  const getTokenData = async (token) => {
    //console.log("getting data by token");
    
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          authorization: `Bearer ${token}`, // Use Bearer token format
        },
      });

      if (!response.ok) {
        throw new Error('failed response', response);
      }

      const profile = await response.json();
      const { id, username, global_name, avatar } = profile;

      // Create user object with the profile info
      const userData = {
        id,
        global_name: `${global_name}`,
        username: `${username}`,
        avatar,
        access_token: token, // Include the access token in user data
      };

      // Set the user in AuthContext
      
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
        const response = await axios.post('http://localhost:3001/api/google-auth', {
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
    onError: (error) => console.log('Login Failed:', error),
  });

  const loginDiscord = () => {
    const clientId = import.meta.env.VITE_CLIENT_ID;
    const redirectUri = encodeURIComponent(import.meta.env.VITE_REDIRECT_URI);
    const scope = encodeURIComponent('identify email');
    const discordAuthUrl = `${import.meta.env.VITE_DISCORD_LINK}?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  
    window.location.href = discordAuthUrl; // Redirect user to Discord login page
  };

  // Logout logic
  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('discordAccessToken'); // Clear user from localStorage
    setUser(null);
    setAccessToken(null);
  };

  // Provide state and functions to the entire app
  return (
    <AuthContext.Provider value={{ user, setUser, accessToken, loginDiscord, logout, handleAccessToken}}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user state
  const [profile, setProfile] = useState(null); // profile state
  const [username, setUsername] = useState(''); // username state

  // Fetch the image when setting the profile
  const fetchProfileImage = async (profileData) => {
    if (profileData && profileData.picture) {
      try {
        const response = await fetch(profileData.picture, { referrerPolicy: 'no-referrer' });
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

  // Check localStorage for user info on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      // Check if the access token is valid
      const checkTokenValidity = async () => {
        try {
          const response = await axios.post('http://localhost:3001/api/check-token', {
            accessToken: parsedUser.access_token, // Assuming your user object contains the access token
          });

          if (response.data.valid) {
            // Fetch profile image
            const imageUrl = await fetchProfileImage(parsedUser.profile);
            const updatedProfile = { ...parsedUser.profile, imageBlob: imageUrl }; // Add image URL to profile

            setUser(parsedUser); // Restore user object
            setProfile(updatedProfile); // Restore user profile info with the image
            setUsername(updatedProfile.name || ''); // Set initial username if available
          } else {
            console.log('Token is invalid, clearing local storage');
            localStorage.removeItem('user'); // Clear invalid user from localStorage
            setUser(null);
            setProfile(null);
            setUsername(''); // Clear username on invalid token
          }
        } catch (error) {
          console.error('Error checking token validity:', error);
          localStorage.removeItem('user'); // Clear user on error
          setUser(null);
          setProfile(null);
          setUsername(''); // Clear username on error
        }
      };

      checkTokenValidity();
    }
  }, []);

  // Google login logic
  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        // Send the access token to your custom API for validation and user info
        const response = await axios.post('http://localhost:3001/api/google-auth', {
          code: codeResponse,
        });

        if (response.data.valid) {
          // Fetch profile image
          const imageUrl = await fetchProfileImage(response.data.profile);
          const updatedProfile = { ...response.data.profile, imageBlob: imageUrl }; // Add image URL to profile

          const userData = {
            access_token: codeResponse.access_token, // Store relevant user info
            profile: updatedProfile, // Store profile with the image URL
          };

          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(userData));

          setUser(userData); // Store the user object with the access token
          setProfile(updatedProfile); // Store user profile info directly from server
          setUsername(updatedProfile.name || ''); // Set initial username if available
        } else {
          console.error('Invalid token');
        }
      } catch (error) {
        console.error('Error during login:', error);
      }
    },
    onError: (error) => console.log('Login Failed:', error),
  });

  // Logout logic
  const logout = () => {
    googleLogout();
    localStorage.removeItem('user'); // Clear stored user data on logout
    setUser(null);
    setProfile(null);
    setUsername(''); // Clear username on logout
  };

  // Update username
  const updateUsername = (newUsername) => {
    setUsername(newUsername);
    
    // Update the profile in local storage as well
    const updatedProfile = { ...profile, name: newUsername }; // Update profile with new username
    setProfile(updatedProfile); // Update profile state
    localStorage.setItem('user', JSON.stringify({ ...user, profile: updatedProfile })); // Update local storage
  };

  // Provide state and functions to the entire app
  return (
    <AuthContext.Provider value={{ user, profile, username, login, logout, updateUsername }}>
      {children}
    </AuthContext.Provider>
  );
};

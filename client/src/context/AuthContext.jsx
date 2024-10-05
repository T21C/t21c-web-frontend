import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user state
  const [profile, setProfile] = useState(null); // profile state

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
            setUser(parsedUser); // Restore user object
            setProfile(parsedUser.profile); // Restore user profile info if available
          } else {
            console.log('Token is invalid, clearing local storage');
            localStorage.removeItem('user'); // Clear invalid user from localStorage
            setUser(null);
            setProfile(null);
          }
        } catch (error) {
          console.error('Error checking token validity:', error);
          localStorage.removeItem('user'); // Clear user on error
          setUser(null);
          setProfile(null);
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
          const userData = {
            access_token: codeResponse.access_token, // Store relevant user info
            profile: response.data.profile, // Assuming profile is returned from your API
          };

          // Store user data in localStorage
          localStorage.setItem('user', JSON.stringify(userData));

          setUser(userData); // Store the user object with the access token
          setProfile(response.data.profile); // Store user profile info directly from server
          console.log("Setting profile data", response.data.profile);
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
  };

  // Provide state and functions to the entire app
  return (
    <AuthContext.Provider value={{ user, profile, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

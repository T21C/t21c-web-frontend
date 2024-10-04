// src/context/AuthContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user state
  const [profile, setProfile] = useState(null); // profile state

  // Google login logic
  const login = useGoogleLogin({
    onSuccess: (codeResponse) => setUser(codeResponse),
    onError: (error) => console.log('Login Failed:', error)
  });

  // Fetch profile information when user logs in
  useEffect(() => {
    if (user) {
      axios
        .get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${user.access_token}`, {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            Accept: 'application/json',
          },
        })
        .then((res) => {
          setProfile(res.data);
        })
        .catch((err) => console.log(err));
    }
  }, [user]);

  // Logout logic
  const logout = () => {
    googleLogout();
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

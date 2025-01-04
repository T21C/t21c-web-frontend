import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_ME}`);
      setUser(response.data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_LOGIN}`, {
      email,
      password,
    });

    const { token } = response.data;
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    await fetchUser();
  };

  const register = async (userData) => {
    await axios.post(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_REGISTER}`, userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const loginWithDiscord = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_DISCORD_LOGIN}`);
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Discord login error:', error);
      throw error;
    }
  };

  const linkDiscord = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_LINK_PROVIDER}/discord`);
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Discord linking error:', error);
      throw error;
    }
  };

  const unlinkProvider = async (provider) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_AUTH_UNLINK_PROVIDER}/${provider}`);
      await fetchUser();
    } catch (error) {
      console.error('Provider unlinking error:', error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
    loginWithDiscord,
    linkDiscord,
    unlinkProvider,
    fetchUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

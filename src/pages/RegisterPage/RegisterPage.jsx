import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './registerPage.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await axios.post(import.meta.env.VITE_AUTH_REGISTER, {
        email: formData.email,
        username: formData.username,
        password: formData.password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const handleDiscordRegister = () => {
    window.location.href = import.meta.env.VITE_AUTH_DISCORD_LOGIN;
  };

  if (success) {
    return (
      <div className="register-page">
        <div className="register-container">
          <h1>Registration Successful!</h1>
          <p className="success-message">
            Please check your email to verify your account. You will be redirected to the login page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page-wrapper">
      <div className="register-page">
        <div className="register-container">
          <h1>Create Account</h1>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="register-button">
            Create Account
          </button>
        </form>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          type="button"
          className="discord-button"
          onClick={handleDiscordRegister}
        >
          Register with Discord
        </button>

        <div className="links">
          <Link to="/login" className="login-link">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
    </div>
  );
};

export default RegisterPage; 
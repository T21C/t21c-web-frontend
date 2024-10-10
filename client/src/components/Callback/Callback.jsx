import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";

const CallbackPage = () => {
  const navigate = useNavigate();
  const { handleAccessToken } = useAuth(); // Access setUser and handleAccessToken from AuthContext

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Use the VITE_API_URL environment variable in the fetch request
      fetch(`${import.meta.env.VITE_API_URL}/api/discord-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then((response) => response.json())
        .then((data) => {
          const accessToken = data.access_token;

          console.log('Access Token:', accessToken);

          // Set the access token in AuthContext
          handleAccessToken(accessToken);

          // Redirect back to the root
          navigate('/');
        })
        .catch((error) => {
          console.error('Error during Discord login process:', error);
        });
    }
  }, [navigate, handleAccessToken]);

  return (
    <div style={{ backgroundColor: 'black', height: '100vh', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <h2>Processing Discord login...</h2>
    </div>
  );
};

export default CallbackPage;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";

const CallbackPage = () => {
  const navigate = useNavigate();
  const { handleAccessToken } = useAuth(); // Access setUser and handleAccessToken from AuthContext
  const [codeFetched, setCodeFetched] = useState(false); // Track if the code has been processed

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !codeFetched) { // Ensure the code is processed only once

      // Set codeFetched to true to prevent multiple fetch calls
      setCodeFetched(true);
      
      fetch(`${import.meta.env.VITE_DISCORD_AUTH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then((response) => response.json())
        .then((data) => {

          // Set the access token in AuthContext
          handleAccessToken(data.access_token);

          // Redirect back to the root
          navigate('/');
        })
        .catch((error) => {
          console.error('Error during Discord login process:', error);
        });
    }
  }, [codeFetched, handleAccessToken, navigate]);

  return (
    <div style={{ backgroundColor: 'black', height: '100vh', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <h2>Processing Discord login...</h2>
    </div>
  );
};

export default CallbackPage;

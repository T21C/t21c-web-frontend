import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";

const CallbackPage = () => {
  const navigate = useNavigate();
  const { handleAccessToken } = useAuth(); // Access setUser and handleAccessToken from AuthContext
  const [codeFetched, setCodeFetched] = useState(false); // Track if the code has been processed
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !codeFetched) { // Ensure the code is processed only once

      // Set codeFetched to true to prevent multiple fetch calls
      setCodeFetched(true);
      
      api.post(`${import.meta.env.VITE_DISCORD_AUTH}`,
        { code },
        {'Content-Type': 'application/json'},
      )
        .then((response) => response.data)
        .then((data) => {
          setSuccess(true);
          // Set the access token in AuthContext
          handleAccessToken(data.access_token);

          // Redirect back to the root
          navigate('/');
        })
        .catch((error) => {
          console.error('Error during Discord login process:', error);
          setSuccess(false);
          navigate('/');
        });
    }
  }, [codeFetched, handleAccessToken, navigate]);

  return (
    <div style={{ backgroundColor: 'black', height: '100vh', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <h2>{success == null ? "Processing Discord login..." :
           success ? "Login successful, redirecting..." : "Login failed, redirecting..."}</h2>
    </div>
  );
};

export default CallbackPage;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "../../contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import axios from 'axios';

const CallbackPage = () => {
  const navigate = useNavigate();
  const { handleAccessToken } = useAuth();
  const [codeFetched, setCodeFetched] = useState(false);
  const [success, setSuccess] = useState(null);
  const { t } = useTranslation('components');
  const tAuth = (key) => t(`auth.callback.${key}`);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code && !codeFetched) {
      setCodeFetched(true);
      
      axios.post(`${import.meta.env.VITE_API_URL}${import.meta.env.VITE_DISCORD_AUTH}`,
        { code },
        {'Content-Type': 'application/json'},
      )
        .then((response) => response.data)
        .then((data) => {
          setSuccess(true);
          handleAccessToken(data.access_token);
          navigate('/');
        })
        .catch((error) => {
          console.error(tAuth('errors.discord'), error);
          setSuccess(false);
          navigate('/');
        });
    }
  }, [codeFetched, handleAccessToken, navigate, tAuth]);

  return (
    <div style={{ backgroundColor: 'black', height: '100vh', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <h2>
        {success === null ? tAuth('status.processing') :
         success ? tAuth('status.success') : tAuth('status.failure')}
      </h2>
    </div>
  );
};

export default CallbackPage;

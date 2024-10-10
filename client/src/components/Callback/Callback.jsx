import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CallbackPage = () => {
  const [profileInfo, setProfileInfo] = useState(null); // State to hold profile info
  const navigate = useNavigate();

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
          const tokenType = data.token_type;

          // Log token info (optional)
          console.log('Access Token:', accessToken);

          // Store token in localStorage or state
          localStorage.setItem('discordToken', accessToken);

          // Fetch the user's profile from Discord using the access token
          return fetch('https://discord.com/api/users/@me', {
            headers: {
              authorization: `${tokenType} ${accessToken}`,
            },
          });
        })
        .then((profileResponse) => profileResponse.json())
        .then((profile) => {
          // Extract profile details
          const { username, discriminator } = profile;

          // Log profile details
          console.log('Discord Profile:', profile);

          // Display profile information on the page
          setProfileInfo(`${username}#${discriminator}`);

          // Optionally redirect to another page after fetching profile
        })
        .catch((error) => {
          console.error('Error during Discord login process:', error);
        });
    }
  }, [navigate]);

  return (
    <div>
      <h2>Processing Discord login...</h2>
      {profileInfo && <p>Welcome, {profileInfo}</p>} {/* Display the profile info */}
    </div>
  );
};

export default CallbackPage;

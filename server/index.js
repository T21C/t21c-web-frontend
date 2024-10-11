import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import sql from 'mssql'; // Import mssql package

// Load environment variables from .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Fallback to 3000 if PORT is not defined
const host = process.env.REDIRECT_URI || "http://localhost"

const sqlConfig = {
  server: process.env.DB_SERVER, // Your SQL Server instance
  database: process.env.DB_NAME, // Your database name
  options: {
    encrypt: true, // Use true if you're on Azure
    trustServerCertificate: true, // Change to false in production
    // Use integrated security
    trustedConnection: true, // This enables Windows Authentication
  },
};

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Helper function to verify access token
const verifyAccessToken = async (accessToken) => {
  try {
    const tokenInfoResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    console.log(tokenInfoResponse);
    
    if (!tokenInfoResponse.ok) {
      return false; // Invalid token
    }

    const tokenInfo = await tokenInfoResponse.json();
    return tokenInfo; // Return the profile information if the token is valid
  } catch (error) {
    console.error('Error verifying token:', error);
    return false; // Return false on error
  }
};


// Example ban list (this could be fetched from an external API)
const emailBanList = ['bannedUser@example.com', 'anotherBannedUser@example.com'];
const idBanList = ['15982378912598', '78912538976123']

// CURRENTLY NOT IN USE
app.post('/api/google-auth', async (req, res) => {
  const { code } = req.body; // Extract code object from request body
  
  console.log("request body: ", req.body);
  
  if (!code || !code.access_token) {
    return res.status(400).json({ error: 'No access token provided' });
  }

  const access_token = code.access_token; // Get the access token

  try {
    const tokenInfo = await verifyAccessToken(access_token); // Validate token

    if (!tokenInfo) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    // Fetch the user info if token is valid
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: 'Failed to fetch user info' });
    }

    const userInfo = await userInfoResponse.json();
    console.log("userInfo", userInfo);
    
    // Token is valid, return the token info and user profile
    res.json({
      valid: true,
      tokenInfo,
      profile: userInfo,
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.post('/api/discord-auth', async (req, res) => {
  const { code } = req.body; // Get the authorization code from request body

  if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
      const requestBody = new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.CLIENT_URL}/callback`, // Adjust this as needed
      }).toString();

      console.log('Request Body:', requestBody); // Log request body

      const tokenResponseData = await fetch('https://discord.com/api/oauth2/token', {
          method: 'POST',
          body: requestBody,
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
      });

      if (!tokenResponseData.ok) {
          const errorText = await tokenResponseData.text(); // Get error details
          console.error('Error Response:', errorText);
          return res.status(500).json({ error: 'Failed to exchange code for token', details: errorText });
      }

      const oauthData = await tokenResponseData.json(); // Parse the token response
      console.log('OAuth Data:', oauthData);

      // Send back the token data to the client
      return res.status(200).json({
          access_token: oauthData.access_token,
          refresh_token: oauthData.refresh_token,
          expires_in: oauthData.expires_in,
          scope: oauthData.scope,
          token_type: oauthData.token_type,
      });

  } catch (error) {
      console.error('Error during token exchange:', error);
      return res.status(500).json({ error: 'Internal server error' });
  }
});


// Token checking endpoint
app.post('/api/check-token', async (req, res) => {
  const { accessToken } = req.body;

  const tokenInfo = await verifyAccessToken(accessToken); // Validate token

  if (tokenInfo) {
    return res.json({ valid: true, profile: tokenInfo });
  } else {
    return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
});

// Form submission endpoint
app.post('/api/form-submit', async (req, res) => {
  const accessToken = req.headers.authorization.split(' ')[1]; // Extract access token from headers
  const formType = req.headers['x-form-type'];  // Extract X-Form-Type from client request
  console.log("form type extracted", formType);
  
  // Verify the access token first
  const tokenInfo = await verifyAccessToken(accessToken);

  if (!tokenInfo) {
    return res.status(401).json({ error: 'Invalid access token' });
  }

  // Check if the user is in the ban list
  if (emailBanList.includes(tokenInfo.email)) {
    return res.status(403).json({ error: 'User is banned' });
  }

  // Prepare to forward the form submission to Google Apps Script
  const appScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL; // Read the script URL from .env

  console.log("request received: ", req);
  
  
  

  const reqFull = { ...req.body, _submitterEmail: tokenInfo.email, _discordUsername: tokenInfo.username};

  console.log("sending", new URLSearchParams(reqFull).toString());
  try {
    const formResponse = await fetch(appScriptUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // Forward the access token to Google Apps Script
        'Content-Type': 'application/x-www-form-urlencoded',  // Custom header indicating form type
      },
      body: new URLSearchParams(reqFull).toString(), // Send the form data
    });
    

    if (!formResponse.ok) {
      const errorData = await formResponse.json();
      return res.status(500).json({ error: 'Failed to submit form to Google Apps Script', details: errorData });
    }

    res.json({ success: true, message: 'Form submitted successfully'});
  } catch (error) {
    console.error('Error forwarding form submission:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

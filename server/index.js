import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables from .env
dotenv.config();

const app = express();
const port = 3001;

app.use(cors()); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Helper function to verify access token
const verifyAccessToken = async (accessToken) => {
  try {
    const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
    if (!tokenInfoResponse.ok) {
      return false; // Invalid token
    }
    const tokenInfo = await tokenInfoResponse.json();
    return tokenInfo;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
};

// Example ban list (this could be fetched from an external API)
const banList = ['bannedUser@example.com', 'anotherBannedUser@example.com'];

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
  if (banList.includes(tokenInfo.email)) {
    return res.status(403).json({ error: 'User is banned' });
  }

  // Prepare to forward the form submission to Google Apps Script
  const appScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL; // Read the script URL from .env

  console.log("request received: ", req);
  
  console.log("sending", new URLSearchParams(req.body).toString());
  
  try {
    const formResponse = await fetch(appScriptUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // Forward the access token to Google Apps Script
        'Content-Type': 'application/x-www-form-urlencoded',  // Custom header indicating form type
      },
      body: new URLSearchParams(req.body).toString(), // Send the form data
    });

    if (!formResponse.ok) {
      const errorData = await formResponse.json();
      return res.status(500).json({ error: 'Failed to submit form to Google Apps Script', details: errorData });
    }

    const responseData = await formResponse.json();
    res.json({ success: true, message: 'Form submitted successfully', responseData });
  } catch (error) {
    console.error('Error forwarding form submission:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

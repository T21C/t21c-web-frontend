import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs';
import path from 'path'
import { exec } from 'child_process'; 
import { getPfpUrl } from './pfpResolver.js';
import pkg from 'base32.js';
const { Encoder, Decoder } = pkg;

// Load environment variables from .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const playerlistJson = 'playerlist.json'; // Path to the JSON file
const clearlistJson = "clearlist.json"
const pfpListJson = "pfpList.json"
const rankListJson = "rankList.json"
const playerFolder = "players"
var updateTimeList = {}
var levelUpdateTime = 0


const EXCLUDE_CLEARLIST = true

function encodeToBase32(input) {
  const encoder = new Encoder();
  const buffer = new TextEncoder().encode(input);
  return encoder.write(buffer).finalize();
}

function decodeFromBase32(encoded) {
  const decoder = new Decoder();
  const decodedBuffer = decoder.write(encoded).finalize();
  return new TextDecoder().decode(decodedBuffer);
}

const loadPfpList = () => {
  if (fs.existsSync(pfpListJson)) {
    const data = fs.readFileSync(pfpListJson, 'utf-8');
    return JSON.parse(data);
  }
  return {}; // Return an empty object if the file does not exist
};

const savePfpList = (pfpList) => {
  fs.writeFileSync(pfpListJson, JSON.stringify(pfpList, null, 2), 'utf-8');
};

const readJsonFile = (path) => {
  try {
    const data = fs.readFileSync(path, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    return {}; // Return empty object on error
  }
};

const writeJsonFile = (path, data) => {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}



app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

const updateRanks = () => {
  console.log("updating ranks");
  const players = readJsonFile(playerlistJson)
   // Example list of player objects
  // Parameters to sort by
  const sortParameters = [
    "rankedScore",
    "generalScore",
    "ppScore",
    "wfScore",
    "12kScore",
    "avgXacc",
    "totalPasses",
    "universalPasses",
    "WFPasses",
  ];

  // Initialize the rank dictionary
  const rankPositions = {};

  // Initialize each player in the rankPositions dictionary
  players.forEach(player => {
    rankPositions[player.player] = {};
  });

  // Populate the ranks for each parameter
  sortParameters.forEach(param => {
    // Sort the players based on the current parameter in descending order
    const sortedPlayers = [...players].sort((a, b) => b[param] - a[param]);

    // Assign rank positions for each player based on the sorted order
    sortedPlayers.forEach((player, index) => {
      const playerName = player.player;
      rankPositions[playerName][param] = index + 1; // Store rank (1-based)
    });
  });
  writeJsonFile(rankListJson, rankPositions)
}

const updateData = () => {
  console.log("starting execution");
  exec(`python ./parser_module/executable.py all_players --output=${playerlistJson} --reverse`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing for all_players: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Script stderr: ${stderr}`);
      return;
    }
    console.log(`Script output:\n${stdout}`);
    levelUpdateTime = Date.now()
    updateRanks()
    fetchPfps()
    if (!EXCLUDE_CLEARLIST){
    console.log("starting all_clears");
    exec(`python ./parser_module/executable.py all_clears --output=${clearlistJson} --useSaved`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script for all_clears: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Script stderr: ${stderr}`);
        return;
      }
      console.log(`Script output: ${stdout}`);
      });
    }
  });
};

const fetchPfps = async () => {
  const playerlist = readJsonFile(playerlistJson)
  const pfpListTemp = loadPfpList()
  //console.log("playerlist length:" , Object.keys(playerlist).length);
  
  //get first 30 for testing
  //for (const player of playerlist.slice(0, 50)) {
  for (const player of playerlist) {
    if (Object.keys(pfpListTemp).includes(player.player)){
      continue
    }
    console.log("new player:" , player.player);
    if (player.allScores){
      for (const score of player.allScores.slice(0, 15)){
        if (score.vidLink) {
          const videoDetails = await getPfpUrl(score.vidLink);

          // Check if the videoDetails contain the needed data
          if (videoDetails) {
              pfpListTemp[player.player] = videoDetails; // Store the name and link in the object
              //console.log(`Fetched pfp for ${player}: ${videoDetails}`);
              break; // Stop after finding the first valid video detail
          }
          else{
              pfpListTemp[player.player] = null;
          }
        }
      }
    }
  }
  savePfpList(pfpListTemp)
  //console.log("new list:", pfpListTemp)
}

const updateTimestamp = (name) => {
  updateTimeList[name] = Date.now()
}

const intervalMilliseconds = 600000; // every 10 minutes
setInterval(updateData, intervalMilliseconds);

const verifyAccessToken = async (accessToken) => {
  try {
    const tokenInfoResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });
    //console.log(tokenInfoResponse);
    
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

const emailBanList = ['bannedUser@example.com', 'anotherBannedUser@example.com'];
const idBanList = ['15982378912598', '78912538976123']
const validSortOptions = [
  "rankedScore",
  "generalScore",
  "ppScore",
  "wfScore",
  "universalPasses",
  "avgXacc",
  "WFPasses",
  "totalPasses",
  "topDiff",
  "top12kDiff",
  "player"
];

app.get('/leaderboard', async (req, res) => {
  const { sortBy = 'rankedScore', order = 'desc', includeAllScores = 'false' } = req.query;

  const pfpList = loadPfpList() 
  if (!validSortOptions.includes(sortBy)) {
    return res.status(400).json({ error: `Invalid sortBy option. Valid options are: ${validSortOptions.join(', ')}` });
  }
  // Read JSON data
  const leaderboardData = readJsonFile(playerlistJson);

  if (!Array.isArray(leaderboardData)) {
    return res.status(500).json({ error: 'Invalid leaderboard data' });
  }

  // Sorting logic
  const sortedData = leaderboardData.sort((a, b) => {
    const valueA = a[sortBy];
    const valueB = b[sortBy];

    // Handle cases where fields might be missing or invalid
    if (valueA === undefined || valueB === undefined) {
      return 0;
    }

    if (order === 'asc') {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });



  const responseData = sortedData.map(player => {
    player.pfp= pfpList[player.player]

    if (includeAllScores === 'false' && player.allScores) {
      const { allScores, ...rest } = player;

      return rest;
      }
    
    
    return player;
  });

  // Send the sorted data as response
  res.json(responseData);
});

app.get("/player", async (req, res) => {
  const { player = 'V0W4N'} = req.query;
  const plrPath = path.join(playerFolder, `${player}.json`)
  const pfpList = loadPfpList() 
  const rankList = readJsonFile(rankListJson)
  console.log(plrPath)

  await new Promise((resolve, reject) => {
    fs.mkdir(playerFolder, { recursive: true }, (err) => {
      if (err) {
        console.error('Error creating directory:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const getPlayer = () => {
    console.log("decoded", decodeFromBase32(player))
    return new Promise((resolve, reject) => {
      exec(`python ./parser_module/executable.py player "${decodeFromBase32(player)}" --output="${plrPath}" --showCharts --useSaved`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing for all_players: ${error.message}`);
          reject(error);
          return;
        }
        if (stderr) {
          console.error(`Script stderr: ${stderr}`);
          reject(new Error(stderr));
          return;
        }
        console.log(`Script output: ${stdout}`);
        resolve(stdout);
      });
    });
  };


  try {

    //console.log(updateTimeList);
    
    if (!updateTimeList[player] || updateTimeList[player] < levelUpdateTime){
      await getPlayer();
      updateTimestamp(player)
      console.log("updating", player, "with timestamp", updateTimeList[player])
    }
    else{
      //console.log("using recent save for player", player);
      
    }


    const result = readJsonFile(plrPath); // Ensure this function is handled correctly

    result.pfp= pfpList[result.player]
    result.ranks = rankList[result.player]
    res.json(result);
  } catch (err) {
    console.error('Error retrieving player data:', err);
    res.status(500).json({ error: 'Error retrieving player data' });
  }
})

app.get("/pfp", async (req, res) => {
  const { player } = req.query;
  const pfpList = loadPfpList() 
  res.json(pfpList[player]);
})


// CURRENTLY NOT IN USE
app.post('/api/google-auth', async (req, res) => {
  const { code } = req.body; // Extract code object from request body
  
  //console.log("request body: ", req.body);
  
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
    //console.log("userInfo", userInfo);
    
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

      //console.log('Request Body:', requestBody); // Log request body

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
      //console.log('OAuth Data:', oauthData);

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
  //console.log("form type extracted", formType);
  
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
  const reqString = new URLSearchParams(reqFull).toString()
  const filtered =  reqString.replace(/%0A/g, '');
  try {
    const formResponse = await fetch(appScriptUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // Forward the access token to Google Apps Script
        'Content-Type': 'application/x-www-form-urlencoded',  // Custom header indicating form type
      },
      body: filtered, // Send the form data
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


app.get('/api/image', async (req, res) => {
  const imageUrl = req.query.url; // Extract image URL from query parameters

  try {
    const response = await fetch(imageUrl);
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch image.");
    }

    // Set the appropriate content type and pipe the image response
    res.set('Content-Type', contentType);
    response.body.pipe(res);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).send("Error fetching image.");
  }
});


app.get('/api/bilibili', async (req, res) => {
  const bvid = req.query.bvid; // Extract bvid from query parameters
  const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data); // Return the error response from Bilibili
    }

    res.json(data); // Send the fetched data as response
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  updateData()
  console.log(`Server running on ${process.env.OWN_URL}`);
});

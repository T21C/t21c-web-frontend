import axios from 'axios';
import twemoji from '@discordapp/twemoji';
import api from "../../utils/api";
import { Encoder } from 'base32.js';

const baseURL = "https://github.com/T21C/T21C-assets/blob/main/"; // Common URL part
const queryParams = "?raw=true"

const legacyDataType = "legacyDiff"
const legacyData = {
  "1": "lv01.png",
  "2": "lv02.png",
  "3": "lv03.png",
  "4": "lv04.png",
  "5": "lv05.png",
  "6": "lv06.png",
  "7": "lv07.png",
  "8": "lv08.png",
  "9": "lv09.png",
  "10": "10.png",
  "11": "11.png",
  "12": "12.png",
  "13": "13.png",
  "14": "14.png",
  "15": "15.png",
  "16": "16.png",
  "17": "17.png",
  "18": "18.png",
  "18.5": "18+.png",
  "19": "19.png",
  "19.5": "19+.png",
  "20": "lvl20_0.png",
  "20.05": "lv20__0p.png",
  "20.1": "lv20__1.png",
  "20.15": "lv20__1p.png",
  "20.2": "lv20__2.png",
  "20.25": "lv20__2p.png",
  "20.3": "lv20__3.png",
  "20.35": "lv20__3p.png",
  "20.4": "lv20__4.png",
  "20.45": "lv20__4p.png",
  "20.5": "20.5.png",
  "20.55": "20.5p.png",
  "20.6": "20.6.png",
  "20.65": "20.6p.png",
  "20.7": "20.7.png",
  "20.75": "20.7p.png",
  "20.8": "20.8.png",
  "20.85": "20.8p.png",
  "20.9": "20.9.png",
  "20.95": "20.9p.png",
  "21": "21.png",
  "21.05": "21p.png",
  "21.1": "21.1.png",
  "21.15": "21.1p.png",
  "21.2": "21.2.png",
  "21.25": "21.2p.png",
  "21.3": "21.3.png",
  "21.35": "21.3+.png",
}



const pguDataType = "pguDiff"
const pguData = {
  "P1": "P1.png",
  "P2": "P2.png",
  "P3": "P3.png",
  "P4": "P4.png",
  "P5": "P5.png",
  "P6": "P6.png",
  "P7": "P7.png",
  "P8": "P8.png",
  "P9": "P9.png",
  "P10": "P10.png",
  "P11": "P11.png",
  "P12": "P12.png",
  "P13": "P13.png",
  "P14": "P14.png",
  "P15": "P15.png",
  "P16": "P16.png",
  "P17": "P17.png",
  "P18": "P18.png",
  "P19": "P19.png",
  "P20": "P20.png",
  "G1": "G1.png",
  "G2": "G2.png",
  "G3": "G3.png",
  "G4": "G4.png",
  "G5": "G5.png",
  "G6": "G6.png",
  "G7": "G7.png",
  "G8": "G8.png",
  "G9": "G9.png",
  "G10": "G10.png",
  "G11": "G11.png",
  "G12": "G12.png",
  "G13": "G13.png",
  "G14": "G14.png",
  "G15": "G15.png",
  "G16": "G16.png",
  "G17": "G17.png",
  "G18": "G18.png",
  "G19": "G19.png",
  "G20": "G20.png",
  "U1": "U1.png",
  "U2": "U2.png",
  "U3": "U3.png",
  "U4": "U4.png",
  "U5": "U5.png",
  "U6": "U6.png",
  "U7": "U7.png",
  "U8": "U8.png",
  "U9": "U9.png",
  "U10": "U10.png",
  "U11": "U11.png",
  "U12": "U12.png",
  "U13": "U13.png",
  "U14": "U14.png",
  "U15": "U15.png",
  "U16": "U16.png",
  "U17": "U17.png",
  "U18": "U18.png",
  "U19": "U19.png",
  "U20": "U20.png",
}


const inputDataType = "miscDiff"
const inputData = {
  "Qq": "Qq.png",
  "Q1+": "q1+.png",
  "Q2": "q2.png",
  "Q2+": "q2+.png",
  "Q3": "q3.png",
  "Q3+": "q3+.png",
  "Q4": "q4.png",
  "Bus": "Desertbus.png",
  "Grande": "Grande.png",
  "MA": "ma.png",
  "MP": "MP.png",
  "-21": "21-.png",
  "-2": "-2.png",
  "0": "Unranked.png",
}



const pgnDataType = "miscDiff"
const pgnData = {
  "0": "Unranked.png",
  "-2": "-2.png",
  "-21": "21-.png",
  "-22": "MP.png",
  "0.9": "epiccc.png",
  "727": "Grande.png",
  "64": "Desertbus.png",
  "21.5": "Qq.png",
  "21.55": "q2.png",
  "21.6": "q2+.png",
  "21.65": "q3.png",
  "21.7": "q3+.png",
  "MA": "ma.png",
}

const newDataType = "miscDiff"
const newData = {

  "64": "q3.png",
  "66": "q4.png",
  "101": "Desertbus.png",
  "102": "ma.png",
  "61": "Qq.png"
}


const imagePh = [
  "../src/assets/placeholder/1.png",
  "../src/assets/placeholder/2.png",
  "../src/assets/placeholder/3.png",
  "../src/assets/placeholder/4.png",
];

export const legacyDataRaw = Object.fromEntries(
  Object.entries(legacyData).map(([key, fileName]) => [
    key,
    `${baseURL}${legacyDataType}/${fileName}${queryParams}`,
  ])
);

export const pguDataRaw = Object.fromEntries(
  Object.entries(pguData).map(([key, fileName]) => [
    key,
    `${baseURL}${pguDataType}/${fileName}${queryParams}`,
  ])
);

export const inputPguDictRaw = [
  ...Object.entries(pguData).map(([key, fileName]) => [
    key,
    `${baseURL}${pguDataType}/${fileName}${queryParams}`
  ])
];



export const pgnDataRaw = Object.fromEntries(
  Object.entries(pgnData).map(([key, fileName]) => [
    key,
    `${baseURL}${pgnDataType}/${fileName}${queryParams}`,
  ])
);



const newDataRaw = Object.fromEntries(
  Object.entries(newData).map(([key, fileName]) => [
    key,
    `${baseURL}${newDataType}/${fileName}${queryParams}`,
  ])
);

export const legacyInputDataRaw = [
  ...Object.entries(legacyData).map(([key, fileName]) => [
    key,
    `${baseURL}${legacyDataType}/${fileName}${queryParams}`,
  ])
  
]

export const inputDataRaw = [
  ...Object.entries(pguData).map(([key, fileName]) => [
    key,
    `${baseURL}${pguDataType}/${fileName}${queryParams}`,
  ]),
  ...Object.entries(inputData).slice(1).map(([key, fileName]) => [
    key,
    `${baseURL}${inputDataType}/${fileName}${queryParams}`,
  ]),
  ...Object.entries(inputData).slice(0, 1).map(([key, fileName]) => [
    key,
    `${baseURL}${inputDataType}/${fileName}${queryParams}`,
  ])
];

export const inputDictRaw = {
  // Convert PGU data entries
  ...Object.fromEntries(
    Object.entries(pguData).map(([key, fileName]) => [
      key,
      `${baseURL}${pguDataType}/${fileName}${queryParams}`
    ])
  ),
  
  // Convert regular input data entries (excluding first)
  ...Object.fromEntries(
    Object.entries(inputData)
      .slice(1)
      .map(([key, fileName]) => [
        key,
        `${baseURL}${inputDataType}/${fileName}${queryParams}`
      ])
  ),
  
  // Convert first input data entry separately
  ...Object.fromEntries(
    Object.entries(inputData)
      .slice(0, 1)
      .map(([key, fileName]) => [
        key,
        `${baseURL}${inputDataType}/${fileName}${queryParams}`
      ])
  )
};

async function fetchRecent(ids) {
  try {
    const resp = await Promise.all(ids.map(id =>
      api.get(`${import.meta.env.VITE_INDIVIDUAL_LEVEL}${id}`)
    ));
    
    const res = resp.map(res => res.data);
    const respTwo = await api.get(`${import.meta.env.VITE_ALL_LEVEL_URL}?limit=15&offset=0`);
    const resTwo = respTwo.data;

    const finalRes = {
      recentRated: resTwo.map(res => ({
        id: res.id,
        song: res.song,
        artist: res.artist,
        creator: res.creator,
        charter: res.charter,
        vfxer: res.vfxer,
        team: res.team,
        workshopLink: res.workshopLink,
        dlLink: res.dlLink,
        pguDiff: res.pguDiff,
        pguDiffNum: res.pguDiffNum,
        pdnDiff: res.pdnDiff,
        diff: res.diff,
        baseScore: res.baseScore,
        isCleared: res.isCleared,
        clears: res.clears,
        publicComments: res.publicComments
      })),
      recentFeatured: res.map(res => ({
        id: res.id,
        song: res.song,
        artist: res.artist,
        creator: res.creator,
        charter: res.charter,
        vfxer: res.vfxer,
        team: res.team,
        vidLink: res.vidLink,
        dlLink: res.dlLink,
        workshopLink: res.workshopLink
      }))
    };
    return finalRes

  } catch (error) {
    console.error(error);
    return {};
  }
}

async function fetchData({ offset = "", diff = '', cleared = '', sort = '', direction = '' } = {}) {
  const baseUrl = import.meta.env.VITE_OFFSET_LEVEL

  const queryParams = new URLSearchParams({
    ...(offset && { offset }),
    ...(diff && { diff }),
    ...(cleared && { cleared }),
    ...(sort && direction && { sort: `${sort}_${direction}` }),
  }).toString();
  const url = `${baseUrl}${queryParams}`

  try {
    const res = await api.get(url)
    const simplifiedRes = res.data.results.map(each => ({
      id: each.id,
      song: each.song,
      artist: each.artist,
      creator: each.creator,
      diff: each.diff,
      dlLink: each.dlLink,
      wsLink: each.workshopLink

    }))

    return simplifiedRes
  } catch (error) {
    console.error(error)
    return []
  }

}


async function fetchPassInfo(id) {
  try {
    const res = await api.get(`${import.meta.env.VITE_INDIVIDUAL_PASSES}${id}`)
    return res.data
  } catch (error) {
    console.error(error)
    return []
  }
}

async function fetchLevelInfo(id) {
  try {
    const [levelRes, passesRes] = await Promise.all([
      api.get(`${import.meta.env.VITE_INDIVIDUAL_LEVEL}${id}`),
      api.get(`${import.meta.env.VITE_ALL_PASSES_URL}/level/${id}`)
    ]);

    return {
      level: levelRes.data,
      passes: passesRes.data
    };
  } catch (error) {
    console.error('Error fetching level info:', error);
    throw error;
  }
}

async function checkLevel(id) {
  try {
    const res = await api.get(`${import.meta.env.VITE_INDIVIDUAL_LEVEL}${id}`)
    if(id === "#"){
      return
    }
    if(res){
      return res.data
    }

  } catch (error) {
    throw new error
  }
}

async function fetchPassPlayerInfo(playerNames) {
  try {
    // Fetch player info in parallel
    const playerPromises = playerNames.map(name => 
      fetchPlayerByName(name)
    );
    
    const players = await Promise.all(playerPromises);
    return players.filter(player => player !== null);
  } catch (error) {
    console.error('Error fetching player info:', error);
    return [];
  }
}

async function fetchPlayerByName(name) {
  try {
    const { data } = await api.get(`${import.meta.env.VITE_PLAYERS_API}`, {
      params: { name }
    });
    return data.results[0]; // Return first match
  } catch (error) {
    console.error('Error fetching player:', error);
    return null;
  }
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

function selectItemConsistently(name, items) {
  const hash = simpleHash(name);
  const index = Math.abs(hash) % items.length;
  return items[index];
}


function getYouTubeThumbnailUrl(url) {
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const longUrlRegex = /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/;

  const shortMatch = url.match(shortUrlRegex);
  const longMatch = url.match(longUrlRegex);

  const videoId = shortMatch ? shortMatch[1] : (longMatch ? longMatch[1] : null);

  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/0.jpg`;
  } else {
    return; 
  }
}

function getBilibiliEmbedUrl(data) {

  // Extract aid and cid from the data
  const { aid, bvid, cid } = data;

  if (bvid) {
    // Construct the iframe src URL
    return `//player.bilibili.com/player.html?isOutside=true&aid=${aid}&bvid=${bvid}&cid=${cid}&p=1`;
  } else {
    return null; // Return null if bvid is not found
  }
}

function getYouTubeEmbedUrl(url) {
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const longUrlRegex = /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/;
  const timestampRegex = /[?&]t=(\d+)s/;

  const shortMatch = url.match(shortUrlRegex);
  const longMatch = url.match(longUrlRegex);
  const timestampMatch = url.match(timestampRegex);

  const videoId = shortMatch ? shortMatch[1] : longMatch ? longMatch[1] : null;
  const timestamp = timestampMatch ? timestampMatch[1] : null;

  if (videoId) {
    let embedUrl = `https://www.youtube.com/embed/${videoId}`;
    if (timestamp) {
      embedUrl += `?start=${timestamp}`;
    }
    return embedUrl;
  } else {
    return null;
  }
}


async function getBilibiliVideoDetails(url) {
  
  const urlRegex = /https?:\/\/(www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)\/?/;

  const match = url.match(urlRegex);

  const videoId = match ? match[2] : null;

  if (!videoId) {
    return null;
  }

  
  const apiUrl = `${import.meta.env.VITE_BILIBILI_API}?bvid=${videoId}`;

  try {
    const response = await api.get(apiUrl);
    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    if (response.code === -400){
      return null;
    }
    const data = response.data.data;

    const unix = data.pubdate; // Start with a Unix timestamp
    const date = new Date(unix * 1000); // Convert timestamp to milliseconds
    const imageUrl = `${import.meta.env.VITE_IMAGE}?url=${encodeURIComponent(data.pic)}`;
    const pfpUrl = `${import.meta.env.VITE_IMAGE}?url=${encodeURIComponent(data.owner.face)}`;

    const details = {
      title: data.title,
      channelName: data.owner.name,
      timestamp: date.toISOString(),
      image: imageUrl,
      embed: getBilibiliEmbedUrl(data),
      pfp: pfpUrl
    };

    
    return details;
  } catch (error) {
    console.error('Error fetching Bilibili video details:', error);
    return null; 
  }
}

async function getYouTubeVideoDetails(url) {
  
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const longUrlRegex = /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/;

  const shortMatch = url.match(shortUrlRegex);
  const longMatch = url.match(longUrlRegex);

  const videoId = shortMatch ? shortMatch[1] : (longMatch ? longMatch[1] : null);

  if (!videoId) {
    return null;
  }

  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY; 
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
  var channelApiUrl = `https://www.googleapis.com/youtube/v3/channels`;


   try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    const channelId = data.items[0].snippet.channelId;
    channelApiUrl = `${channelApiUrl}?${new URLSearchParams({
      id: channelId,
      key: apiKey,
      part: "snippet"
    }).toString()}`;
    const channelResponse = await fetch(channelApiUrl);
    const channelData = await channelResponse.json();

    if (data.items.length === 0) {
      return null;
    }

    const details = {
      title: data.items[0].snippet.title,
      channelName: data.items[0].snippet.channelTitle,
      timestamp: data.items[0].snippet.publishedAt,
      image: getYouTubeThumbnailUrl(url),
      embed: getYouTubeEmbedUrl(url),
      pfp: channelData.items[0].snippet.thumbnails.default.url
    };

    return details;
  } catch (error) {
    console.error('Error fetching YouTube video details:', error);
    return null; 
  }
}

async function getVideoDetails(url) {

  if (!url){
    return null;
  }
  var details = await getYouTubeVideoDetails(url)
  if (!details) {
    details = await getBilibiliVideoDetails(url)
  }

  return details;
}

async function getDriveFromYt(link) {
  let yoon = null;
  let drive = null;
  let dsc = null;

  let id = "";

  if (!link){
    id = null;
  } else if (link.split("/")[0].includes("youtu.be")) {
      id = link.split('/').join(',').split('?').join(',').split(',')[1];
  } else if (link.split("/")[2].includes("youtu.be")) {
      id = link.split("/").join(',').split('?').join(',').split(',')[3];
  } else {
      id = link.split('?v=')[1];
  }

  try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=AIzaSyAvW8Fe_CqIUHzYw2aSMKCe247NtSewmJY`);
      const data = await response.json();

      if (data.items[0]) {
          let desc = data.items[0].snippet.description;
          let format = desc.split('\n').join(',').split('/').join(',').split(',');
          yoon = "";
          drive = "";
          dsc = desc;

          // Handle Google Drive links
          if (desc.includes("drive.google.com/file/d")) { 
              for (let i = 0; i < format.length; i++) {
                  if (format[i].includes("drive.google.com")) {
                      drive += "https://" + format[i] + "/file/d/" + format[i+3] + "/" + format[i+4] + "\n"; 
                  }
              }
          }

          // Handle hyonsu.com links
          if (desc.includes("hyonsu.com/")) { 
              for (let i = 0; i < format.length; i++) {
                  if (format[i].includes("hyonsu.com")) {
                      yoon += "https://" + format[i] + "/attachments/" + format[i+2] + "/" + format[i+3] + "/" + format[i+4] + "\n";
                  }
              }
          }

          // Handle Discord CDN links
          if (desc.includes("cdn.discordapp.com")) { 
              for (let i = 0; i < format.length; i++) {
                  if (format[i].includes("cdn.discordapp.com")) {
                      yoon += "https://fixcdn.hyonsu.com/attachments/" + format[i+2] + "/" + format[i+3] + "/" + format[i+4] + "\n";
                  }
              }
          }



          // Return the result
          return {
              drive: drive? drive: yoon,
              desc: dsc
          };
      }
  } catch (error) {
      console.error("Error fetching YouTube video details:", error);
      return null; // Return null if an error occurs
  }

  return {
      yoon: yoon,
      drive: drive,
      desc: dsc
  };
}



function isoToEmoji(code) {
  const htmlString =  twemoji.parse(code
    .toLowerCase()
    .split("")
    .map(letter => letter.charCodeAt(0) % 32 + 0x1F1E5)
    .map(n => String.fromCodePoint(n))
    .join(""))

  const srcRegex = /src\s*=\s*"(.+?)"/;
  const match = htmlString.match(srcRegex);

  return match ? match[1] : null;
}



export {
  getYouTubeVideoDetails, 
  getDriveFromYt,
  checkLevel, 
  isoToEmoji, 
  fetchPassPlayerInfo, 
  fetchRecent, 
  fetchData, 
  fetchLevelInfo, 
  getVideoDetails, 
  fetchPassInfo,
}

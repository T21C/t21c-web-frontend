import twemoji from '@discordapp/twemoji';
import api from "@/utils/api";

export function formatNumber(num, digits = 2) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}

function getYouTubeThumbnailUrl(url) {
  const patterns = {
    short: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    long: /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    live: /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  };

  for (const pattern of Object.values(patterns)) {
    const match = url.match(pattern);
    if (match) {
      return `https://img.youtube.com/vi/${match[1]}/0.jpg`;
    }
  }
  return null;
}

function getBilibiliEmbedUrl(data) {

  // Extract aid and cid from the data
  const { aid, bvid, cid } = data;

  if (bvid) {
    // Construct the iframe src URL
    return `//player.bilibili.com/player.html?isOutside=true&aid=${aid}&bvid=${bvid}&cid=${cid}&p=1&autoplay=0`;
  } else {
    return null; // Return null if bvid is not found
  }

}
function getYouTubeEmbedUrl(url) {
  const patterns = {
    short: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    long: /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    live: /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  };
  const timestampRegex = /[?&]t=(\d+)s/;

  let videoId = null;
  for (const pattern of Object.values(patterns)) {
    const match = url.match(pattern);
    if (match) {
      videoId = match[1];
      break;
    }
  }

  const timestampMatch = url.match(timestampRegex);
  const timestamp = timestampMatch ? timestampMatch[1] : null;

  if (videoId) {
    let embedUrl = `https://www.youtube.com/embed/${videoId}`;
    if (timestamp) {
      embedUrl += `?start=${timestamp}`;
    }
    return embedUrl;
  }
  return null;
}


async function getBilibiliVideoDetails(url) {
  const patterns = [
    /https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
    /https?:\/\/(?:www\.)?b23\.tv\/(BV[a-zA-Z0-9]+)/,
    /https?:\/\/(?:www\.)?bilibili\.com\/.*?(BV[a-zA-Z0-9]+)/
  ];

  let videoId = null;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      videoId = match[1];
      break;
    }
  }

  if (!videoId) {
    return null;
  }

  const apiUrl = `${import.meta.env.VITE_BILIBILI_API}?bvid=${videoId}`;

  try {
    const response = await api.get(apiUrl);
    if (response.status !== 200) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    if (response.code === -400) {
      return null;
    }
    const data = response.data.data;

    const unix = data.pubdate;
    const date = new Date(unix * 1000);
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

// Client-side YouTube video details - now fetched server-side
// This function only extracts the video ID for server processing
function extractYouTubeVideoId(url) {
  const patterns = {
    short: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    long: /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    live: /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  };

  for (const pattern of Object.values(patterns)) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

async function getVideoDetails(url) {
  return await api.get(`${import.meta.env.VITE_API_URL}/v2/media/video-details/${encodeURIComponent(url)}`).then(res => res.data);
}

async function getDriveFromYt(link) {
  return null;
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
  extractYouTubeVideoId,
  getDriveFromYt,
  isoToEmoji, 
  getVideoDetails, // Now only handles Bilibili
  getYouTubeThumbnailUrl,
  getYouTubeEmbedUrl
}


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

async function getYouTubeVideoDetails(url) {
  const patterns = {
    short: /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    long: /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    live: /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/
  };

  let videoId = null;
  for (const pattern of Object.values(patterns)) {
    const match = url.match(pattern);
    if (match) {
      videoId = match[1];
      break;
    }
  }

  if (!videoId) {
    return null;
  }

  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
  var channelApiUrl = `https://www.googleapis.com/youtube/v3/channels`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.items.length === 0) {
      return null;
    }

    const channelId = data.items[0].snippet.channelId;
    channelApiUrl = `${channelApiUrl}?${new URLSearchParams({
      id: channelId,
      key: apiKey,
      part: "snippet"
    }).toString()}`;
    const channelResponse = await fetch(channelApiUrl);
    const channelData = await channelResponse.json();

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
  isoToEmoji, 
  getVideoDetails, 
}

// videoDetails.js
 // Use node-fetch for server-side fetch
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function getBilibiliVideoDetails(url) {
    const urlRegex = /https?:\/\/(www\.)?bilibili\.com\/video\/(BV[a-zA-Z0-9]+)\/?/;
    const match = url.match(urlRegex);
    const videoId = match ? match[2] : null;

    if (!videoId) {
        return null;
    }

    const apiUrl = `${process.env.OWN_URL}/api/bilibili?bvid=${videoId}`;

    try {
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const resp = await response.json();

        if (resp.code === -400) {
            return null;
        }

        const data = resp.data;
        const pfpUrl = `${process.env.OWN_URL}/api/image?url=${encodeURIComponent(data.owner.face)}`;

        return pfpUrl
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

    const apiKey = process.env.YOUTUBE_API_KEY;
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
    const channelApiUrl = `https://www.googleapis.com/youtube/v3/channels`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.items.length === 0) {
            return null;
        }

        const channelId = data.items[0].snippet.channelId;
        const channelResponse = await fetch(`${channelApiUrl}?id=${channelId}&key=${apiKey}&part=snippet`);
        const channelData = await channelResponse.json();

        return channelData.items[0].snippet.thumbnails.default.url
    } catch (error) {
        console.error('Error fetching YouTube video details:', error);
        return null;
    }
}

export async function getPfpUrl(url) {
    if (!url) {
        return null;
    }

    let details = await getYouTubeVideoDetails(url);
    if (!details) {
        details = await getBilibiliVideoDetails(url);
    }

    return details;
}

import twemoji from '@discordapp/twemoji';
import api from "@/utils/api";
import * as Utility from "@/utils/Utility";

export function formatNumber(num, digits = 2) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}


async function getVideoDetails(url) {
  return await api.get(`${import.meta.env.VITE_API_URL}/v2/media/video-details/${encodeURIComponent(url)}`).then(res => res.data);
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
  isoToEmoji, 
  getVideoDetails,
  Utility
}
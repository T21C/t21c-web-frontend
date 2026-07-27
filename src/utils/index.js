import { routes } from '@/api/routes';
// tuf-search: #utils #index
import twemoji from '@discordapp/twemoji';
import api from "@/utils/api";
import * as Utility from "@/utils/Utility";

export function formatNumber(num, digits = 2) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}


/**
 * Fetch cached video metadata for a URL.
 * Never rejects — network / abort failures resolve to `null` so callers can
 * safely use `.then()` / `await` without local try/catch.
 */
async function getVideoDetails(url) {
  if (!url) return null;
  try {
    const res = await api.get(routes.media.videoDetails(url));
    return res.data ?? null;
  } catch {
    return null;
  }
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
import axios from 'axios';

const legacyData = {
  "1" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv01.png?raw=true",
  "2" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv02.png?raw=true",
  "3" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv03.png?raw=true",
  "4" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv04.png?raw=true",
  "5" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv05.png?raw=true",
  "6" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv06.png?raw=true",
  "7" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv07.png?raw=true",
  "8" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv08.png?raw=true",
  "9" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv09.png?raw=true",
  "10" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/10.png?raw=true",
  "11" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/11.png?raw=true",
  "12" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/12.png?raw=true",
  "13" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/13.png?raw=true",
  "14" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/14.png?raw=true",
  "15" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/15.png?raw=true",
  "16" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/16.png?raw=true",
  "17" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/17.png?raw=true",
  "18" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/18.png?raw=true",
  "18.5" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/18+.png?raw=true",
  "19" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/19.png?raw=true",
  "19.5" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/19+.png?raw=true",
  "20" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lvl20_0.png?raw=true",
  "20.05" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__0p.png?raw=true",
  "20.1" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__1.png?raw=true",
  "20.15" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__1p.png?raw=true",
  "20.2" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__2.png?raw=true",
  "20.25" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__2p.png?raw=true",
  "20.3" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__3.png?raw=true",
  "20.35" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__3p.png?raw=true",
  "20.4" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__4.png?raw=true",
  "20.45" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/lv20__4p.png?raw=true",
  "20.5" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.5.png?raw=true",
  "20.55" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.5p.png?raw=true",
  "20.6" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.6.png?raw=true",
  "20.65" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.6p.png?raw=true",
  "20.7" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.7.png?raw=true",
  "20.75" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.7p.png?raw=true",
  "20.8" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.8.png?raw=true",
  "20.85" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.8p.png?raw=true",
  "20.9" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.9.png?raw=true",
  "20.95" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/20.9p.png?raw=true",
  "21" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21.png?raw=true",
  "21.05" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21p.png?raw=true",
  "21.1" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21.1.png?raw=true",
  "21.15" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21.1p.png?raw=true",
  "21.2" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21.2.png?raw=true",
  "21.25" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21.2p.png?raw=true",
  "21.3" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21.3.png?raw=true",
  "21.35" : "https://github.com/T21C/T21C-assets/blob/main/legacyDiff/21.3+.png?raw=true",
}

const pguData = {
  "P1" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P1.png?raw=true",
  "P2" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P2.png?raw=true",
  "P3" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P3.png?raw=true",
  "P4" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P4.png?raw=true",
  "P5" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P5.png?raw=true",
  "P6" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P6.png?raw=true",
  "P7" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P7.png?raw=true",
  "P8" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P8.png?raw=true",
  "P9" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P9.png?raw=true",
  "P10" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P10.png?raw=true",
  "P11" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P11.png?raw=true",
  "P12" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P12.png?raw=true",
  "P13" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P13.png?raw=true",
  "P14" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P14.png?raw=true",
  "P15" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P15.png?raw=true",
  "P16" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P16.png?raw=true",
  "P17" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P17.png?raw=true",
  "P18" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P18.png?raw=true",
  "P19" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P19.png?raw=true",
  "P20" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/P20.png?raw=true",
  "G1" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G1.png?raw=true",
  "G2" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G2.png?raw=true",
  "G3" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G3.png?raw=true",
  "G4" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G4.png?raw=true",
  "G5" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G5.png?raw=true",
  "G6" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G6.png?raw=true",
  "G7" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G7.png?raw=true",
  "G8" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G8.png?raw=true",
  "G9" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G9.png?raw=true",
  "G10" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G10.png?raw=true",
  "G11" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G11.png?raw=true",
  "G12" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G12.png?raw=true",
  "G13" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G13.png?raw=true",
  "G14" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G14.png?raw=true",
  "G15" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G15.png?raw=true",
  "G16" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G16.png?raw=true",
  "G17" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G17.png?raw=true",
  "G18" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G18.png?raw=true",
  "G19" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G19.png?raw=true",
  "G20" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/G20.png?raw=true",
  "U1" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U1.png?raw=true",
  "U2" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U2.png?raw=true",
  "U3" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U3.png?raw=true",
  "U4" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U4.png?raw=true",
  "U5" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U5.png?raw=true",
  "U6" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U6.png?raw=true",
  "U7" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U7.png?raw=true",
  "U8" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U8.png?raw=true",
  "U9" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U9.png?raw=true",
  "U10" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U10.png?raw=true",
  "U11" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U11.png?raw=true",
  "U12" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U12.png?raw=true",
  "U13" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U13.png?raw=true",
  "U14" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U14.png?raw=true",
  "U15" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U15.png?raw=true",
  "U16" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U16.png?raw=true",
  "U17" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U17.png?raw=true",
  "U18" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U18.png?raw=true",
  "U19" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U19.png?raw=true",
  "U20" : "https://github.com/T21C/T21C-assets/blob/main/pguDiff/U20.png?raw=true",
}

const pgnData = {
  "0"  : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/Unranked.png?raw=true",
  "-2" :"https://github.com/T21C/T21C-assets/blob/main/miscDiff/-2.png?raw=true",
 "-21" : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/21-.png?raw=true",
  "-22"  : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/MP.png?raw=true",
  "0.9"  : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/epiccc.png?raw=true",
  "727"  : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/Grande.png?raw=true",
  "64"  : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/Desertbus.png?raw=true",
  "21.5" : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/q1+.png?raw=true", 
  "21.55" : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/q2.png?raw=true", 
  "21.6" : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/q2+.png?raw=true", 
  "21.65" : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/q3.png?raw=true", 
  "21.7" : "https://github.com/T21C/T21C-assets/blob/main/miscDiff/q3+.png?raw=true"
}

const imagePh = [
  "src/assets/waves/1.png",
  "src/assets/waves/2.png",
  "src/assets/waves/3.png",
  "src/assets/waves/4.png",
];



async function fetchRecent(ids) {
  try {
      const resp = await Promise.all(ids.map(id =>
          axios.get(`${import.meta.env.VITE_INDIVIDUAL_LEVEL}${id}`)
      ));
      
      const res = resp.map(res => res.data);
      const respTwo = await axios.get(`${import.meta.env.VITE_OFFSET_LEVEL}`);
      const resTwo = respTwo.data.results;

      const finalRes =  {
          recentRated: resTwo.map(res => ({
              id: res.id,
              song: res.song,
              artist: res.artist,
              creator: res.creator,
              team: res.team,
              ws:res.workshopDownload,
              dl: res.dlLink,
              pguDiff: res.pguDiff,
              pdnDiff: res.pdnDiff,
              legacy : res.diff
          })),
          recentFeatured: res.map(res => ({
              id: res.id,
              song: res.song,
              artist: res.artist,
              creator: res.creator,
              vidLink: res.vidLink,
          }))
      };
      console.log(finalRes)
      return finalRes

  } catch (error) {
      console.error(error);
      return {};
  }
}

async function fetchData({offset = "", diff = '', cleared = '', sort = '', direction = '' } = {}){
    const baseUrl = import.meta.env.VITE_OFFSET_LEVEL

    const queryParams = new URLSearchParams({
        ...(offset && {offset}),
        ...(diff && { diff }),
        ...(cleared && { cleared }),
        ...(sort && direction && { sort: `${sort}_${direction}` }),
      }).toString();
      const url = `${baseUrl}${queryParams}`
      console.log(url)

      try{
        const res = await axios.get(url)
        const simplifiedRes = res.data.results.map(each => ({
            id : each.id,
            song: each.song,
            artist: each.artist,
            creator:each.creator,
            diff: each.diff,
            dlLink:each.dlLink,
            wsLink: each.workshopLink

        }))
        console.log(simplifiedRes)

        return simplifiedRes
      }catch(error){
        console.error(error)
        return []
      }
    
}


async function fetchLevelInfo(id){
  try{
    const res = await axios.get(`${import.meta.env.VITE_INDIVIDUAL_LEVEL}${id}`)
    const res2 = await axios.get(`${import.meta.env.VITE_INDIVIDUAL_PASSES}${id}`)

    return {
      level : res.data, 
      passes :{
        count : res2.data.length,
        player : res2.data}
      }

  }catch(error){
    throw new error
  }
}

async function fetchPassPlayerInfo(players){
  if(!players) return
  try{

    const res = await Promise.all(players.map(player =>{
       return axios.get(`${import.meta.env.VITE_INDIVIDUAL_PLAYER}${player}`)
    }))
    
    return res.map(entry => entry.data.results[0])
  }catch(error){
    console.log(error)
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


function getYouTubeThumbnailUrl(url, title) {
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const longUrlRegex = /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/;

  const shortMatch = url.match(shortUrlRegex);
  const longMatch = url.match(longUrlRegex);

  const videoId = shortMatch
    ? shortMatch[1]
    : longMatch
    ? longMatch[1]
    : null;

  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/0.jpg`;
  } else {
    return selectItemConsistently(title, imagePh);  }
}

function getYouTubeEmbedUrl(url) {
  const shortUrlRegex = /youtu\.be\/([a-zA-Z0-9_-]{11})/;
  const longUrlRegex = /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/;

  const shortMatch = url.match(shortUrlRegex);
  const longMatch = url.match(longUrlRegex);

  const videoId = shortMatch ? shortMatch[1] : longMatch ? longMatch[1] : null;

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  } else {
    return null; 
  }
}




function getLevelImage(pdnDiff, diff, legacy){
  if(diff == "64"){
    return pgnData["64"]
  }
  if(legacy){
    return legacyData[diff] == null ? pgnData[pdnDiff] : legacyData[diff];
  }else {
    return pdnDiff == diff ?  pgnData[pdnDiff] : pguData[diff];
  }

}

function isoToEmoji(code){
  return code
  .toLowerCase()
  .split("")
  .map(letter => letter.charCodeAt(0)%32 + 0x1F1E5)
  .map(n => String.fromCodePoint(n))
  .join("")
}
  


export {isoToEmoji, fetchPassPlayerInfo, fetchRecent, fetchData, fetchLevelInfo, getYouTubeThumbnailUrl, getYouTubeEmbedUrl, getLevelImage}
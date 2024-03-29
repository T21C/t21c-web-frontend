import axios from 'axios';

async function fetchRecent(){
    try {
        const res = await axios.get(import.meta.env.VITE_ALL_LEVEL_URL);
        return res.data.results.slice(0, 3);
    } catch (error) {
        console.error(error)
        return []
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

function getColorDiff(diff){
  if(diff == 0){
    return "eb3467"
  }else if(diff == 1 || diff == 2){
    return "#0099ff"
  }else if(diff == 3){
    return "00bbff"
  }else if(diff == 4){
    return "00ddff"
  }else if(diff == 5){
    return "00fff"
  }else if(diff == 6){
    return "00ffaa"
  }else if(diff == 7){
    return "00ff00"
  }else if(diff == 8){
    return "64fa00"
  }else if(diff == 9){
    return "99ff00"
  }else if(diff == 10){
    return "ccff00"
  }else if(diff == 11){
    return "ffff00"
  }else if(diff == 12){
    return "ffdd00"
  }else if(diff == 13){
    return "ffcc00"
  }else if(diff == 14){
    return "ffaa00"
  }else if(diff == 15){
    return "ff8800"
  }else if(diff == 16){
    return "ff6600"
  }else if(diff == 17){
    return "ff4400"
  }else if(diff == 18){
    return "ff0000"
  }else if(diff >18 && diff < 19 ){
    return "cc0000"
  }else if(diff == 19){
    return "a61c00"
  }else if(diff >19 && diff < 20 ){
    return "660000"
  }else if(diff == 20){
    return "360900"
  }else if(diff >20 && diff < 20.1 ){
    return "2e0800"
  }else if(diff == 20.1){
    return "240600"
  }else if(diff >20.1 && diff < 20.2 ){
    return "210702"
  }else if(diff == 20.2){
    return "200600"
  }else if(diff >20.2 && diff < 20.3 ){
    return "130400"
  }else if(diff == 20.3){
    return "0d0300"
  }else if(diff >20.3 && diff < 20.4 ){
    return "000000"
  }else if(diff == 20.4){
    return "060430"
  }else if(diff >20.4 && diff < 20.5 ){
    return "0a031f"
  }else if(diff == 20.5){
    return "110634"
  }else if(diff >20.5 && diff < 20.6 ){
    return "11072d"
  }else if(diff >20.6 && diff < 20.7 ){
    return "150837"
  }else if(diff == 20.7){
    return "180b3b"
  }else if(diff >20.7 && diff < 20.8 ){
    return "190c3c"
  }else if(diff == 20.8){
    return "1f0f4a"
  }else if(diff >20.8 && diff < 20.9 ){
    return "1c0d45"
  }else if(diff == 20.9){
    return "261358"
  }else if(diff >20.9 && diff < 21 ){
    return "29155e"
  }else if(diff == 21){
    return "2d1766"
  }else if(diff >21 && diff < 21.1 ){
    return "311a6e"
  }else if(diff == 21.1){
    return "351c75"
  }else if(diff >21.1 && diff < 21.2 ){
    return "321d67"
  }else if(diff == 21.2){
    return "2e1d59"
  }else if(diff >21.2 && diff < 21.3 ){
    return "221541"
  }else if(diff == 21.3){
    return "1c0c45"
  }
}


async function fetchLevelInfo(id){
  try{
    const res = await axios.get(`${import.meta.env.VITE_INDIVIDUAL_LEVEL}${id}`)
    const res2 = await axios.get(`${import.meta.env.VITE_INDIVIDUAL_PASSES}${id}`)
    return {level : res.data, passes : res2.data}
  }catch(error){
    throw new error
  }
}



export {fetchRecent, fetchData, getColorDiff, fetchLevelInfo}
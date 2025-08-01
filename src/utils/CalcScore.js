import calcAcc from "./CalcAcc"

const gmConst = 315
const start = 1
const end = 50
const startDeduc = 10
const endDeduc = 50
const pwr = 0.7

function arraySum(arr) {
    return arr.reduce(add, 0);
}

function add(accumulator, a) {
  return accumulator + a;
}

const getScoreV2Mtp = (inputs) => {
    const misses = inputs[0]
    const tiles = arraySum(inputs.slice(1))
    if (!misses){
        return 1.1
    }
    const tp = (start + end) / 2
    const tpDeduc = (startDeduc + endDeduc) / 2
    const am = Math.max(0, misses - Math.floor(tiles / gmConst))
    if (am <= 0){
        return 1
    }   
    else if (am <= start){
        return 1 - startDeduc / 100
    }
    if (am <= tp){
        let kOne = Math.pow((am - start) / (tp - start), pwr) * (tpDeduc - startDeduc) / 100;
        return 1 - startDeduc / 100 - kOne
    }
    else if (am <= end){
        let kTwo = Math.pow((end - am) / (end - tp), pwr) * (endDeduc - tpDeduc) / 100;
        return 1 + kTwo - endDeduc / 100
    }
    else{
        return 1 - endDeduc / 100
    }
    }

    const getXaccMtp = (inp, baseScore) => {

        const xacc = calcAcc(inp, true)
        const xacc_percentage = xacc * 100

        if (xacc_percentage < 95){
            return 1
        }
        if (xacc_percentage < 100){
            return (-0.027 / (xacc - 1.0054) + 0.513)
        }
        if (xacc_percentage == 100){
            return 10;
            // wait for announcement
            const a = 2100;
            const k = 14;
            const h = -a / (k - 6);
          
            return (-a) / (baseScore - h) + k;
        }
    }
    

const getSpeedMtp = (SPEED, isDesBus=false)=>{
    if (isDesBus){
        if (!SPEED || SPEED == 1)
            return 1
        else if (SPEED > 1){
            return Math.max(2 - SPEED, 0)}
    }

    if (!SPEED || SPEED == 1){
        return 1}
    if (SPEED < 1){
        return 0}
    if (SPEED < 1.1){
        return -3.5 * SPEED + 4.5}
    if (SPEED < 1.5){
        return 0.65}
    if (SPEED < 2){
        return (0.7 * SPEED) - 0.4}
    return 1
}

const getScore = (passData, levelData) => {
    const speed = passData['speed']
    const inputs = passData['judgements']
    const base = levelData['baseScore'] || levelData.difficulty?.baseScore || 0
    const xaccMtp = getXaccMtp(inputs, base)
    var speedMtp = 0
    var score = 0
    if (levelData?.difficulty?.name == "Marathon"){
        speedMtp = getSpeedMtp(speed, true)
        score = Math.max(base * xaccMtp * speedMtp, 1)
    }
    else {
        speedMtp = getSpeedMtp(speed)
        score = base * xaccMtp * speedMtp
    }
    return score
}


export const getScoreV2 = (passData, levelData) => {
    
    const inputs = passData['judgements'];
    const scoreOrig = getScore(passData, levelData);
    var mtp = getScoreV2Mtp(inputs);
    if (passData['isNoHoldTap']) 
       {
        mtp *= 0.9
    };
    
    return (scoreOrig * mtp)
}
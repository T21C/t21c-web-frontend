import calcAcc from "./CalcAcc"
import { arraySum } from "./HelperFns"

const gmConst = 315
const start = 1
const end = 50
const startDeduc = 10
const endDeduc = 50
const pwr = 0.7

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

    const getXaccMtp = (inp) => {

        const xacc = calcAcc(inp, true)
        const xaccPercentage = xacc * 100;
        console.log(`X Accuracy: ${xaccPercentage}`);
    
        if (xaccPercentage < 95) {
            console.log("Returning 1 from position: xacc < 95");
            return 1;
        }
        else if (xaccPercentage < 99) {
            const result = (xaccPercentage - 94) ** 1.6 / 12.1326 + 0.9176;
            console.log(`Returning ${result} from position: 95 <= xacc < 99`);
            return result;
        }
        else if (xaccPercentage < 99.8) {
            const result = (xaccPercentage - 97) ** 1.5484 - 0.9249;
            console.log(`Returning ${result} from position: 99 <= xacc < 99.8`);
            return result;
        }
        else if (xaccPercentage < 100) {
            const result = (xaccPercentage - 99) * 5;
            console.log(`Returning ${result} from position: 99.8 <= xacc < 100`);
            return result;
        }
        else if (xaccPercentage === 100) {
            console.log("Returning 6 from position: xacc == 100");
            return 6;
        }
    }
    

const getSpeedMtp = (SPEED, isDesBus=false)=>{
    if (isDesBus){
        if (!SPEED || SPEED == 1)
            return 1
        else if (SPEED > 1){
            return 2 - SPEED}
    }

    if (!SPEED || SPEED == 1){
        return 1}
    if (SPEED < 1){
        return 0}
    if (SPEED < 1.1){
        return 25 * (SPEED - 1.1) ** 2 + 0.75}
    if (SPEED < 1.2){
        return 0.75}
    if (SPEED < 1.25){
        return 50 * (SPEED - 1.2) ** 2 + 0.75}
    if (SPEED < 1.3){
        return -50 * (SPEED - 1.3) ** 2 + 1}
    if (SPEED < 1.5){
        return 1}
    if (SPEED < 1.75){
        return 2 * (SPEED - 1.5) ** 2 + 1}
    if (SPEED < 2){
        return -2 * (SPEED - 2) ** 2 + 1.25}
    return 0
}

const getScore = (passData, chartData) => {
    const speed = passData['speed']
    const legacyDiff = chartData['diff']
    const inputs = passData['judgements']
    const base = chartData['baseScore']
    const xaccMtp = getXaccMtp(inputs)


    var speedMtp = 0
    var score = 0
    if (legacyDiff == 64){
        speedMtp = getSpeedMtp(speed, True)
        score = Math.max(base * xaccMtp * speedMtp, 1)
    }
    else {
        speedMtp = getSpeedMtp(speed)
        score = base * xaccMtp * speedMtp
    }
    console.log(score);
    return score
}


export const getScoreV2 = (passData, chartData) => {
    
    console.log(passData);
    console.log(chartData);
    
    

    const inputs = passData['judgements'];
    const scoreOrig = getScore(passData, chartData);
    const mtp = getScoreV2Mtp(inputs);
//if (passData['isNoHoldTap'])     not implemented in the google form
//    {mtp *= 0.9};
    
    return (scoreOrig * mtp)
}
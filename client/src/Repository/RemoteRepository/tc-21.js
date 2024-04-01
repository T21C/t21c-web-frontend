/* eslint-disable no-undef */
function calculateAccuracy(judgements)
{
    if(!judgements[0] && !judgements[1] && !judgements[2] &&!judgements[3] &&!judgements[4] &&!judgements[5] && !judgements[6]){
        return 95;
    }
    let total = 0;
    let weights = 0;
    for(let i = 0; i < judgements.length; i++)
    {
        total += judgements[i]
    }
    weights += judgements[0] * 20;
    weights += (judgements[1] + judgements[5]) * 40;
    weights += (judgements[2] + judgements[4]) * 75;
    weights += judgements[3] * 100;
    return weights / total;
}

function calculatePP(xacc, speed, baseScore, isDesertBus, tileCount, misses, isNoHoldTap)
{
    let gmConst = 315
    let start = 1
    let end = 50
    let startDeduc = 10
    let endDeduc = 50
    let pwr = 0.7
    
    let xaccMtp = 0
    let speedMtp = 0
    let scorev2Mtp = 0
    
    let score = 0
    let scorev2 = 0

    let kOne, kTwo;
    
    //get xacc multiplier
    if (xacc < 95){
        xaccMtp = 1
    }
    else if (xacc < 99){
        xaccMtp = (xacc - 94) ** 1.6 / 12.1326 + 0.9176
    }
    else if (xacc < 99.8){
        xaccMtp = (xacc - 97) ** 1.5484 - 0.9249
    }
    else if (xacc < 100){
        xaccMtp = (xacc - 99) * 5
    }
    else if (xacc == 100){
        xaccMtp = 6
    }
    // console.log(xaccMtp)
    
    //get speed multiplier
    if (isDesertBus)
    {
        if (speed == 1)
        {
            speedMtp = 1
        }
        else if (speed > 1)
        {
            speedMtp = 2 - speed
        }
    }
    else if (speed == 1){
        speedMtp = 1
    }
    else if (speed < 1){
        speedMtp = 0
    }
    else if (speed < 1.1){
        speedMtp = 25 * (speed - 1.1) ** 2 + 0.75
    }
    else if (speed < 1.2){
        speedMtp = 0.75
    }
    else if (speed < 1.25){
        speedMtp = 50 * (speed - 1.2) ** 2 + 0.75
    }
    else if (speed < 1.3){
        speedMtp = -50 * (speed - 1.3) ** 2 + 1
    }
    else if (speed < 1.5){
        speedMtp = 1
    }
    else if (speed < 1.75){
        speedMtp = 2 * (speed - 1.5) ** 2 + 1
    }
    else if (speed < 2){
        speedMtp = -2 * (speed - 2) ** 2 + 1.25
    }
    else{
        speedMtp = 0
    }
    
    //get scorev2 multiplier
    if (misses == 0){
        scorev2Mtp = 1.1
    }
    
    let tp = (start + end) / 2
    let tpDeduc = (startDeduc + endDeduc) / 2
    let am = Math.max(0, misses - Math.floor(tileCount / gmConst))
    
    if (am <= 0){
        scorev2Mtp = 1
    }
    else if (am <= start){
        scorev2Mtp = 1 - startDeduc / 100
    }
    else if (am <= tp){
        let kOne = Math.pow((am - start) / (tp - start), pwr) * (tpDeduc - startDeduc) / 100
        scorev2Mtp = 1 - startDeduc / 100 - kOne
    }
    else if (am <= end){
        kTwo = Math.pow((end - am) / (end - tp), pwr) * (endDeduc - tpDeduc) / 100
        scorev2Mtp = 1 - kTwo - endDeduc / 100
    }
    else{
        scorev2Mtp = 1 - endDeduc / 100
    }
    
    //get score
    score = Math.max(1, baseScore * xaccMtp * speedMtp)
    
    //get scorev2
    if (isNoHoldTap){
        scorev2Mtp *= 0.9
    }
    scorev2 = score * scorev2Mtp
    
    return scorev2
}

function getRankedScore(scores, top = 20) {
    if (scores.length < top) {
            top = scores.length
    }

    let rankedScore = 0
    for (let i = 0; i < top; i++) {
        rankedScore += (0.9**i)*scores[i]
    }
    return rankedScore
}

// console.log(calculateAccuracy([16, 44, 47, 10614, 68, 25, 0]));
// console.log("---------------")
// console.log(calculatePP(99.232938783059, 1, 4000, false, 10798, 16, false));

export {calculateAccuracy, calculatePP, getRankedScore}
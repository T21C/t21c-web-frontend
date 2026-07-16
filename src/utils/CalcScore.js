// tuf-search: #CalcScore #calcScore
import calcAcc from "./CalcAcc"
import {
    resolveXaccCurveForLevelData,
    xaccMultiplier as xaccCurveMultiplier,
} from "./scoreV2XaccCurve.js"

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

/** Applied by getScoreV2 when miss count is zero (matches plotted zero-miss curve). */
export const SCORE_V2_ZERO_MISS_MULTIPLIER = 1.1

export const getScoreV2Mtp = (inputs) => {
    if (!inputs || !Array.isArray(inputs)) {
        return SCORE_V2_ZERO_MISS_MULTIPLIER
    }
    const misses = inputs[0]
    const tiles = arraySum(inputs.slice(1))
    if (!misses){
        return SCORE_V2_ZERO_MISS_MULTIPLIER
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

/**
 * ScoreV2 miss-debuff multiplier for a miss count and hit-tile count (speed 1, no no-hold).
 * Zero misses returns {@link SCORE_V2_ZERO_MISS_MULTIPLIER}.
 */
export function scoreV2MtpFromMisses(misses, hitTiles) {
    const m = Math.max(0, Math.floor(Number(misses)) || 0)
    const hits = Math.max(0, Math.floor(Number(hitTiles)) || 0)
    if (hits <= 0) {
        return m === 0 ? SCORE_V2_ZERO_MISS_MULTIPLIER : 1
    }
    return getScoreV2Mtp([m, 0, 0, hits, 0, 0])
}

const getXaccMtp = (inp, baseScore, curveOverrides) => {
    const xacc = calcAcc(inp)
    return xaccCurveMultiplier(xacc, baseScore, curveOverrides)
}
    

/** Standard speed multiplier (Marathon / desync-bus branch removed). */
export const getSpeedMtp = (SPEED) => {
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

/** Prefer level override, else difficulty baseScore; PP uses ppBaseScore at 100% xacc. */
export function resolveScoreBase(levelData, accuracy, difficultyDict = {}) {
    if (
        accuracy === 1 &&
        levelData?.ppBaseScore != null &&
        Number.isFinite(levelData.ppBaseScore)
    ) {
        return levelData.ppBaseScore
    }
    if (levelData?.baseScore != null && Number.isFinite(levelData.baseScore)) {
        return levelData.baseScore
    }
    const fromLevelDiff = levelData?.difficulty?.baseScore
    if (fromLevelDiff != null && Number.isFinite(fromLevelDiff)) {
        return fromLevelDiff
    }
    const fromDict = difficultyDict?.[levelData?.diffId]?.baseScore
    if (fromDict != null && Number.isFinite(fromDict)) {
        return fromDict
    }
    return 0
}

const getScore = (passData, levelData, difficultyDict = {}) => {
    const speed = Number.isFinite(passData?.speed) ? passData.speed : 1
    const inputs = passData?.judgements
    const accuracy = calcAcc(inputs)
    const base = resolveScoreBase(levelData, accuracy, difficultyDict)
    const xaccMtp = getXaccMtp(inputs, base, resolveXaccCurveForLevelData(levelData))
    const speedMtp = getSpeedMtp(speed)
    return base * xaccMtp * speedMtp
}


export const getScoreV2 = (passData, levelData, difficultyDict = {}) => {
    
    const inputs = passData['judgements'];
    const scoreOrig = getScore(passData, levelData, difficultyDict);
    var mtp = getScoreV2Mtp(inputs);
    if (passData['isNoHoldTap']) 
       {
        mtp *= 0.95
    };
    
    return (scoreOrig * mtp)
}

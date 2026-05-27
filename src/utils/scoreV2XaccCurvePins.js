// tuf-search: #scoreV2XaccCurvePins
import { getScoreV2 } from './CalcScore.js'
import {
    enumerateScoreV2CurvePoints,
    interpolateCurveScoreAtAccuracy,
    buildJudgements,
} from './scoreV2Curve.js'
import {
    XACC_CURVE_DEFAULTS,
    XACC_SITE_DEFAULT_PIN1_ACC,
    XACC_SITE_DEFAULT_PIN2_ACC,
    XACC_PIN_ACC_GAP,
    XACC_PIN_ACC_MAX,
    XACC_PIN_ACC_MIN,
    XACC_PIN2_ACC_MAX,
    fitXaccCurveFromPins,
    parseXaccCurveMeta,
    pickLevelXaccCurve,
    resolveXaccCurveConfig,
    levelUsesSiteXaccDefaults,
    xaccMultiplier,
    displayScoreFromXaccMultiplier,
} from './scoreV2XaccCurve.js'

const SLIDER_MIN = 1
const SLIDER_MAX = 100
const SLIDER_SPAN = SLIDER_MAX - SLIDER_MIN

function clampSliderDisplay(display) {
    const n = Math.round(Number(display))
    if (!Number.isFinite(n)) return SLIDER_MIN
    return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, n))
}

function clampAccPin1(acc) {
    return Math.min(XACC_PIN_ACC_MAX, Math.max(XACC_PIN_ACC_MIN, acc))
}

function clampAccPin2(acc) {
    return Math.min(XACC_PIN2_ACC_MAX, Math.max(XACC_PIN_ACC_MIN, acc))
}

function resolveBaseScore(baseScore) {
    const base = Number(baseScore)
    if (Number.isFinite(base) && base > 0) return base
    return 100
}

/**
 * Base used at 100% accuracy (ppBaseScore when set, else level base).
 * @param {object | null | undefined} level
 * @param {number} [baseScore] Resolved rating base.
 */
export function resolvePurePerfectBase(level, baseScore) {
    const pp = Number(level?.ppBaseScore)
    if (Number.isFinite(pp) && pp > 0) return pp
    return resolveBaseScore(baseScore)
}

/**
 * Max pin score: pure-perfect base × top multiplier (same cap as 100% on the xacc curve).
 * @param {object | null | undefined} level
 * @param {number} baseScore
 * @param {number} [topMultiplier]
 */
export function resolvePinScoreMax(level, baseScore, topMultiplier) {
    const perfectBase = resolvePurePerfectBase(level, baseScore)
    const G = Number(topMultiplier)
    const mult =
        Number.isFinite(G) && G > 1 ? G : XACC_CURVE_DEFAULTS.topMultiplier
    return perfectBase * mult
}

function clampPinScore(score, scoreMax) {
    const s = Number(score)
    const max = Number(scoreMax)
    if (!Number.isFinite(s)) return 0
    if (!Number.isFinite(max) || max <= 0) return Math.max(0, s)
    return Math.min(max, Math.max(0, s))
}

/**
 * ScoreV2 at 100% accuracy (xacc = 1) with the given level + xacc curve — upper bound for pins/chart.
 * @param {object} levelData baseScore, ppBaseScore, diffId, difficulty, xaccCurve
 * @param {object} [difficultyDict]
 * @param {number} [tilecount]
 */
export function resolvePurePerfectScoreV2(levelData, difficultyDict = {}, tilecount = 100) {
    const hitTiles = Math.max(1, Math.floor(Number(tilecount)) || 0)
    const judgements = buildJudgements(0, hitTiles, 0, 0)
    const score = getScoreV2(
        { speed: 1, judgements, isNoHoldTap: false },
        levelData ?? {},
        difficultyDict,
    )
    return Number.isFinite(score) && score > 0 ? score : 0
}

/** Pin score slider/input range [0, pure-perfect score]. */
export function pinScoreRange(baseScore, scoreMax) {
    const base = resolveBaseScore(baseScore)
    const max = Number(scoreMax)
    const resolvedMax =
        Number.isFinite(max) && max > 0
            ? max
            : resolvePinScoreMax(null, base, XACC_CURVE_DEFAULTS.topMultiplier)
    return {
        min: 0,
        max: resolvedMax,
        base,
    }
}

/** Pin 1: display 1–100 → accuracy in [XACC_PIN_ACC_MIN, XACC_PIN_ACC_MAX]. */
export function accuracyFromSliderPin1(display) {
    const d = clampSliderDisplay(display)
    return (
        XACC_PIN_ACC_MIN +
        ((d - SLIDER_MIN) / SLIDER_SPAN) * (XACC_PIN_ACC_MAX - XACC_PIN_ACC_MIN)
    )
}

/** Pin 2: display 1–100 → accuracy up to 100%. */
export function accuracyFromSliderPin2(display) {
    const d = clampSliderDisplay(display)
    return (
        XACC_PIN_ACC_MIN +
        ((d - SLIDER_MIN) / SLIDER_SPAN) * (XACC_PIN2_ACC_MAX - XACC_PIN_ACC_MIN)
    )
}

/** @deprecated use accuracyFromSliderPin1 */
export function accuracyFromSlider(display) {
    return accuracyFromSliderPin1(display)
}

export function accuracyToSliderPin1(acc) {
    const a = Number(acc)
    if (!Number.isFinite(a)) {
        return accuracyToSliderPin1(XACC_SITE_DEFAULT_PIN1_ACC)
    }
    const clamped = clampAccPin1(a)
    const t = (clamped - XACC_PIN_ACC_MIN) / (XACC_PIN_ACC_MAX - XACC_PIN_ACC_MIN)
    return Math.round(SLIDER_MIN + t * SLIDER_SPAN)
}

export function accuracyToSliderPin2(acc) {
    const a = Number(acc)
    if (!Number.isFinite(a)) {
        return accuracyToSliderPin2(XACC_SITE_DEFAULT_PIN2_ACC)
    }
    const clamped = clampAccPin2(a)
    const t = (clamped - XACC_PIN_ACC_MIN) / (XACC_PIN2_ACC_MAX - XACC_PIN_ACC_MIN)
    return Math.round(SLIDER_MIN + t * SLIDER_SPAN)
}

/** @deprecated use accuracyToSliderPin1 for pin 1; accuracyToSliderPin2 for pin 2 */
export function accuracyToSlider(acc) {
    return accuracyToSliderPin1(acc)
}

/** Display 1–100 → score in [0, scoreMax]. */
export function scoreFromSlider(display, baseScore, scoreMax) {
    const d = clampSliderDisplay(display)
    const { min, max } = pinScoreRange(baseScore, scoreMax)
    const span = max - min
    if (span <= 0) return min
    return min + ((d - SLIDER_MIN) / SLIDER_SPAN) * span
}

/** Score → display 1–100. */
export function scoreToSlider(score, baseScore, scoreMax) {
    const s = Number(score)
    const { min, max } = pinScoreRange(baseScore, scoreMax)
    if (!Number.isFinite(s)) {
        return scoreToSlider(min, baseScore, scoreMax)
    }
    const clamped = Math.min(max, Math.max(min, s))
    const span = max - min
    if (span <= 0) return SLIDER_MIN
    const t = (clamped - min) / span
    return Math.round(SLIDER_MIN + t * SLIDER_SPAN)
}

/** Minimum pin 2 accuracy slider given pin 1 accuracy (display units). */
export function minAccYSliderFromAccXSlider(accXDisplay) {
    const accX = accuracyFromSliderPin1(accXDisplay)
    return accuracyToSliderPin2(Math.min(XACC_PIN2_ACC_MAX, accX + XACC_PIN_ACC_GAP))
}

/** Maximum pin 1 accuracy slider given pin 2 accuracy (display units). */
export function maxAccXSliderFromAccYSlider(accYDisplay) {
    const accY = accuracyFromSliderPin2(accYDisplay)
    return accuracyToSliderPin1(Math.max(XACC_PIN_ACC_MIN, accY - XACC_PIN_ACC_GAP))
}

/** Canonical interior pin accuracies for site defaults (98.5% and 99.5%). */
export function siteDefaultPinAccuracyLocations(cfg = XACC_CURVE_DEFAULTS) {
    const resolved = resolveXaccCurveConfig(cfg)
    return {
        accX: clampAccPin1(XACC_SITE_DEFAULT_PIN1_ACC),
        accY: clampAccPin2(XACC_SITE_DEFAULT_PIN2_ACC),
        cutoff: resolved.cutoff,
    }
}

/**
 * ScoreV2 at an accuracy using the plotted zero-miss curve for the given level + xacc config.
 */
export function scoreV2AtAccuracy(accuracy, levelData, difficultyDict, tilecount) {
    const acc = Number(accuracy)
    if (!Number.isFinite(acc)) return null
    const hitTiles = Math.max(1, Math.floor(Number(tilecount)) || 0)
    const points = enumerateScoreV2CurvePoints({
        tilecount: hitTiles,
        misses: 0,
        levelData: levelData ?? {},
        difficultyDict: difficultyDict ?? {},
        speed: 1,
        isNoHoldTap: false,
    })
    const score = interpolateCurveScoreAtAccuracy(points, acc * 100)
    return Number.isFinite(score) ? score : null
}

/**
 * Interior pin accuracies (⅓ / ⅔ of band) with scores on the xacc hyperbola for the given E/G.
 */
export function pinsOnCurveAtDefaultLocations(xaccCurve, _levelData, _difficultyDict, _tilecount, baseScore) {
    const cfg = resolveXaccCurveConfig(xaccCurve ?? XACC_CURVE_DEFAULTS)
    const { accX, accY, cutoff } = siteDefaultPinAccuracyLocations(cfg)
    const base = resolveBaseScore(baseScore)
    return {
        accX,
        accY,
        scoreX: displayScoreFromXaccMultiplier(xaccMultiplier(accX, 0, cfg), base),
        scoreY: displayScoreFromXaccMultiplier(xaccMultiplier(accY, 0, cfg), base),
        baseScore: base,
        cutoff,
    }
}

/** Site-default E/G (5.545 / 0.0054) → pin locations on that hyperbola. */
export function siteDefaultPinValues(_levelData, _difficultyDict, _tilecount, baseScore) {
    return pinsOnCurveAtDefaultLocations(
        XACC_CURVE_DEFAULTS,
        null,
        null,
        0,
        baseScore,
    )
}

/** Map stored pin values to slider displays (visual presets only; values stay exact). */
function pinSliderValuesFromPins(pins, base, scoreMax) {
    return {
        accXDisplay: accuracyToSliderPin1(pins.accX),
        scoreXDisplay: scoreToSlider(pins.scoreX, base, scoreMax),
        accYDisplay: accuracyToSliderPin2(pins.accY),
        scoreYDisplay: scoreToSlider(pins.scoreY, base, scoreMax),
        accX: pins.accX,
        accY: pins.accY,
        scoreX: pins.scoreX,
        scoreY: pins.scoreY,
        baseScore: base,
        scoreMax,
    }
}

/**
 * @param {{ scoreX?: number, scoreY?: number, accX?: number, accY?: number } | null} [pinOverrides]
 *   Authoritative pin values (e.g. manual score input or seeded defaults).
 */
export function pinValuesFromSliders(
    accXDisplay,
    scoreXDisplay,
    accYDisplay,
    scoreYDisplay,
    baseScore,
    scoreMax,
    pinOverrides = null,
) {
    let accX =
        pinOverrides?.accX != null && Number.isFinite(Number(pinOverrides.accX))
            ? Number(pinOverrides.accX)
            : accuracyFromSliderPin1(accXDisplay)
    let accY =
        pinOverrides?.accY != null && Number.isFinite(Number(pinOverrides.accY))
            ? Number(pinOverrides.accY)
            : accuracyFromSliderPin2(accYDisplay)
    const base = resolveBaseScore(baseScore)
    const scoreX =
        pinOverrides?.scoreX != null && Number.isFinite(Number(pinOverrides.scoreX))
            ? clampPinScore(pinOverrides.scoreX, scoreMax)
            : scoreFromSlider(scoreXDisplay, base, scoreMax)
    const scoreY =
        pinOverrides?.scoreY != null && Number.isFinite(Number(pinOverrides.scoreY))
            ? clampPinScore(pinOverrides.scoreY, scoreMax)
            : scoreFromSlider(scoreYDisplay, base, scoreMax)

    return { accX, scoreX, accY, scoreY, baseScore: base }
}

export function levelToPinSliderValues(
    level,
    baseScoreOverride,
    scoreMaxOverride,
    context = null,
) {
    const base = resolveBaseScore(baseScoreOverride ?? level?.baseScore)
    const curve = pickLevelXaccCurve(level) ?? XACC_CURVE_DEFAULTS
    const scoreMax =
        scoreMaxOverride ??
        resolvePinScoreMax(level, base, curve.topMultiplier)

    const meta = parseXaccCurveMeta(level?.xaccCurveMeta)
    const storedPins = meta?.pins && typeof meta.pins === 'object' ? meta.pins : null

    const levelData = context?.levelData ?? {
        baseScore: base,
        ppBaseScore: level?.ppBaseScore ?? 0,
        diffId: level?.diffId,
        difficulty: level?.difficulty,
        xaccCurve: curve,
    }
    const difficultyDict = context?.difficultyDict ?? {}
    const tilecount = context?.tilecount > 0 ? context.tilecount : 100

    const useDefaults = levelUsesSiteXaccDefaults(level)
    const pins = storedPins
        ? resolvePinsFromMeta(storedPins, base, curve)
        : useDefaults
            ? siteDefaultPinValues(levelData, difficultyDict, tilecount, base)
            : pinsOnCurveAtDefaultLocations(
                  curve,
                  levelData,
                  difficultyDict,
                  tilecount,
                  base,
              )

    return {
        ...pinSliderValuesFromPins(pins, base, scoreMax),
        useDefaults,
    }
}

function resolvePinsFromMeta(rawPins, baseScore, curve) {
    const fallback = pinsOnCurveAtDefaultLocations(
        curve,
        { baseScore, xaccCurve: curve },
        {},
        100,
        baseScore,
    )

    const accX = Number(rawPins.accX)
    const accY = Number(rawPins.accY)
    const storedScoreX = Number(rawPins.scoreX)
    const storedScoreY = Number(rawPins.scoreY)

    const multX =
        rawPins.multX != null && Number.isFinite(Number(rawPins.multX))
            ? Number(rawPins.multX)
            : NaN

    const multY =
        rawPins.multY != null && Number.isFinite(Number(rawPins.multY))
            ? Number(rawPins.multY)
            : NaN

    const scoreX = Number.isFinite(storedScoreX)
        ? storedScoreX
        : Number.isFinite(multX)
            ? rawPins.scoresAreXaccMultipliers
                ? displayScoreFromXaccMultiplier(multX, baseScore)
                : baseScore * multX
            : fallback.scoreX

    const scoreY = Number.isFinite(storedScoreY)
        ? storedScoreY
        : Number.isFinite(multY)
            ? rawPins.scoresAreXaccMultipliers
                ? displayScoreFromXaccMultiplier(multY, baseScore)
                : baseScore * multY
            : fallback.scoreY

    return {
        accX: Number.isFinite(accX) ? accX : fallback.accX,
        accY: Number.isFinite(accY) ? accY : fallback.accY,
        scoreX,
        scoreY,
    }
}

export function defaultPinSliderValues(
    level,
    baseScore,
    scoreMax,
    context = null,
) {
    const base = resolveBaseScore(baseScore)
    const curve = pickLevelXaccCurve(level) ?? XACC_CURVE_DEFAULTS
    const levelData = context?.levelData ?? {
        baseScore: base,
        ppBaseScore: level?.ppBaseScore ?? 0,
        diffId: level?.diffId,
        difficulty: level?.difficulty,
        xaccCurve: curve,
    }
    const pins = siteDefaultPinValues(
        levelData,
        context?.difficultyDict ?? {},
        context?.tilecount > 0 ? context.tilecount : 100,
        base,
    )
    return pinSliderValuesFromPins(
        pins,
        base,
        scoreMax ??
            resolvePinScoreMax(level, base, curve.topMultiplier),
    )
}

export function pinSlidersToXaccCurve(
    accXDisplay,
    scoreXDisplay,
    accYDisplay,
    scoreYDisplay,
    baseScore,
    scoreMax,
    scoreOverrides = null,
    fallbackCurve = null,
) {
    const pins = pinValuesFromSliders(
        accXDisplay,
        scoreXDisplay,
        accYDisplay,
        scoreYDisplay,
        baseScore,
        scoreMax,
        scoreOverrides,
    )
    const fit = fitXaccCurveFromPins(pins)
    const fb = resolveXaccCurveConfig(
        fallbackCurve ?? XACC_CURVE_DEFAULTS,
    )

    if (!fit.ok) {
        return {
            ok: false,
            pins,
            error: fit.error,
            xaccCurve: {
                poleOffset: fb.poleOffset,
                topMultiplier: fb.topMultiplier,
            },
            derivedE: fb.poleOffset,
            derivedG: fb.topMultiplier,
        }
    }

    return {
        ok: true,
        pins,
        xaccCurve: {
            poleOffset: fit.poleOffset,
            topMultiplier: fit.topMultiplier,
        },
        derivedE: fit.poleOffset,
        derivedG: fit.topMultiplier,
    }
}

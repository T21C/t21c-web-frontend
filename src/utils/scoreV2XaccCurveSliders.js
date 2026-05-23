// tuf-search: #scoreV2XaccCurveSliders
import {
    XACC_CURVE_DEFAULTS,
    XACC_POLE_OFFSET_MIN,
    XACC_POLE_OFFSET_MAX,
    XACC_TOP_MULTIPLIER_MIN,
    XACC_TOP_MULTIPLIER_MAX,
} from './scoreV2XaccCurve.js'

const SLIDER_MIN = 1
const SLIDER_MAX = 100
const SLIDER_SPAN = SLIDER_MAX - SLIDER_MIN

function clampSliderDisplay(display) {
    const n = Math.round(Number(display))
    if (!Number.isFinite(n)) return SLIDER_MIN
    return Math.min(SLIDER_MAX, Math.max(SLIDER_MIN, n))
}

/** Display 1–100 → pole offset E. */
export function poleOffsetFromSlider(display) {
    const d = clampSliderDisplay(display)
    return (
        XACC_POLE_OFFSET_MIN +
        ((d - SLIDER_MIN) / SLIDER_SPAN) * (XACC_POLE_OFFSET_MAX - XACC_POLE_OFFSET_MIN)
    )
}

/** Pole offset E → display 1–100. */
export function poleOffsetToSlider(poleOffset) {
    const E = Number(poleOffset)
    if (!Number.isFinite(E)) {
        return poleOffsetToSlider(XACC_CURVE_DEFAULTS.poleOffset)
    }
    const clamped = Math.min(XACC_POLE_OFFSET_MAX, Math.max(XACC_POLE_OFFSET_MIN, E))
    const t = (clamped - XACC_POLE_OFFSET_MIN) / (XACC_POLE_OFFSET_MAX - XACC_POLE_OFFSET_MIN)
    return Math.round(SLIDER_MIN + t * SLIDER_SPAN)
}

/** Display 1–100 → top multiplier G. */
export function topMultiplierFromSlider(display) {
    const d = clampSliderDisplay(display)
    return (
        XACC_TOP_MULTIPLIER_MIN +
        ((d - SLIDER_MIN) / SLIDER_SPAN) * (XACC_TOP_MULTIPLIER_MAX - XACC_TOP_MULTIPLIER_MIN)
    )
}

/** Top multiplier G → display 1–100. */
export function topMultiplierToSlider(topMultiplier) {
    const G = Number(topMultiplier)
    if (!Number.isFinite(G)) {
        return topMultiplierToSlider(XACC_CURVE_DEFAULTS.topMultiplier)
    }
    const clamped = Math.min(XACC_TOP_MULTIPLIER_MAX, Math.max(XACC_TOP_MULTIPLIER_MIN, G))
    const t = (clamped - XACC_TOP_MULTIPLIER_MIN) / (XACC_TOP_MULTIPLIER_MAX - XACC_TOP_MULTIPLIER_MIN)
    return Math.round(SLIDER_MIN + t * SLIDER_SPAN)
}

/**
 * Initial slider positions from level row or site defaults.
 * @param {{ xaccPoleOffset?: number | null, xaccTopMultiplier?: number | null } | null | undefined} level
 */
export function levelToSliderValues(level) {
    const pole =
        level?.xaccPoleOffset != null ? level.xaccPoleOffset : XACC_CURVE_DEFAULTS.poleOffset
    const top =
        level?.xaccTopMultiplier != null
            ? level.xaccTopMultiplier
            : XACC_CURVE_DEFAULTS.topMultiplier
    return {
        poleDisplay: poleOffsetToSlider(pole),
        topDisplay: topMultiplierToSlider(top),
        useDefaults: level?.xaccPoleOffset == null && level?.xaccTopMultiplier == null,
    }
}

/** Draft curve config for ScoreV2Graph from slider display values. */
export function slidersToXaccCurve(poleDisplay, topDisplay) {
    return {
        poleOffset: poleOffsetFromSlider(poleDisplay),
        topMultiplier: topMultiplierFromSlider(topDisplay),
    }
}

/** Legacy default slider positions. */
export function defaultSliderValues() {
    return levelToSliderValues(null)
}

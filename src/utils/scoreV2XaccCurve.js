// tuf-search: #scoreV2XaccCurve #xaccCurve
/**
 * Normalized hyperbola xacc multiplier on [cutoff, 1):
 *   t = (xacc - cutoff) / (1 - cutoff)
 *   u(t) = (g(t) - 1) / (topMultiplier - 1)   with u(0)=0, u(1)=1
 *   mtp  = 1 + (topMultiplier - 1) * u(t)
 *
 * Legacy defaults (pole at 1.0054, top ~5.513) match the old
 * -0.027/(x - 1.0054) + 0.513 slice with exact pins at cutoff and 100%.
 */

/** @typedef {Object} XaccCurveConfig
 * @property {number} [cutoff] Accuracy at which the xacc band starts (default 0.95).
 * @property {number} [topMultiplier] Multiplier at xacc -> 1- (default legacy g(1)).
 * @property {number} [poleOffset] Pole offset above 1 (E); pole = 1 + poleOffset (default 0.0054).
 */

/** @type {Required<XaccCurveConfig>} */
export const XACC_CURVE_DEFAULTS = {
    cutoff: 0.95,
    topMultiplier: 5.513,
    poleOffset: 0.0054,
}

/**
 * @param {XaccCurveConfig | null | undefined} overrides
 * @returns {Required<XaccCurveConfig>}
 */
export function resolveXaccCurveConfig(overrides) {
    if (!overrides || typeof overrides !== 'object') {
        return { ...XACC_CURVE_DEFAULTS }
    }
    return {
        cutoff: overrides.cutoff ?? XACC_CURVE_DEFAULTS.cutoff,
        topMultiplier: overrides.topMultiplier ?? XACC_CURVE_DEFAULTS.topMultiplier,
        poleOffset: overrides.poleOffset ?? XACC_CURVE_DEFAULTS.poleOffset,
    }
}

/**
 * Hyperbola coefficients pinned so g(0)=1 and g(1)=topMultiplier in t-space.
 * @param {Required<XaccCurveConfig>} cfg
 */
export function xaccHyperbolaCoefficients(cfg) {
    const span = 1 - cfg.cutoff
    const G = cfg.topMultiplier
    const E = cfg.poleOffset
    const A = ((G - 1) * E * (span + E)) / span
    const B = 1 - A / (span + E)
    return { A, B, span, G, E }
}

/**
 * Unit shape u(t) in [0, 1], with u(0)=0 and u(1)=1.
 * @param {number} t
 * @param {Required<XaccCurveConfig>} cfg
 */
export function xaccUnitShape(t, cfg) {
    const { A, B, span, G, E } = xaccHyperbolaCoefficients(cfg)
    const g = B - A / (span * (t - 1) - E)
    return (g - 1) / (G - 1)
}

/**
 * @param {number} xacc Extended accuracy in [0, 1] (use calcAcc judgements with raw=true on client).
 * @param {number} baseScore Level base for the perfect-accuracy branch.
 * @param {XaccCurveConfig | null | undefined} curveOverrides Optional per-level knobs (future).
 * @returns {number}
 */
export function xaccMultiplier(xacc, baseScore, curveOverrides) {
    const cfg = resolveXaccCurveConfig(curveOverrides)
    const xaccPct = xacc * 100

    if (xaccPct < cfg.cutoff * 100) {
        return 1
    }
    if (xaccPct < 100) {
        const span = 1 - cfg.cutoff
        const t = (xacc - cfg.cutoff) / span
        const clamped = Math.max(0, Math.min(1, t))
        const u = xaccUnitShape(clamped, cfg)
        return 1 + (cfg.topMultiplier - 1) * u
    }
    if (xaccPct == 100) {
        const a = 2100
        const k = 14
        const h = -a / (k - 6)
        return -a / (baseScore - h) + k
    }
    return 1
}

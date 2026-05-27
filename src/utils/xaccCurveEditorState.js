// tuf-search: #xaccCurveEditorState #xaccCurve
import {
    EMPTY_JUDGEMENT_FORM,
    accuracyFromJudgementForm,
} from './xaccPinJudgements.js'
import { parseXaccCurveMeta } from './scoreV2XaccCurve.js'

/** Pin accuracy fraction — calcAcc vs stored pin may differ at ~1e-9. */
const ACC_EPS = 1e-7
/** Pin score — slider round-trip / display vs stored. */
const SCORE_EPS = 0.02

const JUDGEMENT_KEYS = [
    'earlyDouble',
    'earlySingle',
    'ePerfect',
    'perfect',
    'lPerfect',
    'lateSingle',
    'lateDouble',
]

/**
 * @param {unknown} raw
 * @returns {typeof EMPTY_JUDGEMENT_FORM}
 */
export function normalizeJudgementForm(raw) {
    if (!raw || typeof raw !== 'object') {
        return { ...EMPTY_JUDGEMENT_FORM }
    }
    const out = { ...EMPTY_JUDGEMENT_FORM }
    for (const key of JUDGEMENT_KEYS) {
        if (raw[key] != null && raw[key] !== '') {
            out[key] = String(raw[key])
        }
    }
    return out
}

function parsePassId(value) {
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

function parseSliderDisplay(value) {
    const n = Number(value)
    return Number.isFinite(n) ? Math.round(n) : null
}

/**
 * @param {unknown} meta
 * @returns {import('./xaccCurveEditorState.js').XaccCurveEditorState | null}
 */
export function editorStateFromXaccCurveMeta(meta) {
    const root = parseXaccCurveMeta(meta)
    if (!root) {
        return null
    }
    const raw = root.editor ?? root.pins?.editor ?? null
    if (!raw || typeof raw !== 'object') {
        return null
    }

    const pin1 = raw.pin1 && typeof raw.pin1 === 'object' ? raw.pin1 : {}
    const pin2 = raw.pin2 && typeof raw.pin2 === 'object' ? raw.pin2 : {}

    const pinInputMode =
        raw.pinInputMode === 'judgements' ? 'judgements' : 'accuracy'

    return {
        pinInputMode,
        disablePP: Boolean(raw.disablePP),
        accXDisplay: parseSliderDisplay(raw.accXDisplay),
        scoreXDisplay: parseSliderDisplay(raw.scoreXDisplay),
        accYDisplay: parseSliderDisplay(raw.accYDisplay),
        scoreYDisplay: parseSliderDisplay(raw.scoreYDisplay),
        pin1Judgements: normalizeJudgementForm(pin1.judgements),
        pin2Judgements: normalizeJudgementForm(pin2.judgements),
        pin1SourcePassId: parsePassId(pin1.sourcePassId),
        pin2SourcePassId: parsePassId(pin2.sourcePassId),
    }
}

/**
 * @typedef {Object} XaccCurveEditorState
 * @property {'accuracy' | 'judgements'} pinInputMode
 * @property {boolean} disablePP
 * @property {number | null} accXDisplay
 * @property {number | null} scoreXDisplay
 * @property {number | null} accYDisplay
 * @property {number | null} scoreYDisplay
 * @property {typeof EMPTY_JUDGEMENT_FORM} pin1Judgements
 * @property {typeof EMPTY_JUDGEMENT_FORM} pin2Judgements
 * @property {number | null} pin1SourcePassId
 * @property {number | null} pin2SourcePassId
 */

/**
 * @param {XaccCurveEditorState} state
 */
export function serializeXaccCurveEditorState(state) {
    const mode =
        state.pinInputMode === 'judgements' ? 'judgements' : 'accuracy'

    const out = {
        pinInputMode: mode,
        disablePP: Boolean(state.disablePP),
        pin1: {
            sourcePassId: state.pin1SourcePassId ?? null,
            judgements: normalizeJudgementForm(state.pin1Judgements),
        },
        pin2: {
            sourcePassId: state.pin2SourcePassId ?? null,
            judgements: normalizeJudgementForm(state.pin2Judgements),
        },
    }

    if (mode === 'accuracy') {
        const ax = parseSliderDisplay(state.accXDisplay)
        const sx = parseSliderDisplay(state.scoreXDisplay)
        const ay = parseSliderDisplay(state.accYDisplay)
        const sy = parseSliderDisplay(state.scoreYDisplay)
        if (ax != null) out.accXDisplay = ax
        if (sx != null) out.scoreXDisplay = sx
        if (ay != null) out.accYDisplay = ay
        if (sy != null) out.scoreYDisplay = sy
    }

    return out
}

/**
 * Merge stored editor UI state onto pin slider seed values.
 * @param {ReturnType<import('./scoreV2XaccCurvePins.js').pinSliderValuesFromPins>} sliderSeed
 * @param {XaccCurveEditorState | null | undefined} editor
 */
export function judgementFormsEqual(a, b) {
    const left = normalizeJudgementForm(a)
    const right = normalizeJudgementForm(b)
    return JUDGEMENT_KEYS.every((key) => left[key] === right[key])
}

function numNear(a, b, eps) {
    const x = Number(a)
    const y = Number(b)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return x === y
    }
    return Math.abs(x - y) <= eps
}

/**
 * Snapshot for unsaved-change detection (post-hydration, incl. judgement-derived acc).
 * @param {{ accX: number, accY: number, scoreX: number, scoreY: number }} seed
 * @param {XaccCurveEditorState | null | undefined} editor
 */
export function buildXaccEditorBaseline(seed, editor) {
    const mode = editor?.pinInputMode === 'judgements' ? 'judgements' : 'accuracy'
    let accX = Number(seed.accX)
    let accY = Number(seed.accY)
    if (mode === 'judgements' && editor) {
        const a1 = accuracyFromJudgementForm(editor.pin1Judgements)
        const a2 = accuracyFromJudgementForm(editor.pin2Judgements)
        if (a1 != null && Number.isFinite(a1)) {
            accX = a1
        }
        if (a2 != null && Number.isFinite(a2)) {
            accY = a2
        }
    }
    return {
        accX,
        accY,
        scoreX: Number(seed.scoreX),
        scoreY: Number(seed.scoreY),
        pinInputMode: mode,
        disablePP: Boolean(editor?.disablePP),
        pin1Judgements: normalizeJudgementForm(editor?.pin1Judgements),
        pin2Judgements: normalizeJudgementForm(editor?.pin2Judgements),
        pin1SourcePassId: editor?.pin1SourcePassId ?? null,
        pin2SourcePassId: editor?.pin2SourcePassId ?? null,
    }
}

/**
 * @param {ReturnType<typeof buildXaccEditorBaseline>} current
 * @param {ReturnType<typeof buildXaccEditorBaseline>} baseline
 */
export function xaccPinValuesMatch(current, baseline) {
    if (!baseline || !current) {
        return false
    }
    return (
        numNear(current.accX, baseline.accX, ACC_EPS) &&
        numNear(current.accY, baseline.accY, ACC_EPS) &&
        numNear(current.scoreX, baseline.scoreX, SCORE_EPS) &&
        numNear(current.scoreY, baseline.scoreY, SCORE_EPS)
    )
}

export function xaccEditorBaselineMatches(current, baseline) {
    if (!baseline || !current) {
        return false
    }
    return (
        numNear(current.accX, baseline.accX, ACC_EPS) &&
        numNear(current.accY, baseline.accY, ACC_EPS) &&
        numNear(current.scoreX, baseline.scoreX, SCORE_EPS) &&
        numNear(current.scoreY, baseline.scoreY, SCORE_EPS) &&
        current.pinInputMode === baseline.pinInputMode &&
        current.disablePP === baseline.disablePP &&
        current.pin1SourcePassId === baseline.pin1SourcePassId &&
        current.pin2SourcePassId === baseline.pin2SourcePassId &&
        judgementFormsEqual(current.pin1Judgements, baseline.pin1Judgements) &&
        judgementFormsEqual(current.pin2Judgements, baseline.pin2Judgements)
    )
}

export function applyEditorStateToPinSliders(sliderSeed, editor) {
    if (!editor) {
        return sliderSeed
    }

    const next = { ...sliderSeed, editor }

    if (editor.pinInputMode === 'accuracy') {
        if (editor.accXDisplay != null) next.accXDisplay = editor.accXDisplay
        if (editor.scoreXDisplay != null) next.scoreXDisplay = editor.scoreXDisplay
        if (editor.accYDisplay != null) next.accYDisplay = editor.accYDisplay
        if (editor.scoreYDisplay != null) next.scoreYDisplay = editor.scoreYDisplay
    }

    return next
}

// tuf-search: #xaccPinJudgements #judgements #xaccCurve
import calcAcc from './CalcAcc.js'
import { getScoreV2, scoreV2MtpFromMisses } from './CalcScore.js'

/** Pass / submission judgement fields (string counts for inputs). */
export const EMPTY_JUDGEMENT_FORM = {
    earlyDouble: '0',
    earlySingle: '0',
    ePerfect: '0',
    perfect: '0',
    lPerfect: '0',
    lateSingle: '0',
    lateDouble: '0',
}

export const JUDGEMENT_INPUT_FIELDS = [
    { key: 'earlyDouble', variant: 'miss', color: '#ff0000' },
    { key: 'earlySingle', variant: 'early', color: '#ff6f4d' },
    { key: 'ePerfect', variant: 'e-perfect', color: '#fcff4d' },
    { key: 'perfect', variant: 'perfect', color: '#5fff4e' },
    { key: 'lPerfect', variant: 'l-perfect', color: '#fcff4d' },
    { key: 'lateSingle', variant: 'late', color: '#ff6f4d' },
]

function parseCount(value) {
    const n = parseInt(String(value), 10)
    return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Client calcAcc / getScoreV2 6-element judgement array. */
export function missCountFromJudgementForm(form) {
    return judgementFormToCalcArray(form)[0]
}

export function hitTilesFromJudgementForm(form) {
    const arr = judgementFormToCalcArray(form)
    return arr.slice(1).reduce((a, b) => a + b, 0)
}

export function scoreV2MtpFromJudgementForm(form, fallbackHitTiles = 0) {
    const misses = missCountFromJudgementForm(form)
    const hits = hitTilesFromJudgementForm(form)
    const hitTiles = hits > 0 ? hits : Math.max(0, Math.floor(Number(fallbackHitTiles)) || 0)
    return scoreV2MtpFromMisses(misses, hitTiles)
}

export function judgementFormToCalcArray(form) {
    if (!form) {
        return [0, 0, 0, 0, 0, 0]
    }
    return [
        parseCount(form.earlyDouble) + parseCount(form.lateDouble),
        parseCount(form.earlySingle),
        parseCount(form.ePerfect),
        parseCount(form.perfect),
        parseCount(form.lPerfect),
        parseCount(form.lateSingle),
    ]
}

export function accuracyFromJudgementForm(form) {
    const arr = judgementFormToCalcArray(form)
    const sum = arr.reduce((a, b) => a + b, 0)
    if (sum <= 0) return null
    const acc = calcAcc(arr)
    return Number.isFinite(acc) ? acc : null
}

export function judgementFormFromPass(pass) {
    const j = pass?.judgements ?? {}
    return {
        earlyDouble: String(j.earlyDouble ?? 0),
        earlySingle: String(j.earlySingle ?? 0),
        ePerfect: String(j.ePerfect ?? 0),
        perfect: String(j.perfect ?? 0),
        lPerfect: String(j.lPerfect ?? 0),
        lateSingle: String(j.lateSingle ?? 0),
        lateDouble: String(j.lateDouble ?? 0),
    }
}

export function resolvePassDisplayScore(pass) {
    const score = Number(pass?.scoreV2 ?? pass?.score)
    return Number.isFinite(score) && score >= 0 ? score : 0
}

/** Highest score first (scoreV2, then legacy score). */
export function sortPassesByScoreDesc(passes) {
    if (!Array.isArray(passes) || passes.length === 0) {
        return []
    }
    return [...passes].sort(
        (a, b) => resolvePassDisplayScore(b) - resolvePassDisplayScore(a),
    )
}

export function resolvePassDisplayAccuracy(pass) {
    const j = pass?.judgements
    if (j?.accuracy != null && Number.isFinite(Number(j.accuracy))) {
        return Number(j.accuracy)
    }
    return accuracyFromJudgementForm(judgementFormFromPass(pass))
}

/**
 * ScoreV2 for a judgement set (preview; pin score may still be edited manually).
 */
export function scoreV2FromJudgementForm(
    form,
    levelData,
    difficultyDict,
    speed = 1,
    isNoHoldTap = false,
) {
    const judgements = judgementFormToCalcArray(form)
    const score = getScoreV2(
        { speed, judgements, isNoHoldTap },
        levelData ?? {},
        difficultyDict ?? {},
    )
    return Number.isFinite(score) && score > 0 ? score : 0
}

/** Player / user object for {@link userAvatarUrls} on a pass row. */
export function resolvePassPlayerSubject(pass) {
    if (!pass) return null
    return pass.player ?? pass.user ?? null
}

export function resolvePassPickerName(pass) {
    if (!pass) return ''
    const subject = resolvePassPlayerSubject(pass)
    return (
        subject?.name ||
        subject?.username ||
        `Pass #${pass.id ?? '?'}`
    )
}

export function formatPassPickerStats(pass) {
    if (!pass) return ''
    const acc = resolvePassDisplayAccuracy(pass)
    const accStr = Number.isFinite(acc) ? `${(acc * 100).toFixed(2)}%` : '—'
    const score = resolvePassDisplayScore(pass)
    return `${accStr} · ${Math.round(score)}`
}

/** Full label for aria / tooltips. */
export function formatPassPickerLabel(pass) {
    const name = resolvePassPickerName(pass)
    const stats = formatPassPickerStats(pass)
    if (!name && !stats) return ''
    if (!stats) return name
    if (!name) return stats
    return `${name} · ${stats}`
}

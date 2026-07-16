/**
 * Client preview scoring facade — keep API in sync with
 * server/src/misc/utils/pass/scoreService.ts
 */
import calcAcc from './CalcAcc.js'
import { getScoreV2 } from './CalcScore.js'

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function finiteBaseScoreOrNull(value) {
    return value != null && Number.isFinite(value) ? value : null
}

/**
 * @param {object | null | undefined} level
 * @param {object} [overrides]
 * @param {object} [difficultyDict]
 * @returns {object}
 */
export function buildLevelScoreContext(
    level = {},
    overrides = {},
    difficultyDict = {},
) {
    const xaccCurveMeta = Object.prototype.hasOwnProperty.call(
        overrides,
        'xaccCurveMeta',
    )
        ? overrides.xaccCurveMeta
        : (level?.xaccCurveMeta ?? null)

    const diffId = level?.diffId ?? overrides.diffId
    const difficulty = overrides.difficulty ?? level?.difficulty ?? null
    const fromDict = difficultyDict?.[diffId] ?? null
    const difficultyBaseScore =
        finiteBaseScoreOrNull(difficulty?.baseScore) ??
        finiteBaseScoreOrNull(fromDict?.baseScore)

    return {
        ...level,
        ...overrides,
        baseScore:
            overrides.baseScore !== undefined
                ? overrides.baseScore
                : (level?.baseScore ?? null),
        ppBaseScore:
            overrides.ppBaseScore !== undefined
                ? overrides.ppBaseScore
                : (level?.ppBaseScore ?? null),
        difficulty: {
            name: difficulty?.name ?? fromDict?.name,
            // null when missing/non-numeric — last-resort source; 0 is allowed
            baseScore: difficultyBaseScore,
        },
        xaccCurveMeta,
        diffId,
    }
}

/**
 * Best-effort normalize of pass fields; missing values get safe defaults.
 * @param {{ speed?: number|null, judgements?: unknown, isNoHoldTap?: boolean|null }} pass
 * @returns {{ speed: number, judgements: unknown, isNoHoldTap: boolean, warnings: string[] }}
 */
export function normalizePassScoreInput(pass = {}) {
    const warnings = []

    let speed = 1
    if (pass.speed == null || !Number.isFinite(Number(pass.speed))) {
        warnings.push('speed missing/invalid; defaulting to 1')
    } else {
        speed = Number(pass.speed)
    }

    const judgements = Array.isArray(pass.judgements)
        ? pass.judgements
        : null
    if (judgements == null) {
        warnings.push('judgements missing; defaulting to zeros')
    }

    return {
        speed,
        judgements: judgements ?? [0, 0, 0, 0, 0, 0],
        isNoHoldTap: pass.isNoHoldTap === true,
        warnings,
    }
}

/**
 * @param {{ speed?: number|null, judgements?: unknown, isNoHoldTap?: boolean|null }} pass
 * @param {object | null | undefined} level
 * @param {object} [overrides]
 * @param {object} [difficultyDict]
 * @returns {{ scoreV2: number, accuracy: number }}
 */
export function computePassScoreV2(
    pass,
    level,
    overrides = {},
    difficultyDict = {},
) {
    const lvl = buildLevelScoreContext(level, overrides, difficultyDict)
    const normalized = normalizePassScoreInput(pass)
    const accuracy = calcAcc(normalized.judgements)
    // Difficulty is the last baseScore source; 0 is valid — only warn on non-numbers.
    if (!Number.isFinite(lvl.difficulty?.baseScore)) {
        normalized.warnings.push(
            'difficulty.baseScore missing/invalid (last baseScore source)',
        )
    }
    if (normalized.warnings.length) {
        console.warn('[computePassScoreV2] best-effort scoring with gaps', {
            warnings: normalized.warnings,
            speed: normalized.speed,
            levelBaseScore: lvl.baseScore,
            ppBaseScore: lvl.ppBaseScore,
            difficultyBaseScore: lvl.difficulty?.baseScore,
        })
    }

    const scoreV2 = getScoreV2(
        {
            speed: normalized.speed,
            judgements: normalized.judgements,
            isNoHoldTap: normalized.isNoHoldTap,
        },
        lvl,
        difficultyDict,
    )
    return { scoreV2, accuracy }
}
